#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${CRYOMAP_BACKUP_DIR:-$PROJECT_DIR/backups/postgres}"
RETENTION_DAYS="${CRYOMAP_BACKUP_RETENTION_DAYS:-14}"

if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$PROJECT_DIR/.env"
  set +a
fi

: "${POSTGRES_DB:?POSTGRES_DB não definido no .env da raiz do projeto}"
: "${POSTGRES_USER:?POSTGRES_USER não definido no .env da raiz do projeto}"

mkdir -p "$BACKUP_DIR"

cd "$PROJECT_DIR"

echo "Verificando PostgreSQL..."
docker compose exec -T postgres pg_isready \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" >/dev/null

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/cryomap_${POSTGRES_DB}_${TIMESTAMP}.sql.gz"
TMP_FILE="${BACKUP_FILE}.tmp"

cleanup() {
  rm -f "$TMP_FILE"
}

trap cleanup EXIT

echo "Criando backup em: $BACKUP_FILE"

docker compose exec -T postgres pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  | gzip -9 > "$TMP_FILE"

mv "$TMP_FILE" "$BACKUP_FILE"

find "$BACKUP_DIR" \
  -type f \
  -name "cryomap_${POSTGRES_DB}_*.sql.gz" \
  -mtime +"$RETENTION_DAYS" \
  -delete

echo "Backup criado com sucesso:"
echo "$BACKUP_FILE"

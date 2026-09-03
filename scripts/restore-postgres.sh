#!/usr/bin/env bash

set -Eeuo pipefail

if [ "$#" -ne 1 ]; then
  echo "Uso:"
  echo "  ./scripts/restore-postgres.sh /caminho/do/backup.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Arquivo de backup não encontrado:"
  echo "$BACKUP_FILE"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$PROJECT_DIR/.env"
  set +a
fi

: "${POSTGRES_DB:?POSTGRES_DB não definido no .env da raiz do projeto}"
: "${POSTGRES_USER:?POSTGRES_USER não definido no .env da raiz do projeto}"

cd "$PROJECT_DIR"

echo "ATENÇÃO: esta operação irá restaurar o banco '$POSTGRES_DB'."
echo "Isso pode sobrescrever dados atuais."
echo
read -r -p "Digite RESTAURAR para continuar: " CONFIRMATION

if [ "$CONFIRMATION" != "RESTAURAR" ]; then
  echo "Restore cancelado."
  exit 0
fi

echo "Verificando PostgreSQL..."
docker compose exec -T postgres pg_isready \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" >/dev/null

echo "Restaurando backup:"
echo "$BACKUP_FILE"

gunzip -c "$BACKUP_FILE" | docker compose exec -T postgres psql \
  -v ON_ERROR_STOP=1 \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB"

echo "Restore concluído com sucesso."

# Decisões Técnicas

## 1. Arquitetura inicial

O projeto será criado como um monorepo simples.

Estrutura:

```text
frontend/
backend/
database/
docs/
docker/
uploads/

## 2. Frontend

Será desenvolvido com:

React
TypeScript
Vite

O Vite possui templates oficiais para React e TypeScript, e será usado para criar o frontend quando chegarmos nessa etapa.

3. Backend

Será desenvolvido com:

NestJS
TypeScript
Node.js

O backend será modular.

Módulos previstos:

auth
users
companies
rooms
equipments
sensors
temperature-readings
equipment-temperature-readings
tasks
service-records
uploads
dashboard
reports
4. Banco de dados

Será usado:

PostgreSQL
Prisma ORM

O Prisma será usado para modelar o banco, criar migrations e facilitar consultas.

5. Sensores

Sensores serão vinculados somente às salas.

Equipamentos não terão sensores.

6. Temperatura de salas

A temperatura das salas virá de sensores.

Na primeira versão, poderá ser registrada manualmente ou por API simples.

No futuro, poderá vir de MQTT ou integração externa.

7. Temperatura de equipamentos

A temperatura dos equipamentos será informada manualmente.

Será criada uma tabela própria para histórico de temperatura manual dos equipamentos.

8. Uploads

Na primeira versão, uploads serão salvos localmente na pasta uploads.

Tipos previstos:

fotos de atendimento
relatório Auvo 2
logo da empresa
planta da empresa

## 9. Banco local com Docker

O PostgreSQL será executado localmente via Docker Compose.

Serviço inicial:

- postgres

Banco local:

- cryomap

Usuário local:

- cryomap_user

Porta local:

- 5432

O arquivo `.env` guarda os valores reais de ambiente local.

O arquivo `.env.example` serve como modelo seguro para versionamento.

O volume `postgres_data` será usado para manter os dados do banco mesmo que o container seja removido.

## 11. Schema inicial do banco

O schema inicial real do CryoMap foi criado com Prisma e PostgreSQL.

Tabelas principais da Beta 1:

- companies
- users
- rooms
- equipments
- sensors
- room_temperature_readings
- equipment_temperature_readings
- tasks
- service_records
- attachments
- app_settings

Decisões importantes:

- Sensores pertencem somente às salas.
- Equipamentos não possuem sensores.
- Temperatura de sala será registrada em `room_temperature_readings`.
- Temperatura de equipamento será registrada manualmente em `equipment_temperature_readings`.
- Empresas, usuários, salas, equipamentos, sensores, tarefas e atendimentos terão exclusão lógica usando `deleted_at`.
- O sistema já fica preparado para MQTT no futuro através do enum `ReadingSource`, que inclui `MQTT`.

## 12. Seed inicial

Foi criado um seed inicial para gerar o primeiro usuário Master Admin do CryoMap.

O seed fica em:

- `backend/prisma/seed.ts`

O seed cria ou atualiza um usuário com:

- `role`: `MASTER_ADMIN`
- `status`: `ACTIVE`

Os dados do usuário inicial são lidos do arquivo `backend/.env`:

- `SEED_MASTER_ADMIN_NAME`
- `SEED_MASTER_ADMIN_EMAIL`
- `SEED_MASTER_ADMIN_PASSWORD`

A senha é salva no banco como hash usando bcrypt, nunca como texto puro.

No Prisma 7, o comando de seed foi configurado em:

- `backend/prisma.config.ts`

A configuração usada foi:

- `migrations.seed = "tsx prisma/seed.ts"`

## 13. Autenticação inicial

Foi criado o módulo inicial de autenticação do CryoMap.

Arquivos principais:

- `backend/src/auth/auth.module.ts`
- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/dto/login.dto.ts`
- `backend/src/auth/guards/jwt-auth.guard.ts`
- `backend/src/auth/types/auth-user.type.ts`
- `backend/src/auth/types/jwt-payload.type.ts`
- `backend/src/auth/types/authenticated-request.type.ts`

Rotas criadas:

- `POST /auth/login`
- `GET /auth/me`

A rota `POST /auth/login` recebe e-mail e senha, valida a senha com bcrypt e retorna um JWT.

A rota `GET /auth/me` é protegida pelo `JwtAuthGuard` e exige o header:

`Authorization: Bearer TOKEN`

Variáveis adicionadas ao ambiente:

- `JWT_SECRET`
- `JWT_EXPIRES_IN_SECONDS`

A expiração do token foi configurada em segundos para evitar conflito de tipagem com o `@nestjs/jwt`.

Também foi ativado o `ValidationPipe` global no `main.ts` para validar DTOs.


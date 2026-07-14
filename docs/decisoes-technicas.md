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
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

## 14. CRUD de empresas clientes

Foi criado o primeiro CRUD real do CryoMap: empresas clientes.

Arquivos principais:

- `backend/src/companies/companies.module.ts`
- `backend/src/companies/companies.controller.ts`
- `backend/src/companies/companies.service.ts`
- `backend/src/companies/dto/create-company.dto.ts`
- `backend/src/companies/dto/update-company.dto.ts`

Rotas criadas:

- `POST /companies`
- `GET /companies`
- `GET /companies/:id`
- `PATCH /companies/:id`
- `DELETE /companies/:id`

Todas as rotas de empresas são protegidas com JWT usando `JwtAuthGuard`.

Regras implementadas:

- Criar empresa.
- Listar empresas ativas/não excluídas.
- Buscar empresa por ID.
- Editar empresa.
- Inativar empresa com exclusão lógica usando `deleted_at`.
- Impedir CNPJ duplicado.
- Normalizar CNPJ salvando apenas números.
- Converter e-mail para minúsculas.
- Converter UF para maiúsculas.

Foi necessário ajustar o `AuthModule` para ser global e exportar `JwtModule`, pois o `JwtAuthGuard` é usado em outros módulos, como `CompaniesModule`.

## 15. CRUD de usuários

Foi criado o CRUD inicial de usuários do CryoMap.

Arquivos principais:

- `backend/src/users/users.module.ts`
- `backend/src/users/users.controller.ts`
- `backend/src/users/users.service.ts`
- `backend/src/users/dto/create-user.dto.ts`
- `backend/src/users/dto/update-user.dto.ts`

Rotas criadas:

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`

Todas as rotas de usuários são protegidas com JWT usando `JwtAuthGuard`.

Regras implementadas:

- Criar usuário.
- Listar usuários não excluídos.
- Buscar usuário por ID.
- Editar usuário.
- Inativar usuário com exclusão lógica usando `deleted_at`.
- Impedir e-mail duplicado.
- Normalizar e-mail para minúsculas.
- Criptografar senha com bcrypt.
- Nunca retornar `password_hash` nas respostas da API.
- Vincular usuário a uma empresa, quando necessário.
- Permitir usuário sem empresa, como Master Admin.
- Controlar hierarquia inicial com `role`.
- Controlar acesso com `status`.
- Impedir login de usuário inativo ou bloqueado.

Foi criado um usuário técnico operacional ativo para uso nas próximas etapas do projeto.

## 16. CRUD de salas/ambientes

Foi criado o CRUD inicial de salas/ambientes do CryoMap.

Arquivos principais:

- `backend/src/rooms/rooms.module.ts`
- `backend/src/rooms/rooms.controller.ts`
- `backend/src/rooms/rooms.service.ts`
- `backend/src/rooms/dto/create-room.dto.ts`
- `backend/src/rooms/dto/update-room.dto.ts`

Rotas criadas:

- `POST /rooms`
- `GET /rooms`
- `GET /rooms?companyId=...`
- `GET /rooms/:id`
- `PATCH /rooms/:id`
- `DELETE /rooms/:id`

Todas as rotas de salas são protegidas com JWT usando `JwtAuthGuard`.

Regras implementadas:

- Criar sala vinculada a uma empresa.
- Listar todas as salas não excluídas.
- Listar salas por empresa.
- Buscar sala por ID.
- Editar sala.
- Excluir/inativar sala com exclusão lógica usando `deleted_at`.
- Definir temperatura mínima.
- Definir temperatura máxima.
- Definir temperatura atual.
- Calcular `thermalStatus` automaticamente.
- Retornar `NORMAL` quando a temperatura estiver dentro da faixa.
- Retornar `CRITICAL` quando a temperatura estiver fora da faixa.
- Retornar `OFFLINE` quando não houver temperatura atual.
- Preparar campos `map_x` e `map_y` para futuro heatmap/planta da empresa.

## 17. CRUD de equipamentos

Foi criado o CRUD inicial de equipamentos do CryoMap.

Arquivos principais:

- `backend/src/equipments/equipments.module.ts`
- `backend/src/equipments/equipments.controller.ts`
- `backend/src/equipments/equipments.service.ts`
- `backend/src/equipments/dto/create-equipment.dto.ts`
- `backend/src/equipments/dto/update-equipment.dto.ts`

Rotas criadas:

- `POST /equipments`
- `GET /equipments`
- `GET /equipments?companyId=...`
- `GET /equipments?roomId=...`
- `GET /equipments/:id`
- `PATCH /equipments/:id`
- `DELETE /equipments/:id`

Todas as rotas de equipamentos são protegidas com JWT usando `JwtAuthGuard`.

Regras implementadas:

- Criar equipamento vinculado a uma empresa.
- Permitir equipamento vinculado a uma sala.
- Permitir equipamento sem sala.
- Listar todos os equipamentos não excluídos.
- Listar equipamentos por empresa.
- Listar equipamentos por sala.
- Buscar equipamento por ID.
- Editar equipamento.
- Inativar equipamento com exclusão lógica usando `deleted_at`.
- Impedir código duplicado dentro da mesma empresa.
- Normalizar código do equipamento para maiúsculas.
- Validar se a empresa existe antes de criar ou alterar equipamento.
- Validar se a sala existe e pertence à empresa correta antes de vincular equipamento.

Decisão importante mantida:

- Equipamentos não possuem sensores.
- Sensores pertencem somente às salas.
- Temperatura de equipamento será registrada manualmente em uma etapa futura.

## 18. CRUD de sensores

Foi criado o CRUD inicial de sensores do CryoMap.

Arquivos principais:

- `backend/src/sensors/sensors.module.ts`
- `backend/src/sensors/sensors.controller.ts`
- `backend/src/sensors/sensors.service.ts`
- `backend/src/sensors/dto/create-sensor.dto.ts`
- `backend/src/sensors/dto/update-sensor.dto.ts`

Rotas criadas:

- `POST /sensors`
- `GET /sensors`
- `GET /sensors?companyId=...`
- `GET /sensors?roomId=...`
- `GET /sensors/:id`
- `PATCH /sensors/:id`
- `DELETE /sensors/:id`

Todas as rotas de sensores são protegidas com JWT usando `JwtAuthGuard`.

Regras implementadas:

- Criar sensor vinculado a uma empresa.
- Criar sensor vinculado obrigatoriamente a uma sala.
- Listar todos os sensores não excluídos.
- Listar sensores por empresa.
- Listar sensores por sala.
- Buscar sensor por ID.
- Editar sensor.
- Atualizar últimas leituras conhecidas de temperatura e umidade.
- Atualizar `last_seen_at` quando temperatura ou umidade forem informadas.
- Alterar status do sensor.
- Inativar sensor com exclusão lógica usando `deleted_at`.
- Impedir código duplicado de sensor.
- Normalizar código do sensor para maiúsculas.
- Validar se a empresa existe antes de criar ou alterar sensor.
- Validar se a sala existe e pertence à empresa correta antes de vincular sensor.

Decisão importante mantida:

- Sensores pertencem somente às salas.
- Sensores não pertencem a equipamentos.
- Equipamentos não possuem sensores.

## 19. Leituras de temperatura das salas

Foi criado o módulo inicial de leituras de temperatura das salas do CryoMap.

Arquivos principais:

- `backend/src/temperature-readings/temperature-readings.module.ts`
- `backend/src/temperature-readings/temperature-readings.controller.ts`
- `backend/src/temperature-readings/temperature-readings.service.ts`
- `backend/src/temperature-readings/dto/create-room-temperature-reading.dto.ts`
- `backend/src/temperature-readings/dto/find-room-temperature-readings.dto.ts`

Rotas criadas:

- `POST /temperature-readings`
- `GET /temperature-readings`
- `GET /temperature-readings?companyId=...`
- `GET /temperature-readings?roomId=...`
- `GET /temperature-readings?sensorId=...`
- `GET /temperature-readings?startDate=...&endDate=...`
- `GET /temperature-readings/:id`

Todas as rotas de leituras são protegidas com JWT usando `JwtAuthGuard`.

Regras implementadas:

- Registrar leitura de temperatura da sala.
- Registrar umidade opcional.
- Permitir leitura vinculada a sensor.
- Permitir leitura manual sem sensor.
- Validar se a sala existe e pertence à empresa informada.
- Validar se o sensor existe, pertence à empresa e está vinculado à sala informada.
- Criar histórico em `room_temperature_readings`.
- Atualizar `rooms.current_temperature` após nova leitura.
- Atualizar `rooms.thermal_status` automaticamente após nova leitura.
- Atualizar `sensors.last_temperature` quando a leitura tiver sensor.
- Atualizar `sensors.last_humidity` quando a leitura tiver sensor.
- Atualizar `sensors.last_seen_at` quando a leitura tiver sensor.
- Listar leituras com filtros por empresa, sala, sensor e período.
- Limitar listagem a 200 leituras mais recentes.
- Impedir leitura com sensor que não pertence à sala informada.

Status térmico atual:

- `NORMAL`: temperatura dentro dos limites da sala.
- `CRITICAL`: temperatura abaixo do mínimo ou acima do máximo.

## 20. Temperaturas manuais de equipamentos

Foi criado o módulo inicial de temperaturas manuais de equipamentos do CryoMap.

Arquivos principais:

- `backend/src/equipment-temperature-readings/equipment-temperature-readings.module.ts`
- `backend/src/equipment-temperature-readings/equipment-temperature-readings.controller.ts`
- `backend/src/equipment-temperature-readings/equipment-temperature-readings.service.ts`
- `backend/src/equipment-temperature-readings/dto/create-equipment-temperature-reading.dto.ts`
- `backend/src/equipment-temperature-readings/dto/find-equipment-temperature-readings.dto.ts`

Rotas criadas:

- `POST /equipment-temperature-readings`
- `GET /equipment-temperature-readings`
- `GET /equipment-temperature-readings?companyId=...`
- `GET /equipment-temperature-readings?roomId=...`
- `GET /equipment-temperature-readings?equipmentId=...`
- `GET /equipment-temperature-readings?createdByUserId=...`
- `GET /equipment-temperature-readings?startDate=...&endDate=...`
- `GET /equipment-temperature-readings/:id`

Todas as rotas de temperaturas manuais de equipamentos são protegidas com JWT usando `JwtAuthGuard`.

Regras implementadas:

- Registrar temperatura manual de equipamento.
- Validar se o equipamento existe.
- Validar se o equipamento pertence à empresa informada.
- Criar histórico em `equipment_temperature_readings`.
- Atualizar `equipments.current_temperature` após nova medição.
- Registrar o usuário autenticado que lançou a medição em `created_by_user_id`.
- Pegar automaticamente a sala atual do equipamento, quando existir.
- Listar medições com filtros por empresa, sala, equipamento, usuário e período.
- Limitar listagem a 200 medições mais recentes.
- Bloquear criação de medição sem autenticação.
- Bloquear medição para equipamento inexistente.

Decisão importante mantida:

- Equipamentos não possuem sensores.
- Sensores pertencem somente às salas.
- Temperatura de equipamento é lançada manualmente.

## 21. CRUD de tarefas técnicas

Foi criado o CRUD inicial de tarefas técnicas do CryoMap.

Arquivos principais:

- `backend/src/tasks/tasks.module.ts`
- `backend/src/tasks/tasks.controller.ts`
- `backend/src/tasks/tasks.service.ts`
- `backend/src/tasks/dto/create-task.dto.ts`
- `backend/src/tasks/dto/update-task.dto.ts`
- `backend/src/tasks/dto/find-tasks.dto.ts`

Rotas criadas:

- `POST /tasks`
- `GET /tasks`
- `GET /tasks?companyId=...`
- `GET /tasks?roomId=...`
- `GET /tasks?equipmentId=...`
- `GET /tasks?assignedToUserId=...`
- `GET /tasks?status=...`
- `GET /tasks?priority=...`
- `GET /tasks/:id`
- `PATCH /tasks/:id`
- `DELETE /tasks/:id`

Todas as rotas de tarefas são protegidas com JWT usando `JwtAuthGuard`.

Regras implementadas:

- Criar tarefa vinculada a uma empresa.
- Permitir vínculo opcional com sala.
- Permitir vínculo opcional com equipamento.
- Permitir vínculo opcional com usuário responsável.
- Validar se a sala pertence à empresa informada.
- Validar se o equipamento pertence à empresa e ao local informado.
- Validar se o usuário responsável está ativo e pertence à empresa.
- Listar tarefas com filtros por empresa, sala, equipamento, responsável, status e prioridade.
- Buscar tarefa por ID.
- Editar título, descrição, prioridade, status e prazo.
- Registrar `completed_at` automaticamente quando a tarefa muda para `DONE`.
- Limpar `completed_at` quando uma tarefa concluída é reaberta.
- Excluir tarefa logicamente usando `deleted_at`.
- Limitar a listagem a 200 tarefas.
- Bloquear acesso sem autenticação.

Status utilizados:

- `OPEN`
- `IN_PROGRESS`
- `DONE`
- `CANCELED`
- `OVERDUE`

Campos de prazo adicionados ao model `Task`:

- `due_date`
- `completed_at`

## 22. Registros de atendimento técnico

Foi criado o módulo inicial de registros de atendimento técnico do CryoMap.

Arquivos principais:

- `backend/src/service-records/service-records.module.ts`
- `backend/src/service-records/service-records.controller.ts`
- `backend/src/service-records/service-records.service.ts`
- `backend/src/service-records/dto/create-service-record.dto.ts`
- `backend/src/service-records/dto/update-service-record.dto.ts`
- `backend/src/service-records/dto/find-service-records.dto.ts`

Rotas criadas:

- `POST /service-records`
- `GET /service-records`
- `GET /service-records?taskId=...`
- `GET /service-records?companyId=...`
- `GET /service-records?roomId=...`
- `GET /service-records?equipmentId=...`
- `GET /service-records?technicianId=...`
- `GET /service-records?startDate=...&endDate=...`
- `GET /service-records/:id`
- `PATCH /service-records/:id`
- `DELETE /service-records/:id`

Todas as rotas de registros de atendimento são protegidas com JWT usando `JwtAuthGuard`.

Regras implementadas:

- Criar registro de atendimento vinculado a uma tarefa.
- Impedir atendimento em tarefa cancelada.
- Impedir mais de um registro de atendimento para a mesma tarefa.
- Buscar automaticamente empresa, sala e equipamento a partir da tarefa.
- Definir técnico responsável pelo atendimento.
- Usar técnico informado, responsável da tarefa ou usuário autenticado.
- Validar se o técnico está ativo e pertence à empresa.
- Registrar início do atendimento.
- Registrar fim do atendimento.
- Calcular automaticamente `downtime_minutes`.
- Registrar problema encontrado.
- Registrar serviço realizado.
- Registrar observações.
- Listar atendimentos com filtros por tarefa, empresa, sala, equipamento, técnico e período.
- Buscar atendimento por ID.
- Reabrir atendimento removendo `finished_at`.
- Excluir atendimento logicamente usando `deleted_at`.

Integração com tarefas:

- Ao iniciar atendimento, a tarefa muda para `IN_PROGRESS`.
- Ao finalizar atendimento, a tarefa muda para `DONE`.
- Ao finalizar atendimento, a tarefa recebe `finished_at` e `completed_at`.
- Ao reabrir atendimento, a tarefa volta para `IN_PROGRESS`.
- Ao excluir atendimento, a tarefa volta para `OPEN`.
- Ao excluir atendimento, os campos `started_at`, `finished_at` e `completed_at` da tarefa são limpos.

Essa etapa prepara o CryoMap para relatórios técnicos, cálculo de tempo parado e histórico operacional por cliente, sala, equipamento e técnico.


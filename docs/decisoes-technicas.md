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

## 23. Uploads e anexos

Foi criado o módulo inicial de uploads e anexos do CryoMap.

Arquivos principais:

- `backend/src/attachments/attachments.module.ts`
- `backend/src/attachments/attachments.controller.ts`
- `backend/src/attachments/attachments.service.ts`
- `backend/src/attachments/dto/create-attachment.dto.ts`
- `backend/src/attachments/dto/find-attachments.dto.ts`

Rotas criadas:

- `POST /attachments`
- `GET /attachments`
- `GET /attachments?companyId=...`
- `GET /attachments?taskId=...`
- `GET /attachments?serviceRecordId=...`
- `GET /attachments?type=...`
- `GET /attachments/:id`
- `GET /attachments/:id/download`
- `DELETE /attachments/:id`

Todas as rotas de anexos são protegidas com JWT usando `JwtAuthGuard`.

Regras implementadas:

- Enviar arquivo usando `multipart/form-data`.
- Salvar arquivo fisicamente em `uploads/attachments`.
- Registrar metadados do arquivo no model `Attachment`.
- Vincular anexo diretamente a uma empresa.
- Vincular anexo a uma tarefa.
- Vincular anexo a um registro de atendimento.
- Descobrir automaticamente a empresa quando o anexo for vinculado a uma tarefa.
- Descobrir automaticamente empresa e tarefa quando o anexo for vinculado a um atendimento.
- Validar se a empresa existe antes de criar o anexo.
- Validar se a tarefa existe antes de vincular o anexo.
- Validar se o registro de atendimento existe antes de vincular o anexo.
- Impedir upload sem vínculo com empresa, tarefa ou atendimento.
- Registrar usuário autenticado que enviou o arquivo em `uploaded_by_user_id`.
- Listar anexos com filtros por empresa, tarefa, atendimento, usuário e tipo.
- Buscar anexo por ID.
- Baixar arquivo usando rota de download.
- Excluir anexo logicamente usando `deleted_at`.

Tipos de anexo disponíveis:

- `SERVICE_PHOTO`
- `AUVO_REPORT`
- `COMPANY_LOGO`
- `FLOOR_PLAN`
- `OTHER`

Decisão técnica:

- Os arquivos reais ficam fora do banco, dentro da pasta `uploads/attachments`.
- O banco guarda apenas metadados e caminho do arquivo.
- A pasta `uploads` deve permanecer fora do Git.
- O limite inicial por arquivo é de 10 MB.

## 24. Dashboard operacional inicial

Foi criado o módulo inicial de dashboard operacional do CryoMap.

Arquivos principais:

- `backend/src/dashboard/dashboard.module.ts`
- `backend/src/dashboard/dashboard.controller.ts`
- `backend/src/dashboard/dashboard.service.ts`
- `backend/src/dashboard/dto/dashboard-query.dto.ts`

Rotas criadas:

- `GET /dashboard/overview`
- `GET /dashboard/overview?companyId=...`

Todas as rotas do dashboard são protegidas com JWT usando `JwtAuthGuard`.

Regras implementadas:

- Retornar resumo geral do sistema.
- Permitir filtro por empresa.
- Validar se a empresa existe antes de gerar dashboard filtrado.
- Retornar contadores de empresas.
- Retornar contadores de salas por status térmico.
- Retornar contadores de sensores por status.
- Retornar contadores de equipamentos por status.
- Retornar contadores de tarefas por status.
- Retornar quantidade de tarefas críticas abertas, em andamento ou atrasadas.
- Retornar últimos registros de atendimento.
- Retornar últimas leituras de temperatura das salas.
- Bloquear acesso sem autenticação.

Resumo retornado:

- Empresas totais, ativas e inativas.
- Salas totais, normais, em alerta, críticas e offline.
- Sensores totais, ativos, offline, em manutenção e inativos.
- Equipamentos totais, ativos, rodando, parados, em manutenção, offline e inativos.
- Tarefas totais, abertas, em andamento, concluídas, canceladas e atrasadas.
- Tarefas críticas pendentes.
- Últimos atendimentos técnicos.
- Últimas leituras de temperatura de salas.

Essa etapa prepara o backend para os cards, gráficos e indicadores principais do futuro frontend.

## 25. Alertas térmicos iniciais

Foi criado o módulo inicial de alertas térmicos do CryoMap.

Arquivos principais:

- `backend/src/thermal-alerts/thermal-alerts.module.ts`
- `backend/src/thermal-alerts/thermal-alerts.controller.ts`
- `backend/src/thermal-alerts/thermal-alerts.service.ts`
- `backend/src/thermal-alerts/dto/find-thermal-alerts.dto.ts`
- `backend/src/temperature-readings/temperature-readings.service.ts`

Alterações no Prisma:

- Criado enum `ThermalAlertType`.
- Criado enum `ThermalAlertSeverity`.
- Criado enum `ThermalAlertStatus`.
- Criado model `ThermalAlert`.
- Criadas relações com empresa, sala, sensor, leitura de temperatura e usuário que reconheceu o alerta.

Rotas criadas:

- `GET /thermal-alerts`
- `GET /thermal-alerts?companyId=...`
- `GET /thermal-alerts?roomId=...`
- `GET /thermal-alerts?sensorId=...`
- `GET /thermal-alerts?status=...`
- `GET /thermal-alerts?severity=...`
- `GET /thermal-alerts/:id`
- `PATCH /thermal-alerts/:id/acknowledge`
- `PATCH /thermal-alerts/:id/resolve`
- `PATCH /thermal-alerts/:id/dismiss`
- `DELETE /thermal-alerts/:id`

Todas as rotas de alertas térmicos são protegidas com JWT usando `JwtAuthGuard`.

Regras implementadas:

- Criar alerta térmico automaticamente quando uma leitura deixa a sala em estado `CRITICAL`.
- Reutilizar/reabrir alerta aberto ou reconhecido da mesma sala, em vez de criar vários alertas duplicados.
- Resolver automaticamente alertas abertos ou reconhecidos quando uma nova leitura volta ao estado `NORMAL`.
- Vincular alerta à empresa.
- Vincular alerta à sala.
- Vincular alerta ao sensor, quando houver.
- Vincular alerta à leitura de temperatura que disparou o alerta.
- Registrar temperatura, mínimo, máximo e mensagem do alerta.
- Reconhecer alerta com usuário autenticado.
- Resolver alerta manualmente.
- Dispensar alerta manualmente.
- Excluir alerta logicamente usando `deleted_at`.
- Listar alertas com filtros por empresa, sala, sensor, tipo, severidade, status e período.
- Bloquear acesso sem autenticação.

Status disponíveis:

- `OPEN`
- `ACKNOWLEDGED`
- `RESOLVED`
- `DISMISSED`

Severidades disponíveis:

- `WARNING`
- `CRITICAL`

Tipo inicial:

- `ROOM_TEMPERATURE`

Integração com leituras de temperatura:

- Leituras críticas criam ou atualizam alerta térmico.
- Leituras normais resolvem alertas térmicos ativos da sala.
- A integração acontece dentro da mesma transação da criação da leitura, garantindo consistência entre leitura, sala, sensor e alerta.

## 26. Dashboard com alertas térmicos

Foi ampliado o módulo de dashboard operacional do CryoMap para incluir informações de alertas térmicos.

Arquivo principal alterado:

- `backend/src/dashboard/dashboard.service.ts`

Rota impactada:

- `GET /dashboard/overview`
- `GET /dashboard/overview?companyId=...`

Todas as rotas do dashboard continuam protegidas com JWT usando `JwtAuthGuard`.

Novos dados retornados no dashboard:

- Resumo de alertas térmicos.
- Quantidade total de alertas.
- Quantidade de alertas ativos.
- Quantidade de alertas abertos.
- Quantidade de alertas reconhecidos.
- Quantidade de alertas resolvidos.
- Quantidade de alertas dispensados.
- Quantidade de alertas críticos.
- Quantidade de alertas de aviso.
- Salas com alerta térmico ativo.
- Últimos alertas térmicos.

Blocos adicionados à resposta:

- `thermalAlerts`
- `activeThermalAlertRooms`
- `recentThermalAlerts`

Regras implementadas:

- Considerar alertas ativos com status `OPEN` ou `ACKNOWLEDGED`.
- Contar alertas por status.
- Contar alertas por severidade.
- Listar até 10 salas com alerta térmico ativo.
- Evitar duplicidade de salas no bloco de salas com alerta ativo.
- Listar os 5 alertas térmicos mais recentes.
- Respeitar filtro por empresa.
- Validar empresa inexistente no dashboard filtrado.
- Manter compatibilidade com os dados anteriores do dashboard.

Essa etapa prepara o frontend para cards e indicadores como:

- Alertas ativos.
- Salas críticas.
- Últimos alertas.
- Alertas reconhecidos.
- Situações térmicas pendentes de ação.

## 27. Dashboard de séries temporais

Foi criado o módulo de séries temporais dentro do dashboard operacional do CryoMap.

Arquivos principais:

- `backend/src/dashboard/dashboard-timeseries.controller.ts`
- `backend/src/dashboard/dashboard-timeseries.service.ts`
- `backend/src/dashboard/dto/room-series-query.dto.ts`
- `backend/src/dashboard/dto/recent-room-readings-query.dto.ts`
- `backend/src/dashboard/dashboard.module.ts`

Rotas criadas:

- `GET /dashboard/room-temperature-series`
- `GET /dashboard/room-humidity-series`
- `GET /dashboard/room-readings-summary`
- `GET /dashboard/recent-room-readings`

Todas as rotas são protegidas com JWT usando `JwtAuthGuard`.

Regras implementadas:

- Retornar série temporal de temperatura por sala.
- Retornar série temporal de umidade por sala.
- Retornar resumo estatístico das leituras de uma sala.
- Retornar leituras recentes gerais ou filtradas.
- Filtrar séries por empresa e sala.
- Filtrar séries por período usando `startDate` e `endDate`.
- Aplicar período padrão de últimas 24 horas quando nenhuma data for enviada.
- Aplicar limite padrão de 500 pontos nas séries.
- Aplicar limite padrão de 50 leituras recentes.
- Validar limite entre 1 e 1000.
- Validar empresa existente quando informada.
- Validar sala existente dentro da empresa.
- Bloquear acesso sem autenticação.

Dados retornados nas séries:

- Temperatura.
- Umidade.
- Fonte da leitura.
- Data/hora da leitura.
- Sensor vinculado, quando houver.
- Informações básicas da sala.

Resumo estatístico retornado:

- Total de leituras.
- Temperatura média, mínima e máxima.
- Umidade média, mínima e máxima.
- Primeira leitura do período.
- Última leitura do período.
- Início e fim real do período com dados.

Essa etapa prepara o frontend para gráficos como:

- Histórico de temperatura por sala.
- Histórico de umidade por sala.
- Cards de mínima, máxima e média.
- Tabelas de leituras recentes.
- Evolução térmica por período.

## 28. Relatórios operacionais iniciais

Foi criado o módulo inicial de relatórios operacionais do CryoMap.

Arquivos principais:

- `backend/src/reports/reports.module.ts`
- `backend/src/reports/reports.controller.ts`
- `backend/src/reports/reports.service.ts`
- `backend/src/reports/dto/reports-query.dto.ts`
- `backend/src/app.module.ts`

Rotas criadas:

- `GET /reports/operational-summary`
- `GET /reports/tasks-summary`
- `GET /reports/service-records-summary`
- `GET /reports/downtime-summary`
- `GET /reports/thermal-readings-summary`

Todas as rotas de relatórios são protegidas com JWT usando `JwtAuthGuard`.

Filtros disponíveis:

- `companyId`
- `roomId`
- `equipmentId`
- `technicianId`
- `startDate`
- `endDate`

Regras implementadas:

- Gerar resumo operacional geral em JSON.
- Gerar resumo de tarefas por período.
- Gerar resumo de atendimentos técnicos por período.
- Gerar resumo de tempo parado por período.
- Gerar resumo de leituras térmicas por período.
- Aplicar período padrão de últimos 30 dias quando nenhuma data for enviada.
- Validar data inicial e data final.
- Impedir período com data inicial maior que data final.
- Validar empresa existente quando `companyId` for informado.
- Validar sala existente quando `roomId` for informado.
- Validar equipamento existente quando `equipmentId` for informado.
- Validar técnico existente quando `technicianId` for informado.
- Filtrar tarefas por empresa, sala, equipamento, técnico e período.
- Filtrar atendimentos por empresa, sala, equipamento, técnico e período.
- Filtrar tempo parado por empresa, sala, equipamento, técnico e período.
- Filtrar leituras térmicas por empresa, sala e período.
- Retornar totais por status e prioridade de tarefas.
- Retornar totais de atendimentos finalizados e em andamento.
- Retornar soma, média e máximo de tempo parado.
- Retornar ranking de equipamentos com mais tempo parado.
- Retornar ranking de salas com mais tempo parado.
- Retornar média, mínima e máxima de temperatura e umidade.
- Retornar salas críticas no relatório térmico.
- Bloquear acesso sem autenticação.

Correções realizadas durante a etapa:

- Ajustada chamada interna de relatórios para não enviar parâmetro `period` em métodos que já calculam o período internamente.
- Corrigido filtro genérico para evitar envio de `roomId` em consultas do model `Room`.
- Em consultas de salas, o filtro de sala passou a usar `id` corretamente.
- O relatório de alertas térmicos passou a montar filtros próprios para `ThermalAlert`.

Essa etapa prepara o CryoMap para futuras exportações em PDF e Excel, usando os relatórios JSON como base confiável.

## 29. Exportação de relatórios em Excel

Foi criado o módulo de exportação de relatórios operacionais em Excel do CryoMap.

Arquivos principais:

- `backend/src/reports/reports-export.controller.ts`
- `backend/src/reports/reports-export.service.ts`
- `backend/src/reports/reports.module.ts`
- `backend/package.json`
- `backend/package-lock.json`

Biblioteca adicionada:

- `exceljs`

Rotas criadas:

- `GET /reports/export/tasks.xlsx`
- `GET /reports/export/service-records.xlsx`
- `GET /reports/export/downtime.xlsx`
- `GET /reports/export/thermal-readings.xlsx`

Todas as rotas de exportação são protegidas com JWT usando `JwtAuthGuard`.

Filtros disponíveis:

- `companyId`
- `roomId`
- `equipmentId`
- `technicianId`
- `startDate`
- `endDate`

Exportações implementadas:

- Exportação de tarefas em Excel.
- Exportação de atendimentos técnicos em Excel.
- Exportação de tempo parado em Excel.
- Exportação de leituras térmicas em Excel.
- Exportação de tempo parado filtrado por equipamento.

Estrutura dos arquivos:

- Relatório de tarefas:
  - Aba `Tarefas`
  - Aba `Metadados`

- Relatório de atendimentos:
  - Aba `Atendimentos`
  - Aba `Metadados`

- Relatório de tempo parado:
  - Aba `Tempo Parado`
  - Aba `Resumo`
  - Aba `Metadados`

- Relatório de leituras térmicas:
  - Aba `Leituras Térmicas`
  - Aba `Metadados`

Regras implementadas:

- Gerar arquivos `.xlsx` válidos.
- Retornar arquivos com `Content-Type` correto para Excel.
- Retornar arquivos com `Content-Disposition` para download.
- Aplicar os mesmos filtros dos relatórios JSON.
- Aplicar período padrão de últimos 30 dias quando nenhuma data for enviada.
- Validar empresa existente.
- Validar sala existente.
- Validar equipamento existente.
- Validar técnico existente.
- Validar período com data inicial e final.
- Impedir período com data inicial maior que data final.
- Bloquear exportação sem autenticação.
- Adicionar metadados em cada arquivo exportado.
- Congelar linha de cabeçalho.
- Aplicar autofiltro nas planilhas.
- Ajustar largura das colunas.
- Formatar cabeçalho em negrito.

Correções realizadas durante a etapa:

- Removido uso de propriedades incompatíveis em `workbook.properties`.
- Corrigida importação do `exceljs` em projeto ESM.
- Adicionado fallback para compatibilidade com export default/CommonJS do `exceljs`.
- Corrigido uso de `Workbook` e `Worksheet` apenas como tipos.
- A criação real do workbook passou a usar `new ExcelJS.Workbook()`.
- Corrigido erro em que JSON de erro era salvo com extensão `.xlsx` quando o backend retornava erro 500.
- Validada integridade dos arquivos usando `unzip -t`.

Essa etapa prepara o CryoMap para entrega de relatórios operacionais em formato editável, permitindo análise em Excel, LibreOffice e ferramentas compatíveis.

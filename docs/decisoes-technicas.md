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

## 30. Exportação de relatórios em PDF

Foi criado o módulo de exportação de relatórios operacionais em PDF do CryoMap.

Arquivos principais:

- `backend/src/reports/reports-pdf-export.controller.ts`
- `backend/src/reports/reports-pdf-export.service.ts`
- `backend/src/reports/reports.module.ts`
- `backend/package.json`
- `backend/package-lock.json`

Bibliotecas adicionadas:

- `pdfkit`
- `@types/pdfkit`

Rotas criadas:

- `GET /reports/export/tasks.pdf`
- `GET /reports/export/service-records.pdf`
- `GET /reports/export/downtime.pdf`
- `GET /reports/export/thermal-readings.pdf`

Todas as rotas de exportação PDF são protegidas com JWT usando `JwtAuthGuard`.

Filtros disponíveis:

- `companyId`
- `roomId`
- `equipmentId`
- `technicianId`
- `startDate`
- `endDate`

Exportações implementadas:

- Exportação de tarefas em PDF.
- Exportação de atendimentos técnicos em PDF.
- Exportação de tempo parado em PDF.
- Exportação de leituras térmicas em PDF.
- Exportação de tempo parado filtrado por equipamento.

Estrutura dos PDFs:

- Cabeçalho com `CryoMap`.
- Título do relatório.
- Seção de metadados.
- Período inicial e final.
- IDs dos filtros aplicados.
- Total de registros.
- Seção de resumo.
- Lista dos registros retornados.

Regras implementadas:

- Gerar arquivos `.pdf` válidos.
- Retornar arquivos com `Content-Type: application/pdf`.
- Retornar arquivos com `Content-Disposition` para download.
- Aplicar os mesmos filtros dos relatórios JSON e Excel.
- Aplicar período padrão de últimos 30 dias quando nenhuma data for enviada.
- Validar empresa existente.
- Validar sala existente.
- Validar equipamento existente.
- Validar técnico existente.
- Validar período com data inicial e final.
- Impedir período com data inicial maior que data final.
- Bloquear exportação sem autenticação.
- Quebrar página automaticamente quando faltar espaço.
- Limitar textos longos para evitar PDFs excessivamente quebrados.
- Validar arquivos gerados verificando o cabeçalho `%PDF`.

Correções e decisões técnicas:

- A importação do `pdfkit` foi feita usando `createRequire` para compatibilidade com o projeto em ESM.
- Foi criado um tipo local simples para o documento PDF usado no service.
- Os PDFs foram mantidos simples e estáveis nesta primeira versão.
- A etapa priorizou confiabilidade da exportação antes de layout avançado.

Essa etapa prepara o CryoMap para emissão de relatórios operacionais em formato fechado, adequado para envio, arquivamento e compartilhamento com clientes.

## 31. Frontend inicial com React + Vite

Foi criado o frontend inicial do CryoMap usando React, TypeScript e Vite.

Arquivos e pastas principais:

- `frontend/`
- `frontend/src/services/api.ts`
- `frontend/src/types/auth.ts`
- `frontend/src/contexts/auth-context.ts`
- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/contexts/useAuth.ts`
- `frontend/src/routes/ProtectedRoute.tsx`
- `frontend/src/components/AppLayout/AppLayout.tsx`
- `frontend/src/components/AppLayout/AppLayout.css`
- `frontend/src/pages/Login/Login.tsx`
- `frontend/src/pages/Login/Login.css`
- `frontend/src/pages/Dashboard/Dashboard.tsx`
- `frontend/src/pages/Dashboard/Dashboard.css`
- `frontend/src/assets/cryomap-logo.png`
- `frontend/src/App.tsx`
- `frontend/src/main.tsx`
- `frontend/src/index.css`

Bibliotecas adicionadas no frontend:

- `axios`
- `react-router-dom`

Configurações implementadas:

- Frontend criado com React + TypeScript + Vite.
- ESLint selecionado como linter.
- Variável `VITE_API_URL` criada no `.env` do frontend apontando para `http://localhost:3000`.
- Serviço Axios configurado em `src/services/api.ts`.
- Interceptor Axios configurado para enviar o token JWT no header `Authorization`.
- Backend configurado com CORS para aceitar requisições de `http://localhost:5173`.

Autenticação implementada:

- Tela de login.
- Login usando `POST /auth/login`.
- Busca do usuário autenticado usando `GET /auth/me`.
- Token JWT salvo no `localStorage`.
- Logout removendo token do `localStorage`.
- Contexto de autenticação criado.
- Hook `useAuth` separado para evitar aviso do Fast Refresh.
- Rota protegida criada com `ProtectedRoute`.
- Redirecionamento automático para `/login` quando usuário não está autenticado.
- Redirecionamento para `/dashboard` após login.

Interface inicial implementada:

- Layout principal com menu lateral.
- Página de dashboard operacional.
- Cards de métricas principais.
- Exibição de empresas, salas, sensores, equipamentos, tarefas e alertas.
- Listagem de salas com alerta ativo.
- Listagem de últimos alertas térmicos.
- Botão de atualização do dashboard.
- Botão de sair.
- CSS global inicial.

Design:

- A identidade visual foi baseada na logo do CryoMap.
- Foram usadas cores frias com azul escuro, azul vibrante, azul claro e branco.
- A logo foi adicionada na tela de login.
- A logo foi adicionada no menu lateral.
- O layout inicial foi mantido limpo, claro e responsivo.

Correções realizadas durante a etapa:

- Corrigida criação inicial incompleta da pasta `frontend`.
- Corrigido fluxo do Vite quando o diretório estava vazio/incompleto.
- Corrigido aviso do Fast Refresh separando o hook `useAuth` em arquivo próprio.
- Corrigido aviso de `useEffect` no contexto de autenticação.
- Corrigido aviso de `useEffect` no dashboard.
- Mantido `.env` do frontend fora do Git.

Testes realizados:

- Frontend iniciado em `http://localhost:5173`.
- Backend iniciado em `http://localhost:3000`.
- Login com usuário Master Admin funcionando.
- Redirecionamento para dashboard funcionando.
- Dashboard carregando dados reais de `/dashboard/overview`.
- Botão atualizar funcionando.
- Botão sair funcionando.
- Proteção de rota funcionando.
- Acesso direto a `/dashboard` sem login redirecionando para `/login`.
- Logo aparecendo corretamente no login e no menu lateral.

Essa etapa cria a base visual e estrutural do frontend do CryoMap, preparando o sistema para as próximas telas administrativas e operacionais.

## 32. Tela de empresas no frontend

Foi criada a tela de empresas no frontend do CryoMap.

Arquivos principais:

- `frontend/src/types/company.ts`
- `frontend/src/services/companies.ts`
- `frontend/src/pages/Companies/Companies.tsx`
- `frontend/src/pages/Companies/Companies.css`
- `frontend/src/App.tsx`
- `frontend/src/components/AppLayout/AppLayout.tsx`

Funcionalidades implementadas:

- Listagem de empresas consumindo `GET /companies`.
- Cards de resumo com total de empresas, empresas ativas e empresas inativas.
- Busca local por nome, CNPJ, email, telefone, cidade, estado e status.
- Botão para atualizar a listagem.
- Cadastro de nova empresa usando `POST /companies`.
- Edição de empresa usando `PATCH /companies/:id`.
- Inativação de empresa usando `DELETE /companies/:id`.
- Botão de inativar desabilitado para empresas já inativas.
- Tratamento de erro para CNPJ duplicado.
- Tratamento de erro ao carregar, salvar ou inativar empresa.
- Formatação visual de CNPJ.
- Badge visual para status ativo/inativo.
- Item `Empresas` habilitado no menu lateral.
- Rota protegida `/companies`.

Campos do formulário:

- Nome
- CNPJ
- Email
- Telefone
- Endereço
- Cidade
- Estado

Decisões técnicas:

- O formulário de criação e edição foi mantido na mesma tela da listagem.
- O estado do formulário é controlado com `useState`.
- A busca é feita localmente usando `useMemo`.
- A listagem é recarregada após cadastro, edição ou inativação.
- O frontend envia apenas os dígitos do CNPJ para o backend.
- Campos opcionais vazios são enviados como `undefined`.
- A tela segue a identidade visual inicial do CryoMap, baseada em tons frios de azul, branco e cinza claro.

Testes realizados:

- A tela `/companies` abriu corretamente.
- A empresa `Cliente Demo CryoMap` apareceu na listagem.
- A busca funcionou.
- O botão atualizar funcionou.
- O cadastro de nova empresa funcionou.
- A tentativa de cadastrar CNPJ duplicado retornou erro corretamente.
- A edição de empresa funcionou.
- A inativação de empresa funcionou.
- Os cards de resumo foram atualizados após alterações.
- O menu lateral marcou `Empresas` como item ativo.
- A rota permaneceu protegida por autenticação.

Essa etapa inicia a transformação dos CRUDs do backend em telas administrativas reais do CryoMap.

## 33. Tela de salas no frontend

Foi criada a tela de salas no frontend do CryoMap.

Arquivos principais:

- `frontend/src/types/room.ts`
- `frontend/src/services/rooms.ts`
- `frontend/src/pages/Rooms/Rooms.tsx`
- `frontend/src/pages/Rooms/Rooms.css`
- `frontend/src/App.tsx`
- `frontend/src/components/AppLayout/AppLayout.tsx`
- `backend/src/rooms/dto/create-room.dto.ts`
- `backend/src/rooms/dto/update-room.dto.ts`

Funcionalidades implementadas:

- Listagem de salas consumindo `GET /rooms`.
- Filtro de salas por empresa consumindo `GET /rooms?companyId=...`.
- Cards de resumo com total de salas, salas normais, em atenção, críticas e offline.
- Busca local por nome da sala, observações, empresa, status térmico, status de cadastro e temperaturas.
- Botão para atualizar a listagem.
- Cadastro de nova sala usando `POST /rooms`.
- Edição de sala usando `PATCH /rooms/:id`.
- Inativação de sala usando `DELETE /rooms/:id`.
- Botão de inativar desabilitado para salas já inativas.
- Badge visual para status térmico.
- Badge visual para status de cadastro.
- Exibição de temperatura atual em °C.
- Exibição de temperatura mínima e máxima.
- Exibição de posição X/Y para uso futuro no mapa/heatmap.
- Item `Salas` habilitado no menu lateral.
- Rota protegida `/rooms`.

Campos do formulário:

- Empresa
- Nome
- Descrição/observações
- Temperatura mínima
- Temperatura máxima
- Temperatura atual
- Posição X no mapa
- Posição Y no mapa

Decisões técnicas:

- O campo visual `Descrição` no frontend foi mapeado para `notes`, pois o backend e o Prisma já utilizam `notes` para observações da sala.
- Foi evitada a criação de um novo campo `description` para não duplicar conceitos com `notes`.
- O frontend passou a enviar `notes` em vez de `description`.
- Os DTOs de sala foram mantidos alinhados com o backend existente.
- O formulário de criação e edição foi mantido na mesma tela da listagem.
- A busca é feita localmente usando `useMemo`.
- A listagem é recarregada após cadastro, edição ou inativação.
- Os campos numéricos são convertidos no frontend antes de enviar para o backend.
- A tela segue a identidade visual inicial do CryoMap, baseada na logo e em tons frios de azul, branco e cinza claro.

Correções realizadas durante a etapa:

- Corrigido aviso do ESLint em `useEffect` evitando `setState` síncrono direto dentro do effect.
- Corrigido erro de validação `property description should not exist`.
- Padronizado o uso de `notes` como campo de descrição/observações da sala.
- Adicionada validação visual para impedir temperatura mínima maior que temperatura máxima.
- Removidos logs temporários usados para depuração de erro Axios.

Testes realizados:

- A tela `/rooms` abriu corretamente.
- As salas apareceram na listagem.
- O filtro por empresa funcionou.
- A busca local funcionou.
- O botão atualizar funcionou.
- O cadastro de nova sala funcionou.
- O cadastro com descrição/observações funcionou usando `notes`.
- A edição de sala funcionou.
- A inativação de sala funcionou.
- O botão de inativar ficou desabilitado para sala inativa.
- Os cards de resumo foram atualizados após alterações.
- O status térmico apareceu corretamente com badge.
- A temperatura atual apareceu em °C.
- O menu lateral marcou `Salas` como item ativo.
- A rota permaneceu protegida por autenticação.

Essa etapa conclui o CRUD inicial de salas no frontend, uma das bases principais do CryoMap, já que sensores e equipamentos dependem das salas cadastradas.

## 34. Tela de equipamentos no frontend

Foi criada a tela de equipamentos no frontend do CryoMap.

Arquivos principais:

- `frontend/src/types/equipment.ts`
- `frontend/src/services/equipments.ts`
- `frontend/src/pages/Equipments/Equipments.tsx`
- `frontend/src/pages/Equipments/Equipments.css`
- `frontend/src/App.tsx`
- `frontend/src/components/AppLayout/AppLayout.tsx`

Funcionalidades implementadas:

- Listagem de equipamentos consumindo `GET /equipments`.
- Filtro de equipamentos por empresa consumindo `GET /equipments?companyId=...`.
- Filtro de equipamentos por sala consumindo `GET /equipments?roomId=...`.
- Busca local por nome, código, fabricante, modelo, número de série, empresa, sala, status, observações, setpoint, delta e temperatura atual.
- Cards de resumo com total de equipamentos, ativos, rodando, parados, em manutenção, offline e inativos.
- Cadastro de novo equipamento usando `POST /equipments`.
- Edição de equipamento usando `PATCH /equipments/:id`.
- Inativação de equipamento usando `DELETE /equipments/:id`.
- Botão de inativar desabilitado para equipamentos já inativos.
- Badge visual para status do equipamento.
- Exibição de temperatura atual do equipamento em °C.
- Exibição de setpoint e delta.
- Exibição de fabricante, modelo e número de série.
- Item `Equipamentos` habilitado no menu lateral.
- Rota protegida `/equipments`.

Campos do formulário:

- Empresa
- Sala opcional
- Nome
- Código
- Fabricante
- Modelo
- Número de série
- Setpoint
- Delta
- Status, apenas na edição
- Observações

Decisões técnicas:

- Equipamentos não possuem sensores.
- Sensores continuam pertencendo somente às salas.
- A temperatura atual do equipamento é exibida na tela, mas não é editada diretamente no formulário de equipamentos.
- A temperatura atual do equipamento deve ser atualizada pela rotina de temperatura manual de equipamento, via módulo próprio de leituras manuais.
- O formulário foi alinhado ao backend existente, usando `manufacturer`, `model`, `serialNumber`, `setpoint`, `delta` e `notes`.
- Foram removidos do payload do frontend os campos não aceitos pelo backend: `type`, `brand` e `currentTemperature`.
- A busca é feita localmente usando `useMemo`.
- A listagem é recarregada após cadastro, edição ou inativação.
- Equipamentos podem ser cadastrados com sala vinculada ou sem sala vinculada.
- Ao trocar a empresa no formulário, a sala selecionada é limpa para evitar vínculo inválido.

Correções realizadas durante a etapa:

- Corrigido erro de validação `property type should not exist`.
- Corrigido erro de validação `property brand should not exist`.
- Corrigido erro de validação `property currentTemperature should not exist`.
- Ajustado o frontend para seguir exatamente os campos aceitos pelo backend de equipamentos.
- Mantida a regra de domínio de que sensores não pertencem aos equipamentos.

Testes realizados:

- A tela `/equipments` abriu corretamente.
- Os equipamentos apareceram na listagem.
- O filtro por empresa funcionou.
- O filtro por sala funcionou.
- A busca local funcionou.
- O botão atualizar funcionou.
- O cadastro de equipamento com sala vinculada funcionou.
- O cadastro de equipamento sem sala vinculada funcionou.
- A edição de equipamento funcionou.
- A alteração de fabricante, modelo, número de série, setpoint, delta, status e observações funcionou.
- A inativação de equipamento funcionou.
- O botão de inativar ficou desabilitado para equipamento inativo.
- Os cards de resumo foram atualizados após alterações.
- O status apareceu corretamente com badge.
- A temperatura manual apareceu em °C quando existente.
- O menu lateral marcou `Equipamentos` como item ativo.
- A rota permaneceu protegida por autenticação.

Essa etapa conclui o CRUD inicial de equipamentos no frontend, mantendo a separação correta entre equipamentos, salas e sensores.

## 35. Tela de sensores no frontend

Foi criada a tela de sensores no frontend do CryoMap.

Arquivos principais:

- `frontend/src/types/sensor.ts`
- `frontend/src/services/sensors.ts`
- `frontend/src/pages/Sensors/Sensors.tsx`
- `frontend/src/pages/Sensors/Sensors.css`
- `frontend/src/App.tsx`
- `frontend/src/components/AppLayout/AppLayout.tsx`

Funcionalidades implementadas:

- Listagem de sensores consumindo `GET /sensors`.
- Filtro de sensores por empresa consumindo `GET /sensors?companyId=...`.
- Filtro de sensores por sala consumindo `GET /sensors?roomId=...`.
- Busca local por código, tipo, localização, empresa, sala, status, última temperatura e última umidade.
- Cards de resumo com total de sensores, ativos, offline, em manutenção e inativos.
- Cadastro de novo sensor usando `POST /sensors`.
- Edição de sensor usando `PATCH /sensors/:id`.
- Inativação de sensor usando `DELETE /sensors/:id`.
- Botão de inativar desabilitado para sensores já inativos.
- Badge visual para status do sensor.
- Exibição da última temperatura em °C.
- Exibição da última umidade em %.
- Exibição da última comunicação.
- Item `Sensores` habilitado no menu lateral.
- Rota protegida `/sensors`.

Campos do formulário:

- Empresa
- Sala
- Código
- Tipo
- Localização
- Status, apenas na edição

Decisões técnicas:

- Sensores pertencem somente às salas.
- Sensores não pertencem aos equipamentos.
- O vínculo do sensor com a sala é feito por `companyId` e `roomId`.
- O campo `code` é usado como identificador interno do sensor no CryoMap.
- O campo `location` é usado para descrever o posicionamento físico do sensor na sala.
- A última temperatura, última umidade e última comunicação não são editadas pelo formulário de sensores.
- Temperatura, umidade e última comunicação serão atualizadas por leituras de temperatura ou por futura integração com API/MQTT de sensores reais.
- A tela foi alinhada ao backend atual, que usa `code`, `type`, `location`, `status`, `lastTemperature`, `lastHumidity` e `lastSeenAt`.
- Foram removidos do frontend os campos não aceitos pelo backend atual: `name`, `manufacturer`, `model`, `externalId` e `notes`.
- A busca é feita localmente usando `useMemo`.
- A listagem é recarregada após cadastro, edição ou inativação.
- Ao trocar a empresa no formulário, a sala selecionada é limpa para evitar vínculo inválido.

Correções realizadas durante a etapa:

- Corrigido erro de validação `property name should not exist`.
- Corrigido erro de validação `property manufacturer should not exist`.
- Corrigido erro de validação `property model should not exist`.
- Corrigido erro de validação `property externalId should not exist`.
- Corrigido erro de validação `property notes should not exist`.
- Corrigido formulário para usar apenas campos aceitos pelo backend atual.
- Removida duplicação do campo Status no formulário.
- Corrigida exibição da tabela para usar `code` e `location`.
- Corrigido aviso de input controlado/não controlado ao editar sensor.

Testes realizados:

- A tela `/sensors` abriu corretamente.
- Os sensores apareceram na listagem.
- O filtro por empresa funcionou.
- O filtro por sala funcionou.
- A busca local funcionou.
- O botão atualizar funcionou.
- O cadastro de sensor vinculado a uma sala funcionou.
- A edição de código, tipo, localização e status funcionou.
- A inativação de sensor funcionou.
- O botão de inativar ficou desabilitado para sensor inativo.
- Os cards de resumo foram atualizados após alterações.
- O status apareceu corretamente com badge.
- A última temperatura apareceu em °C quando existente.
- A última umidade apareceu em % quando existente.
- A última comunicação apareceu quando existente.
- O menu lateral marcou `Sensores` como item ativo.
- A rota permaneceu protegida por autenticação.

Essa etapa conclui o CRUD inicial de sensores no frontend, mantendo a separação correta entre salas, sensores e equipamentos.

## 36. Padronização visual e responsividade inicial

Foi criada uma primeira camada de padronização visual e responsividade para o frontend do CryoMap.

Arquivos principais alterados:

- `frontend/src/index.css`
- `frontend/src/components/AppLayout/AppLayout.tsx`
- `frontend/src/components/AppLayout/AppLayout.css`

Funcionalidades e melhorias implementadas:

- Criação de variáveis globais de tema em `:root`.
- Cores principais alinhadas à identidade visual do CryoMap.
- Ajustes globais de fonte, background, botões, inputs e links.
- Responsividade inicial para telas menores.
- Sidebar lateral mantida em telas grandes.
- Menu mobile com botão de três tracinhos em telas menores.
- Menu mobile com navegação para Dashboard, Empresas, Salas, Equipamentos e Sensores.
- Opção de logout dentro do menu mobile.
- Animação suave de abertura do menu mobile.
- Formulários de cadastro/edição convertidos para painéis flutuantes.
- Formulários aparecem no topo/centro da tela, evitando rolagem desnecessária.
- Cards de resumo compactados em telas menores.
- Botões de ação compactados em telas menores.
- Filtros compactados em telas menores.
- Tabelas mantidas com rolagem horizontal para evitar quebra visual.
- Dashboard preservado sem mudanças estruturais relevantes.

Decisões técnicas:

- Em desktop, o CryoMap mantém navegação lateral fixa.
- Em tablet/mobile, a navegação passa a usar menu superior com botão hambúrguer.
- A interface deve seguir uma linha visual limpa, leve e moderna, inspirada em ecossistemas como o da Apple, mas sem deixar o sistema pesado.
- A responsividade foi aplicada inicialmente de forma global para telas de cadastro.
- As telas de empresas, salas, equipamentos e sensores receberam ajustes compactos.
- Os formulários flutuantes foram aplicados globalmente às telas já existentes.
- As tabelas continuam exibindo muitas informações, mas agora ficam contidas em rolagem horizontal.
- A padronização visual será refinada futuramente por página, conforme novas telas forem criadas.

Correções realizadas durante a etapa:

- Corrigido `index.css` que havia ficado duplicado e com seletores inválidos.
- Corrigido `AppLayout.css` para usar a classe real `.app-shell`.
- Corrigido `AppLayout.tsx` que havia ficado com imports duplicados.
- Corrigido comportamento mobile da sidebar.
- Corrigido excesso de tamanho em cards, botões e filtros nas telas de cadastro.
- Mantido o Dashboard visualmente estável.

Testes realizados:

- Login funcionando.
- Dashboard funcionando.
- Tela de empresas funcionando.
- Tela de salas funcionando.
- Tela de equipamentos funcionando.
- Tela de sensores funcionando.
- Menu mobile funcionando.
- Formulários flutuantes funcionando.
- Cards compactos funcionando.
- Filtros compactos funcionando.
- Tabelas com rolagem horizontal funcionando.
- Sidebar desktop funcionando.
- Build do frontend validado.

## 37. Tela de tarefas no frontend

Foi criada a tela de tarefas no frontend do CryoMap.

Arquivos principais:

- `frontend/src/types/task.ts`
- `frontend/src/types/user.ts`
- `frontend/src/services/tasks.ts`
- `frontend/src/services/users.ts`
- `frontend/src/pages/Tasks/Tasks.tsx`
- `frontend/src/pages/Tasks/Tasks.css`
- `frontend/src/App.tsx`
- `frontend/src/components/AppLayout/AppLayout.tsx`
- `frontend/src/index.css`

Funcionalidades implementadas:

- Listagem de tarefas consumindo `GET /tasks`.
- Filtro por empresa.
- Filtro por sala.
- Filtro por equipamento.
- Filtro por status.
- Filtro por prioridade.
- Busca local por título, descrição, empresa, sala, equipamento, responsável, status e prioridade.
- Cards de resumo com total, abertas, em andamento, concluídas e atrasadas.
- Cadastro de tarefa usando `POST /tasks`.
- Edição de tarefa usando `PATCH /tasks/:id`.
- Remoção lógica de tarefa usando `DELETE /tasks/:id`.
- Formulário flutuante para criação e edição.
- Seleção de empresa, sala, equipamento e responsável.
- Controle de título, descrição, prioridade, status e vencimento.
- Badges visuais para status.
- Badges visuais para prioridade.
- Exibição de vencimento, data de conclusão e data de criação.
- Rota protegida `/tasks`.
- Item `Tarefas` habilitado no menu lateral e no menu mobile.

Campos do formulário:

- Empresa
- Sala
- Equipamento
- Responsável
- Título
- Prioridade
- Status
- Vencimento
- Descrição

Decisões técnicas:

- A tarefa pertence obrigatoriamente a uma empresa.
- A tarefa pode ser vinculada opcionalmente a uma sala.
- A tarefa pode ser vinculada opcionalmente a um equipamento.
- A tarefa pode ser atribuída opcionalmente a um usuário responsável.
- Ao trocar a empresa no formulário, sala, equipamento e responsável são limpos para evitar vínculos inválidos.
- Ao trocar a sala no formulário, o equipamento é limpo para evitar vínculo inválido.
- Datas de vencimento são preenchidas no frontend como `datetime-local` e enviadas ao backend em formato ISO.
- A data de conclusão é controlada pelo backend conforme status da tarefa.
- A listagem é recarregada após cadastro, edição ou remoção.
- O formulário segue o padrão flutuante definido na etapa de responsividade.
- A tela mantém compatibilidade com o menu mobile e com a navegação desktop.

Correções e cuidados realizados:

- DTOs do backend foram conferidos antes da implementação do CRUD.
- O frontend foi alinhado aos campos aceitos pelo backend:
  - `companyId`
  - `roomId`
  - `equipmentId`
  - `assignedToUserId`
  - `title`
  - `description`
  - `priority`
  - `status`
  - `dueDate`
- Criado service de usuários para carregar responsáveis.
- Criados tipos específicos para tarefas, prioridade, status, usuários, papéis e status de usuários.

Testes realizados:

- A tela `/tasks` abriu corretamente.
- A listagem de tarefas funcionou.
- Os filtros por empresa, sala, equipamento, status e prioridade funcionaram.
- A busca local funcionou.
- O botão atualizar funcionou.
- O cadastro de tarefa funcionou.
- A edição de título, descrição, prioridade, status e vencimento funcionou.
- A vinculação com empresa funcionou.
- A vinculação com sala funcionou.
- A vinculação com equipamento funcionou.
- A seleção de responsável funcionou.
- A remoção de tarefa funcionou.
- Os cards de resumo atualizaram após alterações.
- O formulário flutuante funcionou.
- O menu mobile continuou funcionando.
- A rota permaneceu protegida por autenticação.

Essa etapa conclui o CRUD inicial de tarefas no frontend.

## 38. Tela de atendimentos técnicos no frontend

Foi criada a tela de atendimentos técnicos no frontend do CryoMap.

Arquivos principais:

- `frontend/src/types/service-record.ts`
- `frontend/src/services/service-records.ts`
- `frontend/src/pages/ServiceRecords/ServiceRecords.tsx`
- `frontend/src/pages/ServiceRecords/ServiceRecords.css`
- `frontend/src/App.tsx`
- `frontend/src/components/AppLayout/AppLayout.tsx`

Funcionalidades implementadas:

- Listagem de atendimentos consumindo `GET /service-records`.
- Filtros por empresa, sala, equipamento, tarefa, técnico e período.
- Busca local.
- Cards de resumo.
- Cadastro de atendimento usando `POST /service-records`.
- Edição usando `PATCH /service-records/:id`.
- Finalização de atendimento preenchendo `finishedAt`.
- Reabertura de atendimento limpando `finishedAt`.
- Remoção usando `DELETE /service-records/:id`.
- Formulário flutuante.
- Exibição do tempo parado calculado pelo backend.
- Exibição de problema encontrado, serviço realizado e observações.
- Rota protegida `/service-records`.
- Item `Atendimentos` habilitado na navegação.

Regras integradas com o backend:

- O atendimento nasce vinculado a uma tarefa.
- Empresa, sala e equipamento são herdados da tarefa.
- Uma tarefa não pode possuir dois registros de atendimento ativos.
- Ao criar um atendimento sem data final, a tarefa muda para `IN_PROGRESS`.
- Ao finalizar, a tarefa muda para `DONE`.
- Ao reabrir, a tarefa volta para `IN_PROGRESS`.
- Ao remover o atendimento, a tarefa volta para `OPEN`.
- `downtimeMinutes` é calculado automaticamente pelo backend.
- A data final não pode ser anterior à data inicial.

Testes realizados:

- Listagem funcionando.
- Filtros funcionando.
- Busca funcionando.
- Cadastro funcionando.
- Edição funcionando.
- Finalização funcionando.
- Reabertura funcionando.
- Remoção funcionando.
- Atualização automática do status da tarefa funcionando.
- Cálculo de tempo parado funcionando.
- Formulário flutuante funcionando.
- Menu mobile funcionando.
- Build e lint validados.

## 39. Tela de relatórios no frontend

Foi criada a tela de relatórios no frontend do CryoMap.

Arquivos principais:

- `frontend/src/services/reports.ts`
- `frontend/src/pages/Reports/Reports.tsx`
- `frontend/src/pages/Reports/Reports.css`
- `frontend/src/App.tsx`
- `frontend/src/components/AppLayout/AppLayout.tsx`

Funcionalidades implementadas:

- Tela protegida `/reports`.
- Item `Relatórios` habilitado no menu desktop e mobile.
- Filtros por empresa, sala, equipamento, técnico e período.
- Consulta de relatórios JSON:
  - `GET /reports/operational-summary`
  - `GET /reports/tasks-summary`
  - `GET /reports/service-records-summary`
  - `GET /reports/downtime-summary`
  - `GET /reports/thermal-readings-summary`
- Exportação de relatórios em Excel:
  - `GET /reports/export/tasks.xlsx`
  - `GET /reports/export/service-records.xlsx`
  - `GET /reports/export/downtime.xlsx`
  - `GET /reports/export/thermal-readings.xlsx`
- Exportação de relatórios em PDF:
  - `GET /reports/export/tasks.pdf`
  - `GET /reports/export/service-records.pdf`
  - `GET /reports/export/downtime.pdf`
  - `GET /reports/export/thermal-readings.pdf`
- Download automático dos arquivos pelo navegador.
- Painéis visuais para resumo operacional, tarefas, atendimentos, tempo parado e leituras térmicas.
- Visualização amigável dos dados retornados pelo backend.
- Datas formatadas em `pt-BR`.
- UUIDs encurtados na exibição.
- Objetos aninhados exibidos como blocos organizados.
- Arrays exibidos com quantidade e prévia dos primeiros itens.
- Ocultação de campos técnicos como `generatedAt`, `filters` e `period` na visualização principal.

Decisões técnicas:

- A tela de relatórios consome os endpoints já existentes no backend.
- Os filtros são convertidos para datas ISO antes do envio ao backend.
- O período padrão da tela é de 30 dias.
- A exportação usa `responseType: 'blob'` para baixar Excel e PDF.
- A visualização JSON foi tratada no frontend para evitar exibição bruta de objetos grandes.
- Os relatórios exportados continuam sendo gerados pelo backend.
- A tela mantém compatibilidade com o menu mobile e com o layout responsivo criado anteriormente.

Correções realizadas:

- Corrigido warning do React Hook `useEffect` relacionado a `reportParams`.
- Corrigida exibição de JSON bruto nos painéis de relatórios.
- Criado renderizador visual para valores simples, objetos, arrays, datas, enums e UUIDs.
- Melhorado CSS dos blocos internos dos relatórios.

Testes realizados:

- Tela `/reports` abriu corretamente.
- Filtros carregaram empresas, salas, equipamentos e técnicos.
- Aplicação de filtros funcionou.
- Atualização dos relatórios funcionou.
- Exportação Excel de tarefas funcionou.
- Exportação PDF de tarefas funcionou.
- Exportação Excel de atendimentos funcionou.
- Exportação PDF de atendimentos funcionou.
- Exportação Excel de tempo parado funcionou.
- Exportação PDF de tempo parado funcionou.
- Exportação Excel de leituras térmicas funcionou.
- Exportação PDF de leituras térmicas funcionou.
- Visualização dos relatórios ficou organizada.
- Menu mobile continuou funcionando.
- Build e lint validados.

Essa etapa conclui a tela inicial de relatórios no frontend.

## 40. Tela de leituras de temperatura no frontend

Foi criada a tela de leituras de temperatura das salas no frontend do CryoMap.

Arquivos principais:

- `frontend/src/types/temperature-reading.ts`
- `frontend/src/services/temperature-readings.ts`
- `frontend/src/pages/TemperatureReadings/TemperatureReadings.tsx`
- `frontend/src/pages/TemperatureReadings/TemperatureReadings.css`
- `frontend/src/App.tsx`
- `frontend/src/components/AppLayout/AppLayout.tsx`

Funcionalidades implementadas:

- Tela protegida `/temperature-readings`.
- Item `Leituras` habilitado no menu desktop e mobile.
- Listagem de leituras consumindo `GET /temperature-readings`.
- Filtro por empresa.
- Filtro por sala.
- Filtro por sensor.
- Filtro por período.
- Busca local por empresa, sala, sensor, origem, temperatura e umidade.
- Cards de resumo:
  - total de leituras;
  - temperatura média;
  - temperatura mínima;
  - temperatura máxima;
  - umidade média.
- Tabela com:
  - data da leitura;
  - empresa;
  - sala;
  - sensor;
  - temperatura;
  - umidade;
  - status térmico;
  - origem.
- Cadastro manual de leitura usando `POST /temperature-readings`.
- Formulário flutuante para nova leitura manual.
- Seleção de empresa, sala e sensor opcional.
- Envio de temperatura em Celsius.
- Envio opcional de umidade.
- Envio opcional de data/hora da leitura.
- Campo de origem, usando `MANUAL` como padrão.
- Atualização da listagem após cadastro.

Decisões técnicas:

- A tela de leituras representa o histórico de temperatura das salas.
- Leituras pertencem a uma empresa e uma sala obrigatoriamente.
- Sensor é opcional para permitir leitura manual sem equipamento integrado.
- Apenas salas recebem sensores e leituras automáticas.
- Equipamentos não recebem sensores; continuam com leituras manuais próprias em outro fluxo.
- A criação de leitura atualiza a temperatura atual da sala no backend.
- A criação de leitura atualiza o status térmico da sala no backend.
- Se um sensor for selecionado, o backend atualiza os últimos valores do sensor.
- O frontend não calcula nem grava status térmico diretamente.
- Temperaturas são exibidas em Celsius.
- Datas `datetime-local` são convertidas para ISO antes do envio.
- A tela prepara o caminho para futura integração com sensores reais, API ou MQTT.

Correções realizadas:

- Corrigido tipo térmico de sala conforme o padrão existente do projeto.
- Removido o campo `notes` do payload de criação, pois o backend `CreateTemperatureReadingDto` não aceita esse campo.
- Mantida a exibição de `notes` na tabela apenas se o backend retornar esse campo futuramente, sem enviá-lo no cadastro.
- Ajustado formulário para enviar somente campos aceitos pelo backend:
  - `companyId`;
  - `roomId`;
  - `sensorId`;
  - `temperature`;
  - `humidity`;
  - `readAt`;
  - `source`.

Testes realizados:

- Tela `/temperature-readings` abriu corretamente.
- Filtros por empresa, sala, sensor e período funcionaram.
- Busca local funcionou.
- Cadastro manual de leitura funcionou.
- Leitura manual sem sensor funcionou.
- Leitura manual com sensor funcionou.
- Sala atualizou temperatura atual após nova leitura.
- Sensor atualizou última temperatura/umidade quando selecionado.
- Leitura acima do limite máximo alterou status térmico para `CRITICAL`.
- Leitura dentro do limite voltou status térmico para `NORMAL`.
- Cards de resumo atualizaram corretamente.
- Tabela atualizou após cadastro.
- Menu mobile continuou funcionando.
- Build e lint validados.

Essa etapa conclui a tela inicial de leituras de temperatura das salas no frontend.

## 41. Tela de leituras manuais de equipamentos no frontend

Foi criada a tela de leituras manuais de temperatura dos equipamentos no frontend do CryoMap.

Arquivos principais:

- `frontend/src/types/equipment-temperature-reading.ts`
- `frontend/src/services/equipment-temperature-readings.ts`
- `frontend/src/pages/EquipmentTemperatureReadings/EquipmentTemperatureReadings.tsx`
- `frontend/src/pages/EquipmentTemperatureReadings/EquipmentTemperatureReadings.css`
- `frontend/src/App.tsx`
- `frontend/src/components/AppLayout/AppLayout.tsx`

Funcionalidades implementadas:

- Tela protegida `/equipment-temperature-readings`.
- Item `Temp. Equipamentos` habilitado no menu desktop e mobile.
- Listagem de leituras consumindo `GET /equipment-temperature-readings`.
- Filtro por empresa.
- Filtro por sala.
- Filtro por equipamento.
- Filtro por usuário que registrou.
- Filtro por período.
- Busca local por empresa, sala, equipamento, código, usuário, origem, observações e temperatura.
- Cards de resumo:
  - total de leituras;
  - leituras manuais;
  - temperatura média;
  - temperatura mínima;
  - temperatura máxima.
- Tabela com:
  - data da medição;
  - empresa;
  - sala;
  - equipamento;
  - temperatura;
  - origem;
  - usuário que registrou;
  - observações.
- Cadastro manual usando `POST /equipment-temperature-readings`.
- Formulário flutuante para nova leitura manual.
- Seleção de empresa e equipamento.
- Envio da temperatura em Celsius.
- Envio de origem `MANUAL`.
- Envio opcional de observações.
- Envio opcional da data/hora da medição.
- Atualização da listagem após cadastro.

Decisões técnicas:

- Equipamentos não possuem sensores no CryoMap.
- A temperatura de equipamentos é registrada manualmente.
- A leitura pertence obrigatoriamente a uma empresa e a um equipamento.
- A sala é herdada do equipamento no backend.
- O usuário autenticado é registrado no backend como `createdByUserId`.
- A criação da leitura atualiza `currentTemperature` do equipamento no backend.
- O frontend não altera diretamente o equipamento; apenas cria a leitura.
- Datas `datetime-local` são convertidas para ISO antes do envio.
- O campo `notes` é permitido neste fluxo porque existe no backend para leituras de equipamentos.

Testes realizados:

- Tela `/equipment-temperature-readings` abriu corretamente.
- Filtros por empresa, sala, equipamento, usuário e período funcionaram.
- Busca local funcionou.
- Cadastro manual de temperatura de equipamento funcionou.
- Campo de observações funcionou.
- Temperatura atual do equipamento foi atualizada após cadastro.
- Tela de Equipamentos refletiu a nova temperatura atual.
- Menu mobile continuou funcionando.
- Build e lint validados.

Essa etapa conclui a tela inicial de leituras manuais de equipamentos no frontend.

## 42. Tela de alertas térmicos no frontend

Foi criada a tela de alertas térmicos no frontend do CryoMap.

Arquivos principais:

- `frontend/src/types/thermal-alert.ts`
- `frontend/src/services/thermal-alerts.ts`
- `frontend/src/pages/ThermalAlerts/ThermalAlerts.tsx`
- `frontend/src/pages/ThermalAlerts/ThermalAlerts.css`
- `frontend/src/App.tsx`
- `frontend/src/components/AppLayout/AppLayout.tsx`

Funcionalidades implementadas:

- Tela protegida `/thermal-alerts`.
- Item `Alertas` habilitado no menu desktop e mobile.
- Listagem de alertas consumindo `GET /thermal-alerts`.
- Filtro por empresa.
- Filtro por sala.
- Filtro por sensor.
- Filtro por tipo de alerta.
- Filtro por severidade.
- Filtro por status.
- Filtro por período.
- Busca local por empresa, sala, sensor, tipo, severidade, status, mensagem, usuário que reconheceu e temperatura.
- Cards de resumo:
  - total de alertas;
  - alertas ativos;
  - alertas abertos;
  - alertas reconhecidos;
  - alertas críticos;
  - alertas resolvidos.
- Tabela com:
  - data do disparo;
  - empresa;
  - sala;
  - sensor;
  - tipo;
  - severidade;
  - status;
  - temperatura;
  - limites da sala;
  - mensagem;
  - usuário que reconheceu;
  - ações.
- Ação de reconhecer alerta usando `PATCH /thermal-alerts/:id/acknowledge`.
- Ação de resolver alerta usando `PATCH /thermal-alerts/:id/resolve`.
- Ação de dispensar alerta usando `PATCH /thermal-alerts/:id/dismiss`.
- Ação de remover alerta usando `DELETE /thermal-alerts/:id`.
- Atualização da listagem após cada ação.

Decisões técnicas:

- Alertas térmicos são gerados automaticamente pelo backend a partir de leituras críticas de salas.
- O frontend não cria alertas manualmente.
- O frontend apenas consulta e altera o estado operacional dos alertas.
- Alertas com status `OPEN` podem ser reconhecidos.
- Alertas com status `OPEN` ou `ACKNOWLEDGED` podem ser resolvidos ou dispensados.
- Alertas removidos saem da listagem por exclusão lógica no backend.
- O usuário autenticado é registrado no backend ao reconhecer um alerta.
- Leituras normais podem resolver automaticamente alertas ativos conforme regra do backend.
- Datas dos filtros são convertidas para ISO antes do envio.
- Temperaturas são exibidas em Celsius.

Testes realizados:

- Tela `/thermal-alerts` abriu corretamente.
- Filtros por empresa, sala, sensor, tipo, severidade, status e período funcionaram.
- Busca local funcionou.
- Leitura crítica criada na tela de Leituras gerou alerta térmico.
- Alerta apareceu com status `OPEN`.
- Ação de reconhecer alterou status para `ACKNOWLEDGED`.
- Ação de resolver alterou status para `RESOLVED`.
- Ação de dispensar alterou status para `DISMISSED`.
- Ação de remover retirou alerta da listagem.
- Cards de resumo atualizaram corretamente.
- Menu mobile continuou funcionando.
- Build e lint validados.

Essa etapa conclui a tela inicial de alertas térmicos no frontend.

## 43. Tela de anexos no frontend

Foi criada a tela de anexos no frontend do CryoMap.

Arquivos principais:

- `frontend/src/types/attachment.ts`
- `frontend/src/services/attachments.ts`
- `frontend/src/pages/Attachments/Attachments.tsx`
- `frontend/src/pages/Attachments/Attachments.css`
- `frontend/src/App.tsx`
- `frontend/src/components/AppLayout/AppLayout.tsx`

Funcionalidades implementadas:

- Tela protegida `/attachments`.
- Item `Anexos` habilitado no menu desktop e mobile.
- Listagem de anexos consumindo `GET /attachments`.
- Upload de arquivo usando `POST /attachments`.
- Download de arquivo usando `GET /attachments/:id/download`.
- Remoção lógica usando `DELETE /attachments/:id`.
- Upload via `multipart/form-data`.
- Campo de arquivo enviado como `file`, conforme exigido pelo backend.
- Filtro por empresa.
- Filtro por tarefa.
- Filtro por atendimento técnico.
- Filtro por usuário que enviou.
- Filtro por tipo de anexo.
- Busca local por nome do arquivo, tipo, empresa, tarefa, usuário e atendimento.
- Cards de resumo:
  - total de anexos;
  - fotos de serviço;
  - plantas baixas;
  - anexos vinculados a tarefas;
  - anexos vinculados a atendimentos;
  - tamanho total dos arquivos.
- Formulário flutuante para novo anexo.
- Exibição do arquivo selecionado antes do envio.
- Validação frontend para limite de 10 MB.
- Download automático pelo navegador.
- Atualização da listagem após upload e remoção.

Tipos de anexo suportados:

- `SERVICE_PHOTO`: foto de serviço.
- `AUVO_REPORT`: relatório Auvo.
- `COMPANY_LOGO`: logo da empresa.
- `FLOOR_PLAN`: planta baixa.
- `OTHER`: outro.

Decisões técnicas:

- O backend exige que o anexo esteja vinculado a pelo menos uma empresa, tarefa ou atendimento técnico.
- Quando o anexo é vinculado a uma tarefa, o backend resolve a empresa da tarefa.
- Quando o anexo é vinculado a um atendimento, o backend resolve a empresa e a tarefa do atendimento.
- O frontend envia somente os campos aceitos pelo `CreateAttachmentDto`:
  - `companyId`;
  - `taskId`;
  - `serviceRecordId`;
  - `type`;
  - `file`.
- O campo `file` é obrigatório no upload.
- O limite de arquivo é de 10 MB, alinhado ao backend.
- A remoção é lógica no backend e o anexo removido sai da listagem.
- Os arquivos são armazenados no backend em `uploads/attachments`.

Testes realizados:

- Tela `/attachments` abriu corretamente.
- Filtros por empresa, tarefa, atendimento, usuário e tipo funcionaram.
- Busca local funcionou.
- Upload vinculado somente à empresa funcionou.
- Upload vinculado à tarefa funcionou.
- Upload vinculado ao atendimento técnico funcionou.
- Upload com tipo `SERVICE_PHOTO` funcionou.
- Upload com tipo `AUVO_REPORT` funcionou.
- Upload com tipo `COMPANY_LOGO` funcionou.
- Upload com tipo `FLOOR_PLAN` funcionou.
- Upload com tipo `OTHER` funcionou.
- Download de anexo funcionou.
- Remoção de anexo funcionou.
- Cards de resumo atualizaram corretamente.
- Menu mobile continuou funcionando.
- Build e lint validados.

Essa etapa conclui a tela inicial de uploads e anexos no frontend.

## 44. Tela de usuários e controle de acesso inicial no frontend

Foi criada a tela de usuários no frontend do CryoMap e iniciado o controle de acesso por perfil no frontend.

Arquivos principais:

- `frontend/src/types/user.ts`
- `frontend/src/types/auth.ts`
- `frontend/src/services/users.ts`
- `frontend/src/services/auth-storage.ts`
- `frontend/src/services/api.ts`
- `frontend/src/permissions/role-permissions.ts`
- `frontend/src/routes/ProtectedRoute.tsx`
- `frontend/src/pages/Users/Users.tsx`
- `frontend/src/pages/Users/Users.css`
- `frontend/src/pages/ServiceRecords/ServiceRecords.tsx`
- `frontend/src/pages/ServiceRecords/ServiceRecords.css`
- `frontend/src/App.tsx`
- `frontend/src/components/AppLayout/AppLayout.tsx`

Funcionalidades da tela de usuários:

- Tela protegida `/users`.
- Item `Usuários` habilitado no menu desktop e mobile apenas para perfis administrativos.
- Listagem de usuários consumindo `GET /users`.
- Criação de usuário consumindo `POST /users`.
- Edição de usuário consumindo `PATCH /users/:id`.
- Inativação de usuário consumindo `DELETE /users/:id`.
- Filtro local por empresa.
- Filtro local por perfil.
- Filtro local por status.
- Busca local por nome, e-mail, telefone, cargo, perfil, status e empresa.
- Cards de resumo:
  - total de usuários;
  - usuários ativos;
  - usuários bloqueados;
  - técnicos;
  - usuários clientes;
  - usuários sem empresa.
- Formulário flutuante para criação e edição.
- Campo de senha obrigatório na criação.
- Campo de senha opcional na edição.
- Se o campo de senha ficar vazio na edição, a senha atual é mantida.
- Vinculação opcional de usuário a empresa.
- Suporte a usuário interno sem empresa vinculada.
- Exibição de último login, data de criação, empresa, cargo, telefone, perfil e status.

Perfis suportados pelo backend:

- `MASTER_ADMIN`: administrador master.
- `SUPERVISOR`: supervisor.
- `CLIENT_USER`: usuário cliente.
- `TECHNICIAN`: técnico.

Status suportados pelo backend:

- `ACTIVE`: ativo.
- `INACTIVE`: inativo.
- `BLOCKED`: bloqueado.

Controle de acesso inicial no frontend:

- Foi criado o arquivo central `frontend/src/permissions/role-permissions.ts`.
- O menu desktop e mobile agora é filtrado conforme o perfil do usuário logado.
- O `ProtectedRoute` agora aceita `allowedRoles`.
- Acesso direto por URL a páginas não permitidas redireciona para `/dashboard`.
- O usuário logado é armazenado em `localStorage` com a chave `@cryomap:user`.
- O token continua armazenado em `localStorage` com a chave `@cryomap:token`.

Permissões iniciais por tela:

- `MASTER_ADMIN`: acesso total.
- `SUPERVISOR`: acesso administrativo e operacional amplo.
- `CLIENT_USER`:
  - acessa Dashboard;
  - acessa Salas;
  - acessa Equipamentos;
  - acessa Sensores;
  - acessa Leituras;
  - acessa Alertas;
  - acessa Atendimentos somente leitura;
  - acessa Anexos;
  - acessa Relatórios;
  - não acessa Empresas;
  - não acessa Usuários;
  - não acessa Chamados/Tarefas;
  - não acessa Temperaturas de Equipamentos.
- `TECHNICIAN`:
  - acessa Dashboard;
  - acessa Salas;
  - acessa Equipamentos;
  - acessa Leituras;
  - acessa Alertas;
  - acessa Temperaturas de Equipamentos;
  - acessa Chamados/Tarefas;
  - acessa Atendimentos;
  - acessa Anexos;
  - não acessa Empresas;
  - não acessa Usuários;
  - não acessa Sensores;
  - não acessa Relatórios.

Escopo por empresa no frontend:

- `CLIENT_USER` vê somente dados da empresa vinculada ao próprio usuário.
- `TECHNICIAN` vê somente dados da empresa vinculada ao próprio usuário.
- `MASTER_ADMIN` e `SUPERVISOR` continuam podendo visualizar dados de todas as empresas.
- O interceptor do Axios em `frontend/src/services/api.ts` injeta automaticamente `companyId` nas chamadas GET das principais rotas quando o usuário é `CLIENT_USER` ou `TECHNICIAN`.

Rotas com escopo automático por empresa no frontend:

- `/dashboard/overview`
- `/dashboard/room-temperature-series`
- `/dashboard/room-humidity-series`
- `/dashboard/room-readings-summary`
- `/dashboard/recent-room-readings`
- `/rooms`
- `/equipments`
- `/sensors`
- `/temperature-readings`
- `/equipment-temperature-readings`
- `/thermal-alerts`
- `/tasks`
- `/service-records`
- `/attachments`
- endpoints JSON de relatórios
- endpoints de exportação Excel/PDF de relatórios

Atendimentos para usuário cliente:

- `CLIENT_USER` pode acessar a tela `/service-records`.
- `CLIENT_USER` vê somente atendimentos da própria empresa.
- `CLIENT_USER` não vê botão de novo atendimento.
- `CLIENT_USER` não vê ações de editar, finalizar, reabrir ou remover.
- Para `CLIENT_USER`, a coluna de ações exibe apenas `Somente consulta`.
- `MASTER_ADMIN`, `SUPERVISOR` e `TECHNICIAN` continuam podendo operar atendimentos normalmente.

Decisões técnicas:

- O controle implementado nesta etapa é uma proteção inicial de frontend.
- O frontend melhora a experiência e evita acesso visual indevido.
- Segurança definitiva ainda precisa ser implementada no backend com guards, decorators e filtros por usuário/perfil.
- O backend ainda deve bloquear chamadas diretas por API em uma etapa posterior.
- Os enums foram alinhados ao Prisma:
  - `CLIENT_USER`, não `EMPRESA_CLIENTE`;
  - `TECHNICIAN`, não `TECNICO`.

Testes realizados:

- Tela `/users` abriu corretamente para perfis administrativos.
- Listagem de usuários funcionou.
- Filtro por empresa funcionou.
- Filtro por perfil funcionou.
- Filtro por status funcionou.
- Busca local funcionou.
- Criação de usuário técnico funcionou.
- Criação de usuário cliente vinculado a empresa funcionou.
- Edição de nome, e-mail, telefone e cargo funcionou.
- Edição de perfil funcionou.
- Edição de status funcionou.
- Edição sem preencher nova senha manteve a senha atual.
- Edição preenchendo nova senha alterou a senha.
- Inativação de usuário funcionou.
- `CLIENT_USER` deixou de visualizar telas administrativas no menu.
- `TECHNICIAN` deixou de visualizar telas administrativas no menu.
- `CLIENT_USER` foi redirecionado ao tentar acessar telas administrativas por URL direta.
- `TECHNICIAN` foi redirecionado ao tentar acessar telas administrativas por URL direta.
- `CLIENT_USER` passou a ver somente dados da própria empresa nas telas permitidas.
- `TECHNICIAN` passou a ver somente dados da própria empresa nas telas permitidas.
- `CLIENT_USER` passou a acessar Atendimentos em modo somente consulta.
- `CLIENT_USER` não consegue criar, editar, finalizar, reabrir ou remover atendimentos pela interface.
- Menu mobile continuou funcionando.
- Build e lint validados.

Essa etapa conclui a tela inicial de gestão de usuários e o controle de acesso inicial no frontend.

### Ajuste de hierarquia do administrador master

Foi adicionada uma proteção inicial no frontend para preservar a hierarquia do `MASTER_ADMIN`.

Regras aplicadas na interface:

- Deve existir apenas um usuário `MASTER_ADMIN`.
- Não é permitido criar outro usuário com perfil `MASTER_ADMIN`.
- Não é permitido promover outro usuário para `MASTER_ADMIN`.
- `SUPERVISOR` não pode editar o usuário `MASTER_ADMIN`.
- `SUPERVISOR` não pode inativar o usuário `MASTER_ADMIN`.
- Na visão do `SUPERVISOR`, a linha do `MASTER_ADMIN` aparece como protegida.
- O próprio `MASTER_ADMIN` não pode inativar seu usuário logado.
- O `MASTER_ADMIN` pode criar, editar e inativar usuários `SUPERVISOR`, `CLIENT_USER` e `TECHNICIAN`.

Arquivos alterados:

- `frontend/src/pages/Users/Users.tsx`
- `frontend/src/pages/Users/Users.css`

Decisão técnica:

- Essa proteção ainda é inicial e aplicada no frontend.
- A proteção definitiva será implementada no backend na próxima etapa.
- O backend deverá impedir criação de outro `MASTER_ADMIN`, alteração indevida de perfil e inativação do usuário master por chamadas diretas via API.

### Proteção da hierarquia do administrador master no backend

Foi adicionada proteção real no backend para preservar a hierarquia do `MASTER_ADMIN`.

Arquivos criados:

- `backend/src/auth/decorators/roles.decorator.ts`
- `backend/src/auth/guards/roles.guard.ts`

Arquivos alterados:

- `backend/src/auth/auth.module.ts`
- `backend/src/users/users.controller.ts`
- `backend/src/users/users.service.ts`

Regras implementadas no backend:

- Apenas `MASTER_ADMIN` e `SUPERVISOR` podem acessar rotas de gestão de usuários.
- Não é permitido criar outro usuário com perfil `MASTER_ADMIN`.
- Não é permitido promover outro usuário para `MASTER_ADMIN`.
- O usuário `MASTER_ADMIN` principal não pode perder o perfil master.
- O usuário `MASTER_ADMIN` principal não pode ser inativado ou bloqueado.
- O `SUPERVISOR` não pode editar o usuário `MASTER_ADMIN`.
- O `SUPERVISOR` não pode inativar o usuário `MASTER_ADMIN`.
- O usuário logado não pode inativar o próprio cadastro.
- `MASTER_ADMIN` pode criar, editar e inativar usuários `SUPERVISOR`, `CLIENT_USER` e `TECHNICIAN`.
- `SUPERVISOR` pode criar, editar e inativar usuários comuns, mas não pode afetar o `MASTER_ADMIN`.

Testes realizados:

- Tentativa de criar outro `MASTER_ADMIN` via interface foi bloqueada.
- Tentativa de criar outro `MASTER_ADMIN` via API direta foi bloqueada.
- Tentativa de promover usuário comum para `MASTER_ADMIN` foi bloqueada.
- Tentativa de inativar o próprio `MASTER_ADMIN` via API direta foi bloqueada.
- `SUPERVISOR` não conseguiu editar o `MASTER_ADMIN`.
- `SUPERVISOR` não conseguiu inativar o `MASTER_ADMIN`.
- `MASTER_ADMIN` continuou conseguindo gerenciar usuários comuns.
- Build do backend validado.

Decisão técnica:

- A hierarquia do administrador master agora está protegida no frontend e no backend.
- Essa correção evita que a segurança dependa apenas da interface.
- A próxima etapa será expandir o controle real do backend para escopo por perfil e empresa em todas as rotas operacionais.


-----------TOKEN CLIENTE----------------------
CLIENT_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"francisco@artech.com","password":"12345678"}' \
  | node -e 'let data=""; process.stdin.on("data", c => data += c); process.stdin.on("end", () => { const response = JSON.parse(data); if (!response.accessToken) { console.error(data); process.exit(1); } console.log(response.accessToken); });')

## 45. Proteção real de empresas no backend

Foi iniciada a proteção real do backend por perfil e escopo de empresa.

Arquivos alterados:

- `backend/src/companies/companies.controller.ts`
- `backend/src/companies/companies.service.ts`

Regras implementadas:

- `MASTER_ADMIN` e `SUPERVISOR` podem criar, listar, visualizar, editar e inativar empresas.
- `CLIENT_USER` não pode criar, editar ou inativar empresas.
- `TECHNICIAN` não pode criar, editar ou inativar empresas.
- `CLIENT_USER` pode consultar `GET /companies`, mas recebe somente a empresa vinculada ao próprio usuário.
- `TECHNICIAN` pode consultar `GET /companies`, mas recebe somente a empresa vinculada ao próprio usuário.
- `CLIENT_USER` e `TECHNICIAN` não podem acessar empresa diferente da sua pelo `GET /companies/:id`.

Decisão técnica:

- O backend não confia no `companyId` enviado pelo frontend para usuários com escopo de empresa.
- Usuários `CLIENT_USER` e `TECHNICIAN` são tratados como usuários com escopo restrito à própria empresa.
- `MASTER_ADMIN` e `SUPERVISOR` continuam com visão global.

Testes realizados:

- `MASTER_ADMIN` continuou acessando empresas normalmente.
- `CLIENT_USER` recebeu somente a própria empresa em `GET /companies`.
- `TECHNICIAN` recebeu somente a própria empresa em `GET /companies`.
- `CLIENT_USER` foi bloqueado ao tentar criar empresa via API.
- `TECHNICIAN` foi bloqueado ao tentar criar empresa via API.
- Build do backend validado.

## 46. Proteção real de salas no backend

Foi implementada a proteção real da rota de salas no backend.

Arquivos alterados:

- `backend/src/rooms/rooms.controller.ts`
- `backend/src/rooms/rooms.service.ts`
- `frontend/src/services/users.ts`

Regras implementadas:

- `MASTER_ADMIN` e `SUPERVISOR` podem listar, visualizar, criar, editar e inativar salas.
- `CLIENT_USER` pode visualizar somente salas da própria empresa.
- `TECHNICIAN` pode visualizar somente salas da própria empresa.
- `CLIENT_USER` não pode criar, editar ou inativar salas.
- `TECHNICIAN` não pode criar, editar ou inativar salas.
- Quando `CLIENT_USER` ou `TECHNICIAN` envia `companyId` de outra empresa na query, o backend ignora esse valor e usa a empresa vinculada ao usuário logado.
- `GET /rooms/:id` bloqueia acesso caso a sala pertença a outra empresa.

Correção complementar no frontend:

- Após a proteção real de `/users`, telas como Chamados e Atendimentos estavam tentando buscar `GET /users` com usuários sem permissão.
- O serviço `frontend/src/services/users.ts` foi ajustado para que `CLIENT_USER` e `TECHNICIAN` não chamem mais `/users`.
- Para usuários não administrativos, o frontend usa o próprio usuário autenticado salvo localmente.

Testes realizados:

- `MASTER_ADMIN` continuou acessando salas normalmente.
- `CLIENT_USER` recebeu somente salas da própria empresa em `GET /rooms`.
- `TECHNICIAN` recebeu somente salas da própria empresa em `GET /rooms`.
- Tentativa de forçar `companyId` de outra empresa foi ignorada para usuários com escopo restrito.
- `CLIENT_USER` foi bloqueado ao tentar criar sala via API.
- `TECHNICIAN` foi bloqueado ao tentar criar sala via API.
- Chamados e Atendimentos voltaram a funcionar para usuários não administrativos.
- Build do backend validado.
- Lint e build do frontend validados.

## 47. Proteção real de equipamentos no backend

Foi implementada a proteção real da rota de equipamentos no backend.

Arquivos alterados:

- `backend/src/equipments/equipments.controller.ts`
- `backend/src/equipments/equipments.service.ts`

Regras implementadas:

- `MASTER_ADMIN` e `SUPERVISOR` podem listar, visualizar, criar, editar e inativar equipamentos.
- `CLIENT_USER` pode visualizar somente equipamentos da própria empresa.
- `TECHNICIAN` pode visualizar somente equipamentos da própria empresa.
- `CLIENT_USER` não pode criar, editar ou inativar equipamentos.
- `TECHNICIAN` não pode criar, editar ou inativar equipamentos.
- Quando `CLIENT_USER` ou `TECHNICIAN` envia `companyId` de outra empresa na query, o backend ignora esse valor e usa a empresa vinculada ao usuário logado.
- Quando `CLIENT_USER` ou `TECHNICIAN` tenta consultar equipamentos por `roomId`, o backend valida se a sala pertence à empresa do usuário logado.
- `GET /equipments/:id` bloqueia acesso caso o equipamento pertença a outra empresa.

Testes realizados:

- `MASTER_ADMIN` continuou acessando equipamentos normalmente.
- `CLIENT_USER` recebeu somente equipamentos da própria empresa em `GET /equipments`.
- `TECHNICIAN` recebeu somente equipamentos da própria empresa em `GET /equipments`.
- Tentativa de forçar `companyId` de outra empresa foi ignorada para usuários com escopo restrito.
- `CLIENT_USER` foi bloqueado ao tentar criar equipamento via API.
- `TECHNICIAN` foi bloqueado ao tentar criar equipamento via API.
- Build do backend validado.

## 48. Proteção real de sensores no backend

Foi implementada a proteção real da rota de sensores no backend.

Arquivos alterados:

- `backend/src/sensors/sensors.controller.ts`
- `backend/src/sensors/sensors.service.ts`
- `frontend/src/services/sensors.ts`

Regras implementadas:

- `MASTER_ADMIN` e `SUPERVISOR` podem listar, visualizar, criar, editar e inativar sensores.
- `CLIENT_USER` pode visualizar somente sensores da própria empresa.
- `CLIENT_USER` não pode criar, editar ou inativar sensores.
- `TECHNICIAN` não pode acessar sensores.
- Quando `CLIENT_USER` envia `companyId` de outra empresa na query, o backend ignora esse valor e usa a empresa vinculada ao usuário logado.
- Quando `CLIENT_USER` tenta consultar sensores por `roomId`, o backend valida se a sala pertence à empresa do usuário logado.
- `GET /sensors/:id` bloqueia acesso caso o sensor pertença a outra empresa.
- `TECHNICIAN` recebe `403 Forbidden` ao tentar acessar `GET /sensors`.
- `TECHNICIAN` recebe `403 Forbidden` ao tentar criar sensores.

Correção complementar no frontend:

- Após a proteção real de `/sensors`, a tela de Leituras quebrou para `TECHNICIAN`, porque ainda tentava carregar sensores para o filtro.
- O serviço `frontend/src/services/sensors.ts` foi ajustado para que `TECHNICIAN` não chame mais `/sensors`.
- Para `TECHNICIAN`, `getSensors()` retorna lista vazia.
- A tela de Leituras continua funcionando para técnico, apenas sem opções de sensor no filtro/cadastro manual.

Testes realizados:

- `MASTER_ADMIN` continuou acessando sensores normalmente.
- `SUPERVISOR` continuou acessando sensores normalmente.
- `CLIENT_USER` recebeu somente sensores da própria empresa em `GET /sensors`.
- Tentativa de forçar `companyId` de outra empresa foi ignorada para `CLIENT_USER`.
- `CLIENT_USER` foi bloqueado ao tentar criar sensor via API.
- `TECHNICIAN` foi bloqueado ao tentar listar sensores via API.
- `TECHNICIAN` foi bloqueado ao tentar criar sensor via API.
- Tela de Leituras voltou a funcionar para `TECHNICIAN`.
- Build do backend validado.
- Lint e build do frontend validados.

## 49. Proteção real de leituras de temperatura no backend

Foi implementada a proteção real da rota de leituras de temperatura das salas no backend.

Arquivos alterados:

- `backend/src/temperature-readings/temperature-readings.controller.ts`
- `backend/src/temperature-readings/temperature-readings.service.ts`

Regras implementadas:

- `MASTER_ADMIN` e `SUPERVISOR` podem listar leituras de todas as empresas.
- `MASTER_ADMIN` e `SUPERVISOR` podem criar leituras para qualquer empresa, sala e sensor válido.
- `CLIENT_USER` pode visualizar somente leituras da própria empresa.
- `CLIENT_USER` não pode criar leituras de temperatura.
- `TECHNICIAN` pode visualizar somente leituras da própria empresa.
- `TECHNICIAN` pode criar leitura manual somente para sala da própria empresa.
- `TECHNICIAN` não pode criar leitura vinculada a sensor.
- `TECHNICIAN` não pode criar leitura para outra empresa.
- Quando `CLIENT_USER` ou `TECHNICIAN` envia `companyId` de outra empresa na query, o backend ignora esse valor e usa a empresa vinculada ao usuário logado.
- `GET /temperature-readings/:id` bloqueia acesso caso a leitura pertença a outra empresa.

Regras de integridade mantidas:

- A leitura atualiza a temperatura atual da sala.
- A leitura recalcula o status térmico da sala.
- A leitura pode gerar alerta térmico crítico.
- A leitura normal pode resolver alertas térmicos abertos ou reconhecidos.
- Quando existe `sensorId`, o sensor é atualizado com última temperatura, última umidade e última comunicação.
- Sensor informado precisa pertencer à sala e empresa da leitura.

Testes realizados:

- `MASTER_ADMIN` continuou acessando leituras normalmente.
- `SUPERVISOR` continuou acessando leituras normalmente.
- `CLIENT_USER` recebeu somente leituras da própria empresa em `GET /temperature-readings`.
- `TECHNICIAN` recebeu somente leituras da própria empresa em `GET /temperature-readings`.
- Tentativa de forçar `companyId` de outra empresa foi ignorada para usuários com escopo restrito.
- `CLIENT_USER` foi bloqueado ao tentar criar leitura via API.
- `TECHNICIAN` conseguiu criar leitura manual para sala da própria empresa.
- `TECHNICIAN` foi bloqueado ao tentar criar leitura em outra empresa.
- `TECHNICIAN` foi bloqueado ao tentar criar leitura vinculada a sensor.
- Build do backend validado.

## 50. Proteção real de leituras manuais de equipamentos no backend

Foi implementada a proteção real da rota de leituras manuais de equipamentos no backend.

Arquivos alterados:

- `backend/src/equipment-temperature-readings/equipment-temperature-readings.controller.ts`
- `backend/src/equipment-temperature-readings/equipment-temperature-readings.service.ts`

Regras implementadas:

- `MASTER_ADMIN` e `SUPERVISOR` podem listar leituras manuais de equipamentos de todas as empresas.
- `MASTER_ADMIN` e `SUPERVISOR` podem criar leitura manual para qualquer equipamento válido.
- `CLIENT_USER` não pode acessar leituras manuais de equipamentos.
- `CLIENT_USER` não pode criar leituras manuais de equipamentos.
- `TECHNICIAN` pode listar somente leituras manuais de equipamentos da própria empresa.
- `TECHNICIAN` pode criar leitura manual somente para equipamento da própria empresa.
- `TECHNICIAN` não pode criar leitura para equipamento de outra empresa.
- Quando `TECHNICIAN` envia `companyId` de outra empresa na query, o backend ignora esse valor e usa a empresa vinculada ao usuário logado.
- `GET /equipment-temperature-readings/:id` bloqueia acesso caso a leitura pertença a outra empresa.

Regras de integridade mantidas:

- A leitura manual atualiza a temperatura atual do equipamento.
- A leitura salva o usuário autenticado em `createdByUserId`.
- O equipamento informado precisa pertencer à empresa da leitura.
- A sala da leitura é herdada do próprio equipamento.

Testes realizados:

- `MASTER_ADMIN` continuou acessando leituras manuais de equipamentos normalmente.
- `SUPERVISOR` continuou acessando leituras manuais de equipamentos normalmente.
- `CLIENT_USER` foi bloqueado ao tentar listar leituras manuais de equipamentos via API.
- `CLIENT_USER` foi bloqueado ao tentar criar leitura manual de equipamento via API.
- `TECHNICIAN` recebeu somente leituras manuais de equipamentos da própria empresa.
- Tentativa de forçar `companyId` de outra empresa foi ignorada para `TECHNICIAN`.
- `TECHNICIAN` conseguiu criar leitura manual para equipamento da própria empresa.
- `TECHNICIAN` foi bloqueado ao tentar criar leitura manual para equipamento de outra empresa.
- Build do backend validado.

## 51. Proteção real de tarefas/chamados no backend

Foi implementada a proteção real da rota de tarefas/chamados no backend.

Arquivos alterados:

- `backend/src/tasks/tasks.controller.ts`
- `backend/src/tasks/tasks.service.ts`

Regras implementadas:

- `MASTER_ADMIN` e `SUPERVISOR` podem listar tarefas de todas as empresas.
- `MASTER_ADMIN` e `SUPERVISOR` podem criar, editar e inativar tarefas.
- `CLIENT_USER` não pode acessar tarefas/chamados.
- `CLIENT_USER` não pode criar tarefas/chamados.
- `TECHNICIAN` pode listar somente tarefas da própria empresa.
- `TECHNICIAN` pode criar tarefas somente para a própria empresa.
- `TECHNICIAN` pode editar tarefas somente da própria empresa.
- `TECHNICIAN` pode inativar tarefas somente da própria empresa.
- Quando `TECHNICIAN` envia `companyId` de outra empresa na query, o backend ignora esse valor e usa a empresa vinculada ao usuário logado.
- `GET /tasks/:id`, `PATCH /tasks/:id` e `DELETE /tasks/:id` bloqueiam acesso caso a tarefa pertença a outra empresa.

Regras de integridade mantidas:

- A tarefa precisa pertencer a uma empresa existente.
- Sala informada precisa pertencer à empresa da tarefa.
- Equipamento informado precisa pertencer à empresa e, quando houver sala informada, também à sala da tarefa.
- Responsável informado precisa estar ativo e pertencer à empresa da tarefa ou ser usuário administrativo sem empresa.
- Ao marcar tarefa como `DONE`, o backend preenche `completedAt`.
- Ao mudar tarefa de `DONE` para outro status, o backend limpa `completedAt`.

Testes realizados:

- `MASTER_ADMIN` continuou acessando tarefas normalmente.
- `SUPERVISOR` continuou acessando tarefas normalmente.
- `CLIENT_USER` foi bloqueado ao tentar listar tarefas via API.
- `CLIENT_USER` foi bloqueado ao tentar criar tarefa via API.
- `TECHNICIAN` recebeu somente tarefas da própria empresa.
- Tentativa de forçar `companyId` de outra empresa foi ignorada para `TECHNICIAN`.
- `TECHNICIAN` conseguiu criar tarefa para a própria empresa.
- `TECHNICIAN` foi bloqueado ao tentar criar tarefa para outra empresa.
- Build do backend validado.

## 52. Proteção real de atendimentos técnicos no backend

Foi implementada a proteção real da rota de atendimentos técnicos no backend.

Arquivos alterados:

- `backend/src/service-records/service-records.controller.ts`
- `backend/src/service-records/service-records.service.ts`
- `frontend/src/services/tasks.ts`

Regras implementadas:

- `MASTER_ADMIN` e `SUPERVISOR` podem listar atendimentos de todas as empresas.
- `MASTER_ADMIN` e `SUPERVISOR` podem criar, editar, finalizar, reabrir e inativar atendimentos.
- `CLIENT_USER` pode visualizar somente atendimentos da própria empresa.
- `CLIENT_USER` não pode criar, editar, finalizar, reabrir ou inativar atendimentos.
- `TECHNICIAN` pode visualizar somente atendimentos da própria empresa.
- `TECHNICIAN` pode criar atendimento somente para tarefa da própria empresa.
- `TECHNICIAN` pode editar, finalizar, reabrir e inativar atendimento somente da própria empresa.
- Quando `CLIENT_USER` ou `TECHNICIAN` envia `companyId` de outra empresa na query, o backend ignora esse valor e usa a empresa vinculada ao usuário logado.
- `GET /service-records/:id`, `PATCH /service-records/:id` e `DELETE /service-records/:id` bloqueiam acesso caso o atendimento pertença a outra empresa.

Correção complementar no frontend:

- Após a proteção real de `/tasks`, a tela de Atendimentos quebrou para `CLIENT_USER`, porque ainda tentava carregar tarefas para filtros/formulários.
- O serviço `frontend/src/services/tasks.ts` foi ajustado para que `CLIENT_USER` não chame mais `/tasks`.
- Para `CLIENT_USER`, `getTasks()` retorna lista vazia.
- A tela de Atendimentos voltou a funcionar para cliente em modo somente consulta.

Regras de integridade mantidas:

- Um atendimento sempre pertence a uma tarefa existente.
- Não é possível iniciar atendimento em tarefa cancelada.
- Uma tarefa não pode ter mais de um atendimento ativo/vinculado.
- Ao criar atendimento, a tarefa muda para `IN_PROGRESS` ou `DONE`, dependendo de `finishedAt`.
- Ao finalizar atendimento, o backend calcula `downtimeMinutes`.
- Ao reabrir atendimento, o backend atualiza a tarefa novamente para `IN_PROGRESS`.
- Ao remover atendimento, a tarefa volta para `OPEN`.
- Técnico informado precisa estar ativo e pertencer à empresa do atendimento ou ser usuário administrativo sem empresa.

Testes realizados:

- `MASTER_ADMIN` continuou acessando atendimentos normalmente.
- `SUPERVISOR` continuou acessando atendimentos normalmente.
- `CLIENT_USER` recebeu somente atendimentos da própria empresa.
- `CLIENT_USER` foi bloqueado ao tentar criar atendimento via API.
- `TECHNICIAN` recebeu somente atendimentos da própria empresa.
- Tentativa de forçar `companyId` de outra empresa foi ignorada para usuários com escopo restrito.
- `TECHNICIAN` conseguiu criar atendimento para tarefa da própria empresa.
- `TECHNICIAN` foi bloqueado ao tentar criar atendimento para tarefa de outra empresa.
- Tela de Atendimentos voltou a funcionar para `CLIENT_USER`.
- Build do backend validado.
- Lint e build do frontend validados.

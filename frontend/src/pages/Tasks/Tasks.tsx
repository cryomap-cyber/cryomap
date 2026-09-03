import { type FormEvent, useEffect, useMemo, useState } from 'react';

import { EmptyState } from '../../components/Feedback/EmptyState';
import { LoadingState } from '../../components/Feedback/LoadingState';
import { getCompanies } from '../../services/companies';
import { getEquipments } from '../../services/equipments';
import { getRooms } from '../../services/rooms';
import {
  createTask,
  getTasks,
  inactivateTask,
  updateTask,
  type CreateTaskPayload,
  type UpdateTaskPayload,
} from '../../services/tasks';
import { getUsers } from '../../services/users';
import type { Company } from '../../types/company';
import type { Equipment } from '../../types/equipment';
import type { Room } from '../../types/room';
import type {
  Task,
  TaskOrigin,
  TaskPriority,
  TaskStatus,
} from '../../types/task';
import type { User } from '../../types/user';
import './Tasks.css';

type TaskFormData = {
  companyId: string;
  roomId: string;
  equipmentId: string;
  assignedToUserId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  origin: TaskOrigin;
  externalCode: string;
  externalUrl: string;
  dueDate: string;
};

type ActiveFilter = {
  label: string;
  value: string;
};

const emptyFormData: TaskFormData = {
  companyId: '',
  roomId: '',
  equipmentId: '',
  assignedToUserId: '',
  title: '',
  description: '',
  priority: 'MEDIUM',
  status: 'OPEN',
  origin: 'CRYOMAP',
  externalCode: '',
  externalUrl: '',
  dueDate: '',
};

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(emptyFormData);

  async function handleRefresh() {
    setError('');
    setIsLoading(true);

    try {
      const [companiesData, roomsData, equipmentsData, usersData, tasksData] =
        await Promise.all([
          getCompanies(),
          getRooms(selectedCompanyId || undefined),
          getEquipments({
            companyId: selectedCompanyId || undefined,
            roomId: selectedRoomId || undefined,
          }),
          getUsers({
            companyId: selectedCompanyId || undefined,
          }),
          getTasks({
            companyId: selectedCompanyId || undefined,
            roomId: selectedRoomId || undefined,
            equipmentId: selectedEquipmentId || undefined,
            status: selectedStatus ? (selectedStatus as TaskStatus) : undefined,
            priority: selectedPriority
              ? (selectedPriority as TaskPriority)
              : undefined,
            origin: selectedOrigin ? (selectedOrigin as TaskOrigin) : undefined,
          }),
        ]);

      setCompanies(companiesData);
      setRooms(roomsData);
      setEquipments(equipmentsData);
      setUsers(usersData);
      setTasks(tasksData);
    } catch {
      setError('Não foi possível carregar as tarefas.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleClearFilters() {
    setSelectedCompanyId('');
    setSelectedRoomId('');
    setSelectedEquipmentId('');
    setSelectedStatus('');
    setSelectedPriority('');
    setSelectedOrigin('');
    setSearch('');
    setError('');
  }

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getCompanies(),
      getRooms(),
      getEquipments(),
      getUsers(),
      getTasks(),
    ])
      .then(
        ([
          companiesData,
          roomsData,
          equipmentsData,
          usersData,
          tasksData,
        ]) => {
          if (!isMounted) {
            return;
          }

          setCompanies(companiesData);
          setRooms(roomsData);
          setEquipments(equipmentsData);
          setUsers(usersData);
          setTasks(tasksData);
        },
      )
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível carregar as tarefas.');
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getRooms(selectedCompanyId || undefined),
      getEquipments({
        companyId: selectedCompanyId || undefined,
        roomId: selectedRoomId || undefined,
      }),
      getUsers({
        companyId: selectedCompanyId || undefined,
      }),
      getTasks({
        companyId: selectedCompanyId || undefined,
        roomId: selectedRoomId || undefined,
        equipmentId: selectedEquipmentId || undefined,
        status: selectedStatus ? (selectedStatus as TaskStatus) : undefined,
        priority: selectedPriority
          ? (selectedPriority as TaskPriority)
          : undefined,
        origin: selectedOrigin ? (selectedOrigin as TaskOrigin) : undefined,
      }),
    ])
      .then(([roomsData, equipmentsData, usersData, tasksData]) => {
        if (!isMounted) {
          return;
        }

        setError('');
        setRooms(roomsData);
        setEquipments(equipmentsData);
        setUsers(usersData);
        setTasks(tasksData);

        if (
          selectedRoomId &&
          !roomsData.some((room) => room.id === selectedRoomId)
        ) {
          setSelectedRoomId('');
        }

        if (
          selectedEquipmentId &&
          !equipmentsData.some(
            (equipment) => equipment.id === selectedEquipmentId,
          )
        ) {
          setSelectedEquipmentId('');
        }
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível filtrar as tarefas.');
      });

    return () => {
      isMounted = false;
    };
  }, [
    selectedCompanyId,
    selectedRoomId,
    selectedEquipmentId,
    selectedStatus,
    selectedPriority,
    selectedOrigin,
  ]);

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return tasks;
    }

    return tasks.filter((task) => {
      return [
        task.title,
        task.description ?? '',
        task.company?.name ?? '',
        task.room?.name ?? '',
        task.equipment?.name ?? '',
        task.equipment?.code ?? '',
        task.assignedToUser?.name ?? '',
        task.assignedToUser?.email ?? '',
        task.status,
        task.priority,
        task.origin,
        formatTaskOrigin(task.origin),
        task.externalCode ?? '',
        task.externalUrl ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [tasks, search]);

  const activeFilters = useMemo(() => {
    const filters: ActiveFilter[] = [];

    const selectedCompany = companies.find(
      (company) => company.id === selectedCompanyId,
    );
    const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
    const selectedEquipment = equipments.find(
      (equipment) => equipment.id === selectedEquipmentId,
    );

    if (selectedCompany) {
      filters.push({
        label: 'Empresa',
        value: selectedCompany.name,
      });
    }

    if (selectedRoom) {
      filters.push({
        label: 'Sala',
        value: selectedRoom.name,
      });
    }

    if (selectedEquipment) {
      filters.push({
        label: 'Equipamento',
        value: selectedEquipment.name,
      });
    }

    if (selectedStatus) {
      filters.push({
        label: 'Status',
        value: formatTaskStatus(selectedStatus as TaskStatus),
      });
    }

    if (selectedPriority) {
      filters.push({
        label: 'Prioridade',
        value: formatTaskPriority(selectedPriority as TaskPriority),
      });
    }

    if (selectedOrigin) {
      filters.push({
        label: 'Origem',
        value: formatTaskOrigin(selectedOrigin as TaskOrigin),
      });
    }

    if (search.trim()) {
      filters.push({
        label: 'Busca',
        value: search.trim(),
      });
    }

    return filters;
  }, [
    companies,
    equipments,
    rooms,
    search,
    selectedCompanyId,
    selectedEquipmentId,
    selectedOrigin,
    selectedPriority,
    selectedRoomId,
    selectedStatus,
  ]);

  const formRooms = useMemo(() => {
    if (!formData.companyId) {
      return rooms;
    }

    return rooms.filter((room) => room.companyId === formData.companyId);
  }, [rooms, formData.companyId]);

  const formEquipments = useMemo(() => {
    return equipments.filter((equipment) => {
      if (formData.companyId && equipment.companyId !== formData.companyId) {
        return false;
      }

      if (formData.roomId && equipment.roomId !== formData.roomId) {
        return false;
      }

      return true;
    });
  }, [equipments, formData.companyId, formData.roomId]);

  const formUsers = useMemo(() => {
    return users.filter((user) => {
      if (user.status !== 'ACTIVE') {
        return false;
      }

      if (!formData.companyId) {
        return true;
      }

      if (!user.companyId) {
        return true;
      }

      return user.companyId === formData.companyId;
    });
  }, [users, formData.companyId]);

  const openTasks = tasks.filter((task) => task.status === 'OPEN').length;

  const inProgressTasks = tasks.filter(
    (task) => task.status === 'IN_PROGRESS',
  ).length;

  const doneTasks = tasks.filter((task) => task.status === 'DONE').length;

  const overdueTasks = tasks.filter(
    (task) => task.status === 'OVERDUE',
  ).length;

  const externalTasks = tasks.filter(
    (task) => task.origin === 'AUVO' || task.origin === 'OTHER',
  ).length;

  function openCreateForm() {
    setEditingTask(null);
    setFormData({
      ...emptyFormData,
      companyId: selectedCompanyId,
      roomId: selectedRoomId,
      equipmentId: selectedEquipmentId,
      origin: selectedOrigin ? (selectedOrigin as TaskOrigin) : 'CRYOMAP',
    });
    setFormError('');
    setIsFormOpen(true);
  }

  function openEditForm(task: Task) {
    setEditingTask(task);
    setFormData({
      companyId: task.companyId,
      roomId: task.roomId ?? '',
      equipmentId: task.equipmentId ?? '',
      assignedToUserId: task.assignedToUserId ?? '',
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      status: task.status,
      origin: task.origin ?? 'CRYOMAP',
      externalCode: task.externalCode ?? '',
      externalUrl: task.externalUrl ?? '',
      dueDate: formatDateTimeInput(task.dueDate),
    });
    setFormError('');
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setEditingTask(null);
    setFormData(emptyFormData);
    setFormError('');
  }

  function updateFormField(field: keyof TaskFormData, value: string) {
    setFormData((current) => {
      const nextFormData = {
        ...current,
        [field]: value,
      } as TaskFormData;

      if (field === 'companyId') {
        nextFormData.roomId = '';
        nextFormData.equipmentId = '';
        nextFormData.assignedToUserId = '';
      }

      if (field === 'roomId') {
        nextFormData.equipmentId = '';
      }

      if (field === 'origin' && value === 'CRYOMAP') {
        nextFormData.externalCode = '';
        nextFormData.externalUrl = '';
      }

      return nextFormData;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError('');

    if (!formData.companyId) {
      setFormError('Selecione a empresa da tarefa.');
      return;
    }

    if (formData.title.trim().length < 2) {
      setFormError('Informe um título com pelo menos 2 caracteres.');
      return;
    }

    setIsSaving(true);

    try {
      if (editingTask) {
        const updatePayload: UpdateTaskPayload = {
          companyId: formData.companyId,
          roomId: formData.roomId || null,
          equipmentId: formData.equipmentId || null,
          assignedToUserId: formData.assignedToUserId || null,
          title: formData.title.trim(),
          description: nullableValue(formData.description),
          priority: formData.priority,
          status: formData.status,
          origin: formData.origin,
          externalCode: nullableValue(formData.externalCode),
          externalUrl: nullableValue(formData.externalUrl),
          dueDate: nullableIsoDateTime(formData.dueDate),
        };

        await updateTask(editingTask.id, updatePayload);
      } else {
        const createPayload: CreateTaskPayload = {
          companyId: formData.companyId,
          roomId: optionalValue(formData.roomId),
          equipmentId: optionalValue(formData.equipmentId),
          assignedToUserId: optionalValue(formData.assignedToUserId),
          title: formData.title.trim(),
          description: optionalValue(formData.description),
          priority: formData.priority,
          status: formData.status,
          origin: formData.origin,
          externalCode: optionalValue(formData.externalCode),
          externalUrl: optionalValue(formData.externalUrl),
          dueDate: optionalIsoDateTime(formData.dueDate),
        };

        await createTask(createPayload);
      }

      closeForm();
      await handleRefresh();
    } catch (requestError) {
      setFormError(getRequestErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleInactivate(task: Task) {
    const confirmed = window.confirm(
      `Deseja realmente remover a tarefa "${task.title}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await inactivateTask(task.id);
      await handleRefresh();
    } catch {
      setError('Não foi possível remover a tarefa.');
    }
  }

  if (isLoading) {
    return (
      <LoadingState
        title="Carregando tarefas..."
        description="Buscando chamados e pendências operacionais."
      />
    );
  }

  return (
    <div className="tasks-page">
      <header className="tasks-header">
        <div>
          <span>Operação</span>
          <h1>Tarefas</h1>
          <p>
            Acompanhe tarefas técnicas por empresa, sala, equipamento, origem,
            status e prioridade.
          </p>
        </div>

        <button type="button" onClick={openCreateForm}>
          Nova tarefa
        </button>
      </header>

      <section className="tasks-summary">
        <SummaryCard title="Total" value={tasks.length} />
        <SummaryCard title="Abertas" value={openTasks} />
        <SummaryCard title="Em andamento" value={inProgressTasks} />
        <SummaryCard title="Concluídas" value={doneTasks} />
        <SummaryCard title="Externas" value={externalTasks} />
        <SummaryCard title="Atrasadas" value={overdueTasks} danger />
      </section>

      {isFormOpen ? (
        <section className="task-form-panel">
          <div className="task-form-header">
            <div>
              <span>Tarefa</span>
              <h2>{editingTask ? 'Editar tarefa' : 'Nova tarefa'}</h2>
            </div>

            <button type="button" onClick={closeForm}>
              Fechar
            </button>
          </div>

          <div className="task-form-tip">
            <strong>Fluxo técnico</strong>
            <p>
              Use a tarefa para abrir ou acompanhar o chamado operacional. O
              registro técnico detalhado, tempo parado e finalização operacional
              continuam na tela Atendimentos.
            </p>
          </div>

          <form className="task-form" onSubmit={handleSubmit}>
            <label>
              Empresa *
              <select
                value={formData.companyId}
                onChange={(event) =>
                  updateFormField('companyId', event.target.value)
                }
              >
                <option value="">Selecione uma empresa</option>

                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Sala
              <select
                value={formData.roomId}
                onChange={(event) =>
                  updateFormField('roomId', event.target.value)
                }
              >
                <option value="">Sem sala específica</option>

                {formRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Equipamento
              <select
                value={formData.equipmentId}
                onChange={(event) =>
                  updateFormField('equipmentId', event.target.value)
                }
              >
                <option value="">Sem equipamento específico</option>

                {formEquipments.map((equipment) => (
                  <option key={equipment.id} value={equipment.id}>
                    {equipment.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Responsável
              <select
                value={formData.assignedToUserId}
                onChange={(event) =>
                  updateFormField('assignedToUserId', event.target.value)
                }
              >
                <option value="">Sem responsável definido</option>

                {formUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="task-form-wide">
              Título *
              <input
                value={formData.title}
                onChange={(event) =>
                  updateFormField('title', event.target.value)
                }
                placeholder="Ex: Verificar evaporador da Câmara Fria 01"
              />
            </label>

            <label>
              Prioridade
              <select
                value={formData.priority}
                onChange={(event) =>
                  updateFormField(
                    'priority',
                    event.target.value as TaskPriority,
                  )
                }
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </label>

            <label>
              Status
              <select
                value={formData.status}
                onChange={(event) =>
                  updateFormField('status', event.target.value as TaskStatus)
                }
              >
                <option value="OPEN">Aberta</option>
                <option value="IN_PROGRESS">Em andamento</option>
                <option value="DONE">Concluída</option>
                <option value="CANCELED">Cancelada</option>
                <option value="OVERDUE">Atrasada</option>
              </select>
            </label>

            <label>
              Origem
              <select
                value={formData.origin}
                onChange={(event) =>
                  updateFormField('origin', event.target.value as TaskOrigin)
                }
              >
                <option value="CRYOMAP">CryoMap</option>
                <option value="AUVO">Auvo</option>
                <option value="OTHER">Outro</option>
              </select>
            </label>

            <label>
              Vencimento
              <input
                type="datetime-local"
                value={formData.dueDate}
                onChange={(event) =>
                  updateFormField('dueDate', event.target.value)
                }
              />
            </label>

            <label>
              Código externo
              <input
                value={formData.externalCode}
                disabled={formData.origin === 'CRYOMAP'}
                onChange={(event) =>
                  updateFormField('externalCode', event.target.value)
                }
                placeholder="Ex: AUVO-12345"
              />
            </label>

            <label>
              Link externo
              <input
                value={formData.externalUrl}
                disabled={formData.origin === 'CRYOMAP'}
                onChange={(event) =>
                  updateFormField('externalUrl', event.target.value)
                }
                placeholder="Ex: link da OS no Auvo"
              />
            </label>

            <label className="task-form-wide">
              Descrição
              <textarea
                value={formData.description}
                onChange={(event) =>
                  updateFormField('description', event.target.value)
                }
                placeholder="Descreva a tarefa técnica, ocorrência ou rotina..."
                rows={4}
              />
            </label>

            {formError ? (
              <strong className="task-form-error">{formError}</strong>
            ) : null}

            <div className="task-form-actions">
              <button type="button" onClick={closeForm}>
                Cancelar
              </button>

              <button type="submit" disabled={isSaving}>
                {isSaving
                  ? 'Salvando...'
                  : editingTask
                    ? 'Salvar alterações'
                    : 'Cadastrar tarefa'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="tasks-panel">
        <div className="tasks-panel-header">
          <div>
            <h2>Lista de tarefas</h2>
            <p>
              {filteredTasks.length} registro(s) exibido(s) de {tasks.length}{' '}
              carregado(s)
            </p>
          </div>

          <div className="tasks-actions">
            <label className="tasks-filter-field">
              <span>Empresa</span>
              <select
                value={selectedCompanyId}
                onChange={(event) => {
                  setSelectedCompanyId(event.target.value);
                  setSelectedRoomId('');
                  setSelectedEquipmentId('');
                }}
              >
                <option value="">Todas as empresas</option>

                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="tasks-filter-field">
              <span>Sala</span>
              <select
                value={selectedRoomId}
                onChange={(event) => {
                  setSelectedRoomId(event.target.value);
                  setSelectedEquipmentId('');
                }}
              >
                <option value="">Todas as salas</option>

                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="tasks-filter-field">
              <span>Equipamento</span>
              <select
                value={selectedEquipmentId}
                onChange={(event) => setSelectedEquipmentId(event.target.value)}
              >
                <option value="">Todos os equipamentos</option>

                {equipments.map((equipment) => (
                  <option key={equipment.id} value={equipment.id}>
                    {equipment.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="tasks-filter-field">
              <span>Status</span>
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
              >
                <option value="">Todos os status</option>
                <option value="OPEN">Aberta</option>
                <option value="IN_PROGRESS">Em andamento</option>
                <option value="DONE">Concluída</option>
                <option value="CANCELED">Cancelada</option>
                <option value="OVERDUE">Atrasada</option>
              </select>
            </label>

            <label className="tasks-filter-field">
              <span>Prioridade</span>
              <select
                value={selectedPriority}
                onChange={(event) => setSelectedPriority(event.target.value)}
              >
                <option value="">Todas as prioridades</option>
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </label>

            <label className="tasks-filter-field">
              <span>Origem</span>
              <select
                value={selectedOrigin}
                onChange={(event) => setSelectedOrigin(event.target.value)}
              >
                <option value="">Todas as origens</option>
                <option value="CRYOMAP">CryoMap</option>
                <option value="AUVO">Auvo</option>
                <option value="OTHER">Outro</option>
              </select>
            </label>

            <label className="tasks-filter-field tasks-search-field">
              <span>Busca</span>
              <input
                type="search"
                placeholder="Buscar por título, origem, código externo..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <div className="tasks-action-buttons">
              <button type="button" onClick={() => void handleRefresh()}>
                Aplicar filtros
              </button>

              <button
                type="button"
                className="tasks-secondary-action"
                onClick={handleClearFilters}
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </div>

        <div className="tasks-filter-status">
          <div>
            <strong>Filtros selecionados</strong>
            <span>
              Os filtros principais recarregam a lista. A busca textual filtra
              os registros já carregados.
            </span>
          </div>

          <div className="tasks-filter-chips">
            {activeFilters.length > 0 ? (
              activeFilters.map((filter) => (
                <span key={`${filter.label}-${filter.value}`}>
                  {filter.label}: <strong>{filter.value}</strong>
                </span>
              ))
            ) : (
              <span>Sem filtros específicos</span>
            )}
          </div>
        </div>

        {error ? (
          <div className="tasks-error">
            <strong>{error}</strong>

            <button type="button" onClick={() => void handleRefresh()}>
              Tentar novamente
            </button>
          </div>
        ) : null}

        {!error && filteredTasks.length === 0 ? (
          <EmptyState
            title="Nenhuma tarefa encontrada."
            description="Cadastre uma tarefa ou ajuste os filtros para visualizar resultados."
          />
        ) : null}

        {!error && filteredTasks.length > 0 ? (
          <div className="tasks-table-wrapper">
            <table className="tasks-table">
              <thead>
                <tr>
                  <th>Tarefa</th>
                  <th>Origem</th>
                  <th>Referência externa</th>
                  <th>Empresa</th>
                  <th>Sala</th>
                  <th>Equipamento</th>
                  <th>Responsável</th>
                  <th>Prioridade</th>
                  <th>Status</th>
                  <th>Vencimento</th>
                  <th>Concluída em</th>
                  <th>Criada em</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <strong>{task.title}</strong>
                      <small>{task.description || task.id}</small>
                    </td>

                    <td>
                      <TaskOriginBadge origin={task.origin} />
                    </td>

                    <td>
                      {task.externalCode ? (
                        <strong>{task.externalCode}</strong>
                      ) : (
                        <span>-</span>
                      )}

                      {task.externalUrl ? (
                        <a
                          className="task-external-link"
                          href={task.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir referência
                        </a>
                      ) : null}
                    </td>

                    <td>{task.company?.name ?? task.companyId}</td>

                    <td>{task.room?.name ?? '-'}</td>

                    <td>
                      <span>{task.equipment?.name ?? '-'}</span>

                      {task.equipment?.code ? (
                        <small>{task.equipment.code}</small>
                      ) : null}
                    </td>

                    <td>
                      <span>{task.assignedToUser?.name ?? '-'}</span>

                      {task.assignedToUser?.email ? (
                        <small>{task.assignedToUser.email}</small>
                      ) : null}
                    </td>

                    <td>
                      <TaskPriorityBadge priority={task.priority} />
                    </td>

                    <td>
                      <TaskStatusBadge status={task.status} />
                    </td>

                    <td>{formatDateTime(task.dueDate)}</td>

                    <td>{formatDateTime(task.completedAt)}</td>

                    <td>{formatDate(task.createdAt)}</td>

                    <td>
                      <div className="task-row-actions">
                        <button type="button" onClick={() => openEditForm(task)}>
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleInactivate(task)}
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

type SummaryCardProps = {
  title: string;
  value: number;
  danger?: boolean;
};

function SummaryCard({ title, value, danger = false }: SummaryCardProps) {
  return (
    <article
      className={danger ? 'tasks-summary-card danger' : 'tasks-summary-card'}
    >
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}

type TaskOriginBadgeProps = {
  origin: TaskOrigin;
};

function TaskOriginBadge({ origin }: TaskOriginBadgeProps) {
  return (
    <span className={`task-origin ${origin.toLowerCase()}`}>
      {formatTaskOrigin(origin)}
    </span>
  );
}

type TaskStatusBadgeProps = {
  status: TaskStatus;
};

function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  return (
    <span className={`task-status ${status.toLowerCase().replace('_', '-')}`}>
      {formatTaskStatus(status)}
    </span>
  );
}

type TaskPriorityBadgeProps = {
  priority: TaskPriority;
};

function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  return (
    <span className={`task-priority ${priority.toLowerCase()}`}>
      {formatTaskPriority(priority)}
    </span>
  );
}

function formatTaskOrigin(value: TaskOrigin) {
  const labels: Record<TaskOrigin, string> = {
    CRYOMAP: 'CryoMap',
    AUVO: 'Auvo',
    OTHER: 'Outro',
  };

  return labels[value];
}

function formatTaskStatus(value: TaskStatus) {
  const labels: Record<TaskStatus, string> = {
    OPEN: 'Aberta',
    IN_PROGRESS: 'Em andamento',
    DONE: 'Concluída',
    CANCELED: 'Cancelada',
    OVERDUE: 'Atrasada',
  };

  return labels[value];
}

function formatTaskPriority(value: TaskPriority) {
  const labels: Record<TaskPriority, string> = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
    CRITICAL: 'Crítica',
  };

  return labels[value];
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('pt-BR');
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('pt-BR');
}

function formatDateTimeInput(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);

  return localDate.toISOString().slice(0, 16);
}

function optionalValue(value: string) {
  const normalized = value.trim();

  return normalized || undefined;
}

function nullableValue(value: string) {
  const normalized = value.trim();

  return normalized || null;
}

function optionalIsoDateTime(value: string) {
  if (!value) {
    return undefined;
  }

  return new Date(value).toISOString();
}

function nullableIsoDateTime(value: string) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function getRequestErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response
  ) {
    const data = error.response.data;

    if (typeof data === 'object' && data !== null && 'message' in data) {
      const message = data.message;

      if (typeof message === 'string') {
        return message;
      }

      if (Array.isArray(message)) {
        return message.join(' | ');
      }
    }
  }

  return 'Não foi possível salvar a tarefa.';
}

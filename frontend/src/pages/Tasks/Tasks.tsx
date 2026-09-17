import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Clock3,
  DoorOpen,
  ExternalLink,
  Layers3,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Snowflake,
  Trash2,
  TriangleAlert,
  UserRound,
} from 'lucide-react';

import { CollapsibleSection } from '../../components/CollapsibleSection/CollapsibleSection';
import {
  ActionButton,
  EmptyState,
  InlineNotice,
  LoadingState,
  MetricCard,
  PageHeader,
  StatusBadge,
  type UiTone,
} from '../../components/ui/CryoUi';
import { useAuth } from '../../contexts/useAuth';
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
  const { user } = useAuth();

  const isClientUser = user?.role === 'CLIENT_USER';
  const canManageTasks = !isClientUser;

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
      const [
        companiesData,
        roomsData,
        equipmentsData,
        usersData,
        tasksData,
      ] = await Promise.all([
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
          status: selectedStatus
            ? (selectedStatus as TaskStatus)
            : undefined,
          priority: selectedPriority
            ? (selectedPriority as TaskPriority)
            : undefined,
          origin: selectedOrigin
            ? (selectedOrigin as TaskOrigin)
            : undefined,
        }),
      ]);

      setCompanies(companiesData);
      setRooms(roomsData);
      setEquipments(equipmentsData);
      setUsers(usersData);
      setTasks(tasksData);
    } catch {
      setError('Não foi possível carregar os chamados.');
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

        setError('Não foi possível carregar os chamados.');
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
        status: selectedStatus
          ? (selectedStatus as TaskStatus)
          : undefined,
        priority: selectedPriority
          ? (selectedPriority as TaskPriority)
          : undefined,
        origin: selectedOrigin
          ? (selectedOrigin as TaskOrigin)
          : undefined,
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

        setError('Não foi possível filtrar os chamados.');
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
        task.createdByUser?.name ?? '',
        task.createdByUser?.email ?? '',
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

    const selectedRoom = rooms.find(
      (room) => room.id === selectedRoomId,
    );

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
        value: formatTaskStatus(
          selectedStatus as TaskStatus,
        ),
      });
    }

    if (selectedPriority) {
      filters.push({
        label: 'Prioridade',
        value: formatTaskPriority(
          selectedPriority as TaskPriority,
        ),
      });
    }

    if (selectedOrigin) {
      filters.push({
        label: 'Origem',
        value: formatTaskOrigin(
          selectedOrigin as TaskOrigin,
        ),
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

  const activeFilterCount = activeFilters.length;

  const currentUserCompany = useMemo(() => {
    return (
      companies.find(
        (company) => company.id === user?.companyId,
      ) ?? null
    );
  }, [companies, user?.companyId]);

  const formRooms = useMemo(() => {
    if (!formData.companyId) {
      return rooms;
    }

    return rooms.filter(
      (room) => room.companyId === formData.companyId,
    );
  }, [rooms, formData.companyId]);

  const formEquipments = useMemo(() => {
    return equipments.filter((equipment) => {
      if (
        formData.companyId &&
        equipment.companyId !== formData.companyId
      ) {
        return false;
      }

      if (
        formData.roomId &&
        equipment.roomId !== formData.roomId
      ) {
        return false;
      }

      return true;
    });
  }, [
    equipments,
    formData.companyId,
    formData.roomId,
  ]);

  const formUsers = useMemo(() => {
    return users.filter((userItem) => {
      if (userItem.status !== 'ACTIVE') {
        return false;
      }

      if (!formData.companyId) {
        return true;
      }

      if (!userItem.companyId) {
        return true;
      }

      return userItem.companyId === formData.companyId;
    });
  }, [users, formData.companyId]);

  const openTasks = tasks.filter(
    (task) => task.status === 'OPEN',
  ).length;

  const inProgressTasks = tasks.filter(
    (task) => task.status === 'IN_PROGRESS',
  ).length;

  const doneTasks = tasks.filter(
    (task) => task.status === 'DONE',
  ).length;

  const overdueTasks = tasks.filter(
    (task) => task.status === 'OVERDUE',
  ).length;

  const externalTasks = tasks.filter(
    (task) =>
      task.origin === 'AUVO' ||
      task.origin === 'OTHER',
  ).length;

  function openCreateForm() {
    setEditingTask(null);

    setFormData({
      ...emptyFormData,
      companyId: isClientUser
        ? user?.companyId ?? ''
        : selectedCompanyId,
      roomId: selectedRoomId,
      equipmentId: selectedEquipmentId,
      priority: selectedPriority
        ? normalizeTaskPriority(selectedPriority)
        : 'MEDIUM',
      status: 'OPEN',
      origin: isClientUser
        ? 'CRYOMAP'
        : selectedOrigin
          ? (selectedOrigin as TaskOrigin)
          : 'CRYOMAP',
    });

    setFormError('');
    setIsFormOpen(true);
  }

  function openEditForm(task: Task) {
    if (!canManageTasks) {
      return;
    }

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

  function updateFormField(
    field: keyof TaskFormData,
    value: string,
  ) {
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

      if (
        field === 'origin' &&
        value === 'CRYOMAP'
      ) {
        nextFormData.externalCode = '';
        nextFormData.externalUrl = '';
      }

      if (
        field === 'priority' &&
        isClientUser &&
        value === 'CRITICAL'
      ) {
        nextFormData.priority = 'HIGH';
      }

      return nextFormData;
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setFormError('');

    const companyId = isClientUser
      ? user?.companyId ?? formData.companyId
      : formData.companyId;

    if (!companyId) {
      setFormError(
        isClientUser
          ? 'Seu usuário cliente não está vinculado a uma empresa.'
          : 'Selecione a empresa do chamado.',
      );
      return;
    }

    if (formData.title.trim().length < 2) {
      setFormError(
        'Informe um título com pelo menos 2 caracteres.',
      );
      return;
    }

    if (editingTask && !canManageTasks) {
      setFormError(
        'Usuário cliente não pode editar chamados.',
      );
      return;
    }

    setIsSaving(true);

    try {
      if (editingTask) {
        const updatePayload: UpdateTaskPayload = {
          companyId,
          roomId: formData.roomId || null,
          equipmentId: formData.equipmentId || null,
          assignedToUserId:
            formData.assignedToUserId || null,
          title: formData.title.trim(),
          description: nullableValue(
            formData.description,
          ),
          priority: formData.priority,
          status: formData.status,
          origin: formData.origin,
          externalCode: nullableValue(
            formData.externalCode,
          ),
          externalUrl: nullableValue(
            formData.externalUrl,
          ),
          dueDate: nullableIsoDateTime(
            formData.dueDate,
          ),
        };

        await updateTask(
          editingTask.id,
          updatePayload,
        );
      } else if (isClientUser) {
        const createPayload: CreateTaskPayload = {
          companyId,
          roomId: optionalValue(
            formData.roomId,
          ),
          equipmentId: optionalValue(
            formData.equipmentId,
          ),
          title: formData.title.trim(),
          description: optionalValue(
            formData.description,
          ),
          priority: normalizeClientPriority(
            formData.priority,
          ),
          status: 'OPEN',
          origin: 'CRYOMAP',
        };

        await createTask(createPayload);
      } else {
        const createPayload: CreateTaskPayload = {
          companyId,
          roomId: optionalValue(
            formData.roomId,
          ),
          equipmentId: optionalValue(
            formData.equipmentId,
          ),
          assignedToUserId: optionalValue(
            formData.assignedToUserId,
          ),
          title: formData.title.trim(),
          description: optionalValue(
            formData.description,
          ),
          priority: formData.priority,
          status: formData.status,
          origin: formData.origin,
          externalCode: optionalValue(
            formData.externalCode,
          ),
          externalUrl: optionalValue(
            formData.externalUrl,
          ),
          dueDate: optionalIsoDateTime(
            formData.dueDate,
          ),
        };

        await createTask(createPayload);
      }

      closeForm();
      await handleRefresh();
    } catch (requestError) {
      setFormError(
        getRequestErrorMessage(requestError),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleInactivate(task: Task) {
    if (!canManageTasks) {
      return;
    }

    const confirmed = window.confirm(
      `Deseja realmente remover o chamado "${task.title}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await inactivateTask(task.id);
      await handleRefresh();
    } catch {
      setError(
        'Não foi possível remover o chamado.',
      );
    }
  }

  if (isLoading) {
    return (
      <LoadingState
        title="Carregando chamados"
        description="Buscando chamados e pendências operacionais."
      />
    );
  }

  const isTechnician = user?.role === 'TECHNICIAN';
  const pageTitle = isClientUser
    ? 'Meus chamados'
    : isTechnician
      ? 'Tarefas'
      : 'Chamados';
  const createLabel = isClientUser
    ? 'Abrir chamado'
    : isTechnician
      ? 'Nova tarefa'
      : 'Novo chamado';

  return (
    <div className="tasks-page">
      <PageHeader
        eyebrow="Operação"
        title={pageTitle}
        description={
          isClientUser
            ? 'Abra solicitações para sua empresa e acompanhe o andamento do atendimento técnico.'
            : isTechnician
              ? 'Acompanhe as tarefas operacionais, prioridades, vencimentos e responsáveis.'
              : 'Acompanhe chamados técnicos por empresa, local, equipamento, origem, status e prioridade.'
        }
        icon={ClipboardList}
        actions={
          <ActionButton
            type="button"
            variant="primary"
            icon={Plus}
            onClick={openCreateForm}
          >
            {createLabel}
          </ActionButton>
        }
      />

      <CollapsibleSection
        title="Resumo dos chamados"
        openDescription="Indicadores gerais da operação estão visíveis."
        closedDescription="Indicadores gerais estão ocultos para liberar espaço na tela."
        openLabel="Ocultar resumo"
        closedLabel="Mostrar resumo"
        storageKey="cryomap.tasks.summary-open"
        defaultOpen
        defaultOpenOnMobile={false}
        className="tasks-summary-disclosure"
        contentClassName="tasks-summary"
        variant="section"
      >
        <MetricCard
          label="Total"
          value={tasks.length}
          detail="Chamados carregados"
          icon={Layers3}
          tone="info"
        />

        <MetricCard
          label="Abertos"
          value={openTasks}
          detail="Aguardando andamento"
          icon={CircleDot}
          tone="info"
        />

        <MetricCard
          label="Em andamento"
          value={inProgressTasks}
          detail="Em atendimento"
          icon={Clock3}
          tone={inProgressTasks > 0 ? 'warning' : 'neutral'}
        />

        <MetricCard
          label="Concluídos"
          value={doneTasks}
          detail="Finalizados"
          icon={CheckCircle2}
          tone="success"
        />

        <MetricCard
          label="Externos"
          value={externalTasks}
          detail="Auvo ou outra origem"
          icon={ExternalLink}
          tone={externalTasks > 0 ? 'warning' : 'neutral'}
        />

        <MetricCard
          label="Atrasados"
          value={overdueTasks}
          detail="Vencimento excedido"
          icon={TriangleAlert}
          tone={overdueTasks > 0 ? 'danger' : 'success'}
        />
      </CollapsibleSection>

      {isFormOpen ? (
        <section className="task-form-panel">
          <div className="task-form-header">
            <div>
              <span>
                {isClientUser
                  ? 'Solicitação'
                  : 'Chamado'}
              </span>

              <h2>
                {editingTask
                  ? 'Editar chamado'
                  : isClientUser
                    ? 'Abrir chamado'
                    : 'Novo chamado'}
              </h2>
            </div>

            <button
              type="button"
              onClick={closeForm}
            >
              Fechar
            </button>
          </div>

          <div className="task-form-tip">
            <strong>
              {isClientUser
                ? 'Solicitação do cliente'
                : 'Fluxo técnico'}
            </strong>

            <p>
              {isClientUser
                ? 'Descreva o problema para a equipe técnica. O chamado será vinculado automaticamente à sua empresa e registrado com seu usuário.'
                : 'Use o chamado para abrir ou acompanhar a solicitação operacional. O registro técnico detalhado, tempo parado e finalização operacional continuam na tela Atendimentos.'}
            </p>
          </div>

          <form
            className="task-form"
            onSubmit={handleSubmit}
          >
            {isClientUser ? (
              <div className="task-form-client-company">
                <span>
                  Empresa vinculada
                </span>

                <strong>
                  {currentUserCompany?.name ??
                    'Empresa do usuário logado será usada automaticamente'}
                </strong>

                <small>
                  O cliente não pode abrir
                  chamado para outra empresa.
                </small>
              </div>
            ) : (
              <label>
                Empresa *
                <select
                  value={formData.companyId}
                  onChange={(event) =>
                    updateFormField(
                      'companyId',
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Selecione uma empresa
                  </option>

                  {companies.map(
                    (company) => (
                      <option
                        key={company.id}
                        value={company.id}
                      >
                        {company.name}
                      </option>
                    ),
                  )}
                </select>
              </label>
            )}

            <label>
              Sala
              <select
                value={formData.roomId}
                onChange={(event) =>
                  updateFormField(
                    'roomId',
                    event.target.value,
                  )
                }
              >
                <option value="">
                  Sem sala específica
                </option>

                {formRooms.map(
                  (room) => (
                    <option
                      key={room.id}
                      value={room.id}
                    >
                      {room.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              Equipamento
              <select
                value={
                  formData.equipmentId
                }
                onChange={(event) =>
                  updateFormField(
                    'equipmentId',
                    event.target.value,
                  )
                }
              >
                <option value="">
                  Sem equipamento específico
                </option>

                {formEquipments.map(
                  (equipment) => (
                    <option
                      key={equipment.id}
                      value={equipment.id}
                    >
                      {equipment.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            {!isClientUser ? (
              <label>
                Responsável
                <select
                  value={
                    formData.assignedToUserId
                  }
                  onChange={(event) =>
                    updateFormField(
                      'assignedToUserId',
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Sem responsável definido
                  </option>

                  {formUsers.map(
                    (userItem) => (
                      <option
                        key={userItem.id}
                        value={userItem.id}
                      >
                        {userItem.name}
                      </option>
                    ),
                  )}
                </select>
              </label>
            ) : null}

            <label className="task-form-wide">
              Título *
              <input
                value={formData.title}
                onChange={(event) =>
                  updateFormField(
                    'title',
                    event.target.value,
                  )
                }
                placeholder={
                  isClientUser
                    ? 'Ex: Câmara fria não está gelando'
                    : 'Ex: Verificar evaporador da Câmara Fria 01'
                }
              />
            </label>

            <label>
              {isClientUser
                ? 'Urgência'
                : 'Prioridade'}

              <select
                value={formData.priority}
                onChange={(event) =>
                  updateFormField(
                    'priority',
                    event.target
                      .value as TaskPriority,
                  )
                }
              >
                <option value="LOW">
                  Baixa
                </option>

                <option value="MEDIUM">
                  Média
                </option>

                <option value="HIGH">
                  Alta
                </option>

                {!isClientUser ? (
                  <option value="CRITICAL">
                    Crítica
                  </option>
                ) : null}
              </select>
            </label>

            {!isClientUser ? (
              <>
                <label>
                  Status
                  <select
                    value={formData.status}
                    onChange={(event) =>
                      updateFormField(
                        'status',
                        event.target
                          .value as TaskStatus,
                      )
                    }
                  >
                    <option value="OPEN">
                      Aberto
                    </option>

                    <option value="IN_PROGRESS">
                      Em andamento
                    </option>

                    <option value="DONE">
                      Concluído
                    </option>

                    <option value="CANCELED">
                      Cancelado
                    </option>

                    <option value="OVERDUE">
                      Atrasado
                    </option>
                  </select>
                </label>

                <label>
                  Origem
                  <select
                    value={formData.origin}
                    onChange={(event) =>
                      updateFormField(
                        'origin',
                        event.target
                          .value as TaskOrigin,
                      )
                    }
                  >
                    <option value="CRYOMAP">
                      CryoMap
                    </option>

                    <option value="AUVO">
                      Auvo
                    </option>

                    <option value="OTHER">
                      Outro
                    </option>
                  </select>
                </label>

                <label>
                  Vencimento
                  <input
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(event) =>
                      updateFormField(
                        'dueDate',
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Código externo
                  <input
                    value={
                      formData.externalCode
                    }
                    disabled={
                      formData.origin ===
                      'CRYOMAP'
                    }
                    onChange={(event) =>
                      updateFormField(
                        'externalCode',
                        event.target.value,
                      )
                    }
                    placeholder="Ex: AUVO-12345"
                  />
                </label>

                <label>
                  Link externo
                  <input
                    value={
                      formData.externalUrl
                    }
                    disabled={
                      formData.origin ===
                      'CRYOMAP'
                    }
                    onChange={(event) =>
                      updateFormField(
                        'externalUrl',
                        event.target.value,
                      )
                    }
                    placeholder="Ex: link da OS no Auvo"
                  />
                </label>
              </>
            ) : null}

            <label className="task-form-wide">
              Descrição
              <textarea
                value={
                  formData.description
                }
                onChange={(event) =>
                  updateFormField(
                    'description',
                    event.target.value,
                  )
                }
                placeholder={
                  isClientUser
                    ? 'Descreva o problema, local afetado, desde quando acontece e qualquer detalhe útil para o técnico.'
                    : 'Descreva o chamado técnico, ocorrência ou rotina...'
                }
                rows={4}
              />
            </label>

            {formError ? (
              <strong className="task-form-error">
                {formError}
              </strong>
            ) : null}

            <div className="task-form-actions">
              <button
                type="button"
                onClick={closeForm}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
              >
                {isSaving
                  ? 'Salvando...'
                  : editingTask
                    ? 'Salvar alterações'
                    : isClientUser
                      ? 'Abrir chamado'
                      : 'Cadastrar chamado'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="tasks-panel">
        <div className="tasks-panel-header">
          <div className="tasks-panel-heading">
            <span className="tasks-panel-icon" aria-hidden="true">
              <ClipboardList size={19} strokeWidth={2.15} />
            </span>

            <div>
              <span className="tasks-panel-kicker">Registros</span>
              <h2>{isTechnician ? 'Lista de tarefas' : 'Lista de chamados'}</h2>
              <p>
                {filteredTasks.length} de {tasks.length} registro(s) exibido(s).
              </p>
            </div>
          </div>

          <ActionButton
            type="button"
            variant="secondary"
            icon={RefreshCw}
            onClick={() => void handleRefresh()}
          >
            Atualizar
          </ActionButton>
        </div>

        <CollapsibleSection
          title="Filtros"
          openDescription="Ajuste os filtros para refinar os registros exibidos."
          closedDescription={
            activeFilterCount > 0
              ? `${activeFilterCount} filtro(s) ativo(s).`
              : 'Nenhum filtro específico selecionado.'
          }
          openLabel="Ocultar filtros"
          closedLabel="Filtros"
          storageKey="cryomap.tasks.filters-open"
          defaultOpen={false}
          defaultOpenOnMobile={false}
          count={activeFilterCount}
          className="tasks-filters-disclosure"
          contentClassName="tasks-filters-panel"
          variant="toolbar"
        >
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
                onChange={(event) =>
                  setSelectedEquipmentId(event.target.value)
                }
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
                <option value="OPEN">Aberto</option>
                <option value="IN_PROGRESS">Em andamento</option>
                <option value="DONE">Concluído</option>
                <option value="CANCELED">Cancelado</option>
                <option value="OVERDUE">Atrasado</option>
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

              <div className="tasks-search-input">
                <Search size={16} strokeWidth={2.1} aria-hidden="true" />

                <input
                  type="search"
                  placeholder="Título, solicitante, equipamento, origem..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </label>
          </div>

          <div className="tasks-filters-footer">
            <span>
              Os filtros estruturados consultam a API. A busca textual refina
              os registros já carregados.
            </span>

            <ActionButton
              type="button"
              variant="ghost"
              onClick={handleClearFilters}
              disabled={activeFilterCount === 0}
            >
              Limpar filtros
            </ActionButton>
          </div>
        </CollapsibleSection>

        {activeFilterCount > 0 ? (
          <div className="tasks-active-filters">
            <div className="tasks-active-filters-heading">
              <span>Filtros ativos</span>
              <strong>{activeFilterCount}</strong>
            </div>

            <div className="tasks-filter-chips">
              {activeFilters.map((filter) => (
                <span key={`${filter.label}-${filter.value}`}>
                  {filter.label}
                  <strong>{filter.value}</strong>
                </span>
              ))}
            </div>

            <button
              type="button"
              className="tasks-clear-filter-button"
              onClick={handleClearFilters}
            >
              Limpar
            </button>
          </div>
        ) : null}

        {error ? (
          <InlineNotice
            tone="danger"
            icon={TriangleAlert}
            title={error}
            description="Tente atualizar os dados ou revise a conexão com o backend."
            action={
              <ActionButton
                type="button"
                variant="danger"
                icon={RefreshCw}
                onClick={() => void handleRefresh()}
              >
                Tentar novamente
              </ActionButton>
            }
          />
        ) : null}

        {!error && filteredTasks.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nenhum chamado encontrado"
            description="Abra um novo chamado ou ajuste os filtros para visualizar resultados."
          />
        ) : null}

        {!error && filteredTasks.length > 0 ? (
          <>
            <div className="tasks-desktop-table">
              <div className="tasks-table-wrapper">
                <table className="tasks-table">
                  <thead>
                    <tr>
                      <th>Chamado</th>
                      <th>Local</th>
                      <th>Responsável</th>
                      <th>Prioridade</th>
                      <th>Status</th>
                      <th>Vencimento</th>
                      <th>Origem</th>
                      <th>Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTasks.map((task) => (
                      <tr key={task.id}>
                        <td>
                          <div className="task-table-title">
                            <strong>{task.title}</strong>
                            <span>
                              {task.description || 'Sem descrição informada'}
                            </span>
                            <small>
                              Aberto por {task.createdByUser?.name ?? '-'} ·{' '}
                              {formatDate(task.createdAt)}
                            </small>
                          </div>
                        </td>

                        <td>
                          <div className="task-table-stack">
                            <strong>
                              {task.company?.name ?? task.companyId}
                            </strong>

                            <span>
                              <DoorOpen size={13} strokeWidth={2} />
                              {task.room?.name ?? 'Sem sala'}
                            </span>

                            <span>
                              <Snowflake size={13} strokeWidth={2} />
                              {task.equipment?.name ?? 'Sem equipamento'}
                              {task.equipment?.code
                                ? ` · ${task.equipment.code}`
                                : ''}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="task-table-stack">
                            <strong>
                              {task.assignedToUser?.name ?? 'Não definido'}
                            </strong>
                            <span>{task.assignedToUser?.email ?? '-'}</span>
                          </div>
                        </td>

                        <td>
                          <TaskPriorityBadge priority={task.priority} />
                        </td>

                        <td>
                          <TaskStatusBadge status={task.status} />
                        </td>

                        <td>
                          <div className="task-table-stack">
                            <strong>{formatDateTime(task.dueDate)}</strong>
                            {task.completedAt ? (
                              <span>
                                Concluído {formatDateTime(task.completedAt)}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td>
                          <div className="task-table-origin">
                            <TaskOriginBadge origin={task.origin} />

                            {task.externalCode ? (
                              <small>{task.externalCode}</small>
                            ) : null}

                            {task.externalUrl ? (
                              <a
                                href={task.externalUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink
                                  size={13}
                                  strokeWidth={2.1}
                                  aria-hidden="true"
                                />
                                Abrir referência
                              </a>
                            ) : null}
                          </div>
                        </td>

                        <td>
                          {canManageTasks ? (
                            <div className="task-row-actions">
                              <button
                                type="button"
                                className="task-row-action"
                                onClick={() => openEditForm(task)}
                                title="Editar chamado"
                              >
                                <Pencil size={15} strokeWidth={2.1} />
                                <span>Editar</span>
                              </button>

                              <button
                                type="button"
                                className="task-row-action task-row-action--danger"
                                onClick={() => void handleInactivate(task)}
                                title="Remover chamado"
                              >
                                <Trash2 size={15} strokeWidth={2.1} />
                                <span>Remover</span>
                              </button>
                            </div>
                          ) : (
                            <StatusBadge tone="neutral">
                              Acompanhamento
                            </StatusBadge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="tasks-mobile-list">
              {filteredTasks.map((task) => (
                <TaskMobileCard
                  key={task.id}
                  task={task}
                  canManageTasks={canManageTasks}
                  onEdit={openEditForm}
                  onRemove={(selectedTask) =>
                    void handleInactivate(selectedTask)
                  }
                />
              ))}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

type TaskMobileCardProps = {
  task: Task;
  canManageTasks: boolean;
  onEdit: (task: Task) => void;
  onRemove: (task: Task) => void;
};

function TaskMobileCard({
  task,
  canManageTasks,
  onEdit,
  onRemove,
}: TaskMobileCardProps) {
  return (
    <article className="task-mobile-card">
      <div className="task-mobile-card__header">
        <div className="task-mobile-card__title">
          <span className="task-mobile-card__eyebrow">
            {task.company?.name ?? 'Empresa não informada'}
          </span>
          <h3>{task.title}</h3>
        </div>

        <TaskStatusBadge status={task.status} />
      </div>

      {task.description ? (
        <p className="task-mobile-card__description">{task.description}</p>
      ) : null}

      <div className="task-mobile-card__badges">
        <TaskPriorityBadge priority={task.priority} />
        <TaskOriginBadge origin={task.origin} />
      </div>

      <div className="task-mobile-card__meta">
        <div>
          <DoorOpen size={15} strokeWidth={2.1} />
          <span>{task.room?.name ?? 'Sem sala específica'}</span>
        </div>

        <div>
          <Snowflake size={15} strokeWidth={2.1} />
          <span>
            {task.equipment?.name ?? 'Sem equipamento específico'}
          </span>
        </div>

        <div>
          <UserRound size={15} strokeWidth={2.1} />
          <span>{task.assignedToUser?.name ?? 'Sem responsável'}</span>
        </div>

        <div>
          <CalendarClock size={15} strokeWidth={2.1} />
          <span>
            {task.dueDate
              ? `Vence ${formatDateTime(task.dueDate)}`
              : 'Sem vencimento definido'}
          </span>
        </div>
      </div>

      {task.externalCode || task.externalUrl ? (
        <div className="task-mobile-card__external">
          <ExternalLink size={14} strokeWidth={2.1} />
          <span>{task.externalCode ?? 'Referência externa'}</span>

          {task.externalUrl ? (
            <a href={task.externalUrl} target="_blank" rel="noreferrer">
              Abrir
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="task-mobile-card__footer">
        <small>
          Criado {formatDate(task.createdAt)}
          {task.createdByUser?.name
            ? ` · ${task.createdByUser.name}`
            : ''}
        </small>

        {canManageTasks ? (
          <div className="task-mobile-card__actions">
            <button
              type="button"
              onClick={() => onEdit(task)}
              aria-label={`Editar ${task.title}`}
            >
              <Pencil size={16} strokeWidth={2.1} />
              Editar
            </button>

            <button
              type="button"
              className="danger"
              onClick={() => onRemove(task)}
              aria-label={`Remover ${task.title}`}
            >
              <Trash2 size={16} strokeWidth={2.1} />
              Remover
            </button>
          </div>
        ) : (
          <StatusBadge tone="neutral">Acompanhamento</StatusBadge>
        )}
      </div>
    </article>
  );
}

type TaskOriginBadgeProps = {
  origin: TaskOrigin;
};

function TaskOriginBadge({ origin }: TaskOriginBadgeProps) {
  return (
    <StatusBadge tone={getTaskOriginTone(origin)}>
      {formatTaskOrigin(origin)}
    </StatusBadge>
  );
}

type TaskStatusBadgeProps = {
  status: TaskStatus;
};

function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  return (
    <StatusBadge tone={getTaskStatusTone(status)}>
      {formatTaskStatus(status)}
    </StatusBadge>
  );
}

type TaskPriorityBadgeProps = {
  priority: TaskPriority;
};

function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  return (
    <StatusBadge tone={getTaskPriorityTone(priority)}>
      {formatTaskPriority(priority)}
    </StatusBadge>
  );
}

function getTaskOriginTone(origin: TaskOrigin): UiTone {
  if (origin === 'AUVO') {
    return 'warning';
  }

  if (origin === 'CRYOMAP') {
    return 'info';
  }

  return 'neutral';
}

function getTaskStatusTone(status: TaskStatus): UiTone {
  if (status === 'DONE') {
    return 'success';
  }

  if (status === 'OVERDUE') {
    return 'danger';
  }

  if (status === 'IN_PROGRESS') {
    return 'warning';
  }

  if (status === 'OPEN') {
    return 'info';
  }

  return 'neutral';
}

function getTaskPriorityTone(priority: TaskPriority): UiTone {
  if (priority === 'CRITICAL') {
    return 'danger';
  }

  if (priority === 'HIGH') {
    return 'warning';
  }

  if (priority === 'MEDIUM') {
    return 'info';
  }

  return 'neutral';
}

function formatTaskOrigin(
  value: TaskOrigin,
) {
  const labels: Record<
    TaskOrigin,
    string
  > = {
    CRYOMAP: 'CryoMap',
    AUVO: 'Auvo',
    OTHER: 'Outro',
  };

  return labels[value];
}

function formatTaskStatus(
  value: TaskStatus,
) {
  const labels: Record<
    TaskStatus,
    string
  > = {
    OPEN: 'Aberto',
    IN_PROGRESS: 'Em andamento',
    DONE: 'Concluído',
    CANCELED: 'Cancelado',
    OVERDUE: 'Atrasado',
  };

  return labels[value];
}

function formatTaskPriority(
  value: TaskPriority,
) {
  const labels: Record<
    TaskPriority,
    string
  > = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
    CRITICAL: 'Crítica',
  };

  return labels[value];
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return '-';
  }

  return new Date(
    value,
  ).toLocaleDateString('pt-BR');
}

function formatDateTime(
  value?: string | null,
) {
  if (!value) {
    return '-';
  }

  return new Date(
    value,
  ).toLocaleString('pt-BR');
}

function formatDateTimeInput(
  value?: string | null,
) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset =
    date.getTimezoneOffset();

  const localDate = new Date(
    date.getTime() -
      offset * 60_000,
  );

  return localDate
    .toISOString()
    .slice(0, 16);
}

function optionalValue(
  value: string,
) {
  const normalized =
    value.trim();

  return normalized || undefined;
}

function nullableValue(
  value: string,
) {
  const normalized =
    value.trim();

  return normalized || null;
}

function optionalIsoDateTime(
  value: string,
) {
  if (!value) {
    return undefined;
  }

  return new Date(
    value,
  ).toISOString();
}

function nullableIsoDateTime(
  value: string,
) {
  if (!value) {
    return null;
  }

  return new Date(
    value,
  ).toISOString();
}

function normalizeTaskPriority(
  value: string,
): TaskPriority {
  if (
    value === 'LOW' ||
    value === 'MEDIUM' ||
    value === 'HIGH' ||
    value === 'CRITICAL'
  ) {
    return value;
  }

  return 'MEDIUM';
}

function normalizeClientPriority(
  value: TaskPriority,
): TaskPriority {
  if (value === 'CRITICAL') {
    return 'HIGH';
  }

  return value;
}

function getRequestErrorMessage(
  error: unknown,
) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response ===
      'object' &&
    error.response !== null &&
    'data' in error.response
  ) {
    const data =
      error.response.data;

    if (
      typeof data === 'object' &&
      data !== null &&
      'message' in data
    ) {
      const message =
        data.message;

      if (
        typeof message ===
        'string'
      ) {
        return message;
      }

      if (
        Array.isArray(message)
      ) {
        return message.join(' | ');
      }
    }
  }

  return 'Não foi possível salvar o chamado.';
}

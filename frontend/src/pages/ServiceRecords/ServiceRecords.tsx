import { type FormEvent, useEffect, useMemo, useState } from 'react';

import { EmptyState } from '../../components/Feedback/EmptyState';
import { LoadingState } from '../../components/Feedback/LoadingState';
import { useAuth } from '../../contexts/useAuth';
import { createAttachment } from '../../services/attachments';
import { getCompanies } from '../../services/companies';
import { getEquipments } from '../../services/equipments';
import { getRooms } from '../../services/rooms';
import { getServiceProblemSuggestions } from '../../services/service-problem-suggestions';
import {
  createServiceRecord,
  getServiceRecords,
  removeServiceRecord,
  updateServiceRecord,
  type CreateServiceRecordPayload,
  type UpdateServiceRecordPayload,
} from '../../services/service-records';
import { getTasks } from '../../services/tasks';
import { getUsers } from '../../services/users';
import type { AttachmentType } from '../../types/attachment';
import type { Company } from '../../types/company';
import type { Equipment } from '../../types/equipment';
import type { Room } from '../../types/room';
import type { ServiceProblemSuggestion } from '../../types/service-problem-suggestion';
import type { ServiceRecord } from '../../types/service-record';
import type { Task, TaskPriority } from '../../types/task';
import type { User } from '../../types/user';
import './ServiceRecords.css';

type ServiceRecordFormData = {
  taskId: string;
  technicianId: string;
  startedAt: string;
  finishedAt: string;
  standardizedProblem: string;
  problemFound: string;
  servicePerformed: string;
  notes: string;
};

type FinishAttachmentFormData = {
  type: AttachmentType;
  files: File[];
};

type ActiveFilter = {
  label: string;
  value: string;
};

const emptyFormData: ServiceRecordFormData = {
  taskId: '',
  technicianId: '',
  startedAt: '',
  finishedAt: '',
  standardizedProblem: '',
  problemFound: '',
  servicePerformed: '',
  notes: '',
};

const emptyFinishAttachmentFormData: FinishAttachmentFormData = {
  type: 'SERVICE_PHOTO',
  files: [],
};

const attachmentTypeOptions: { value: AttachmentType; label: string }[] = [
  {
    value: 'SERVICE_PHOTO',
    label: 'Foto de serviço',
  },
  {
    value: 'AUVO_REPORT',
    label: 'Relatório Auvo',
  },
  {
    value: 'OTHER',
    label: 'Outro arquivo',
  },
];

const maxAttachmentSizeInBytes = 10 * 1024 * 1024;

export function ServiceRecords() {
  const { user } = useAuth();

  const canManageServiceRecords = user?.role !== 'CLIENT_USER';

  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [problemSuggestions, setProblemSuggestions] = useState<
    ServiceProblemSuggestion[]
  >([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [finishAttachmentError, setFinishAttachmentError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingFinishAttachments, setIsUploadingFinishAttachments] =
    useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isProblemSuggestionsOpen, setIsProblemSuggestionsOpen] =
    useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(
    null,
  );
  const [finishedRecordForAttachments, setFinishedRecordForAttachments] =
    useState<ServiceRecord | null>(null);
  const [formData, setFormData] =
    useState<ServiceRecordFormData>(emptyFormData);
  const [finishAttachmentFormData, setFinishAttachmentFormData] =
    useState<FinishAttachmentFormData>(emptyFinishAttachmentFormData);

  async function handleRefresh() {
    setError('');
    setIsLoading(true);

    try {
      const [
        companiesData,
        roomsData,
        equipmentsData,
        tasksData,
        usersData,
        serviceRecordsData,
        problemSuggestionsData,
      ] = await Promise.all([
        getCompanies(),
        getRooms(selectedCompanyId || undefined),
        getEquipments({
          companyId: selectedCompanyId || undefined,
          roomId: selectedRoomId || undefined,
        }),
        getTasks({
          companyId: selectedCompanyId || undefined,
          roomId: selectedRoomId || undefined,
          equipmentId: selectedEquipmentId || undefined,
        }),
        getUsers({
          companyId: selectedCompanyId || undefined,
        }),
        getServiceRecords({
          taskId: selectedTaskId || undefined,
          companyId: selectedCompanyId || undefined,
          roomId: selectedRoomId || undefined,
          equipmentId: selectedEquipmentId || undefined,
          technicianId: selectedTechnicianId || undefined,
          startDate: optionalStartIsoDate(startDate),
          endDate: optionalEndIsoDate(endDate),
        }),
        getServiceProblemSuggestions(),
      ]);

      setCompanies(companiesData);
      setRooms(roomsData);
      setEquipments(equipmentsData);
      setTasks(tasksData);
      setUsers(usersData);
      setServiceRecords(serviceRecordsData);
      setProblemSuggestions(problemSuggestionsData);
    } catch {
      setError('Não foi possível carregar os atendimentos.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleClearFilters() {
    setSelectedCompanyId('');
    setSelectedRoomId('');
    setSelectedEquipmentId('');
    setSelectedTechnicianId('');
    setSelectedTaskId('');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setError('');
  }

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getCompanies(),
      getRooms(),
      getEquipments(),
      getTasks(),
      getUsers(),
      getServiceRecords(),
      getServiceProblemSuggestions(),
    ])
      .then(
        ([
          companiesData,
          roomsData,
          equipmentsData,
          tasksData,
          usersData,
          serviceRecordsData,
          problemSuggestionsData,
        ]) => {
          if (!isMounted) {
            return;
          }

          setCompanies(companiesData);
          setRooms(roomsData);
          setEquipments(equipmentsData);
          setTasks(tasksData);
          setUsers(usersData);
          setServiceRecords(serviceRecordsData);
          setProblemSuggestions(problemSuggestionsData);
        },
      )
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível carregar os atendimentos.');
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
      getTasks({
        companyId: selectedCompanyId || undefined,
        roomId: selectedRoomId || undefined,
        equipmentId: selectedEquipmentId || undefined,
      }),
      getUsers({
        companyId: selectedCompanyId || undefined,
      }),
      getServiceRecords({
        taskId: selectedTaskId || undefined,
        companyId: selectedCompanyId || undefined,
        roomId: selectedRoomId || undefined,
        equipmentId: selectedEquipmentId || undefined,
        technicianId: selectedTechnicianId || undefined,
        startDate: optionalStartIsoDate(startDate),
        endDate: optionalEndIsoDate(endDate),
      }),
    ])
      .then(
        ([
          roomsData,
          equipmentsData,
          tasksData,
          usersData,
          serviceRecordsData,
        ]) => {
          if (!isMounted) {
            return;
          }

          setError('');
          setRooms(roomsData);
          setEquipments(equipmentsData);
          setTasks(tasksData);
          setUsers(usersData);
          setServiceRecords(serviceRecordsData);

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

          if (
            selectedTaskId &&
            !tasksData.some((task) => task.id === selectedTaskId)
          ) {
            setSelectedTaskId('');
          }

          if (
            selectedTechnicianId &&
            !usersData.some((item) => item.id === selectedTechnicianId)
          ) {
            setSelectedTechnicianId('');
          }
        },
      )
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível filtrar os atendimentos.');
      });

    return () => {
      isMounted = false;
    };
  }, [
    selectedCompanyId,
    selectedRoomId,
    selectedEquipmentId,
    selectedTechnicianId,
    selectedTaskId,
    startDate,
    endDate,
  ]);

  const filteredServiceRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return serviceRecords;
    }

    return serviceRecords.filter((serviceRecord) => {
      return [
        serviceRecord.task?.title ?? '',
        serviceRecord.company?.name ?? '',
        serviceRecord.room?.name ?? '',
        serviceRecord.equipment?.name ?? '',
        serviceRecord.equipment?.code ?? '',
        serviceRecord.technician?.name ?? '',
        serviceRecord.technician?.email ?? '',
        serviceRecord.standardizedProblem ?? '',
        serviceRecord.problemFound ?? '',
        serviceRecord.servicePerformed ?? '',
        serviceRecord.notes ?? '',
        String(serviceRecord.downtimeMinutes ?? ''),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [serviceRecords, search]);

  const activeFilters = useMemo(() => {
    const filters: ActiveFilter[] = [];

    const selectedCompany = companies.find(
      (company) => company.id === selectedCompanyId,
    );
    const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
    const selectedEquipment = equipments.find(
      (equipment) => equipment.id === selectedEquipmentId,
    );
    const selectedTask = tasks.find((task) => task.id === selectedTaskId);
    const selectedTechnician = users.find(
      (item) => item.id === selectedTechnicianId,
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

    if (selectedTask) {
      filters.push({
        label: 'Tarefa',
        value: selectedTask.title,
      });
    }

    if (selectedTechnician) {
      filters.push({
        label: 'Técnico',
        value: selectedTechnician.name,
      });
    }

    if (startDate || endDate) {
      filters.push({
        label: 'Período',
        value: `${formatDate(startDate) || '-'} até ${formatDate(endDate) || '-'}`,
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
    endDate,
    equipments,
    rooms,
    search,
    selectedCompanyId,
    selectedEquipmentId,
    selectedRoomId,
    selectedTaskId,
    selectedTechnicianId,
    startDate,
    tasks,
    users,
  ]);

  const filteredProblemSuggestions = useMemo(() => {
    const normalizedSearch = normalizeSearchText(formData.standardizedProblem);

    if (!normalizedSearch) {
      return problemSuggestions.slice(0, 6);
    }

    return problemSuggestions
      .filter((suggestion) => {
        return [
          suggestion.title,
          suggestion.normalizedTitle,
          suggestion.description ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .includes(normalizedSearch);
      })
      .slice(0, 6);
  }, [problemSuggestions, formData.standardizedProblem]);

  const formTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (editingRecord?.taskId === task.id) {
        return true;
      }

      if (task.status === 'CANCELED') {
        return false;
      }

      return !serviceRecords.some(
        (serviceRecord) => serviceRecord.taskId === task.id,
      );
    });
  }, [tasks, serviceRecords, editingRecord]);

  const selectedTaskForForm = useMemo(() => {
    return tasks.find((task) => task.id === formData.taskId) ?? null;
  }, [tasks, formData.taskId]);

  const formTechnicians = useMemo(() => {
    return users.filter((item) => {
      if (item.status !== 'ACTIVE') {
        return false;
      }

      if (!selectedTaskForForm?.companyId) {
        return true;
      }

      if (!item.companyId) {
        return true;
      }

      return item.companyId === selectedTaskForForm.companyId;
    });
  }, [users, selectedTaskForForm]);

  const runningRecords = serviceRecords.filter(
    (serviceRecord) => !serviceRecord.finishedAt,
  ).length;

  const finishedRecords = serviceRecords.filter(
    (serviceRecord) => serviceRecord.finishedAt,
  ).length;

  const recordsWithDowntime = serviceRecords.filter(
    (serviceRecord) =>
      serviceRecord.downtimeMinutes !== null &&
      serviceRecord.downtimeMinutes !== undefined &&
      serviceRecord.downtimeMinutes > 0,
  ).length;

  const totalDowntimeMinutes = serviceRecords.reduce((total, serviceRecord) => {
    return total + (serviceRecord.downtimeMinutes ?? 0);
  }, 0);

  const selectedAttachmentFilesSize = finishAttachmentFormData.files.reduce(
    (total, file) => total + file.size,
    0,
  );

  function openCreateForm() {
    if (!canManageServiceRecords) {
      return;
    }

    setEditingRecord(null);
    setFormData({
      ...emptyFormData,
      taskId: selectedTaskId,
      technicianId: selectedTechnicianId,
      startedAt: currentDateTimeInput(),
    });
    setFormError('');
    setIsProblemSuggestionsOpen(false);
    setIsFormOpen(true);
  }

  function openEditForm(serviceRecord: ServiceRecord) {
    if (!canManageServiceRecords) {
      return;
    }

    setEditingRecord(serviceRecord);
    setFormData({
      taskId: serviceRecord.taskId,
      technicianId: serviceRecord.technicianId ?? '',
      startedAt: formatDateTimeInput(serviceRecord.startedAt),
      finishedAt: formatDateTimeInput(serviceRecord.finishedAt),
      standardizedProblem: serviceRecord.standardizedProblem ?? '',
      problemFound: serviceRecord.problemFound ?? '',
      servicePerformed: serviceRecord.servicePerformed ?? '',
      notes: serviceRecord.notes ?? '',
    });
    setFormError('');
    setIsProblemSuggestionsOpen(false);
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setEditingRecord(null);
    setFormData(emptyFormData);
    setFormError('');
    setIsProblemSuggestionsOpen(false);
  }

  function closeFinishAttachmentPanel() {
    if (isUploadingFinishAttachments) {
      return;
    }

    setFinishedRecordForAttachments(null);
    setFinishAttachmentFormData(emptyFinishAttachmentFormData);
    setFinishAttachmentError('');
  }

  function updateFormField(field: keyof ServiceRecordFormData, value: string) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateFinishAttachmentFiles(files: FileList | null) {
    setFinishAttachmentFormData((current) => ({
      ...current,
      files: Array.from(files ?? []),
    }));
    setFinishAttachmentError('');
  }

  function handleProblemSuggestionSelect(title: string) {
    updateFormField('standardizedProblem', title);
    setIsProblemSuggestionsOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageServiceRecords) {
      return;
    }

    setFormError('');

    if (!formData.taskId) {
      setFormError('Selecione a tarefa vinculada ao atendimento.');
      return;
    }

    if (
      formData.startedAt &&
      formData.finishedAt &&
      new Date(formData.finishedAt) < new Date(formData.startedAt)
    ) {
      setFormError('A data final não pode ser anterior à data inicial.');
      return;
    }

    setIsSaving(true);

    try {
      if (editingRecord) {
        const updatePayload: UpdateServiceRecordPayload = {
          technicianId: formData.technicianId || null,
          startedAt: optionalIsoDateTime(formData.startedAt),
          finishedAt: nullableIsoDateTime(formData.finishedAt),
          standardizedProblem: nullableValue(formData.standardizedProblem),
          problemFound: nullableValue(formData.problemFound),
          servicePerformed: nullableValue(formData.servicePerformed),
          notes: nullableValue(formData.notes),
        };

        await updateServiceRecord(editingRecord.id, updatePayload);
      } else {
        const createPayload: CreateServiceRecordPayload = {
          taskId: formData.taskId,
          technicianId: optionalValue(formData.technicianId),
          startedAt: optionalIsoDateTime(formData.startedAt),
          finishedAt: optionalIsoDateTime(formData.finishedAt),
          standardizedProblem: optionalValue(formData.standardizedProblem),
          problemFound: optionalValue(formData.problemFound),
          servicePerformed: optionalValue(formData.servicePerformed),
          notes: optionalValue(formData.notes),
        };

        await createServiceRecord(createPayload);
      }

      closeForm();
      await handleRefresh();
    } catch (requestError) {
      setFormError(getRequestErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFinish(serviceRecord: ServiceRecord) {
    if (!canManageServiceRecords) {
      return;
    }

    const confirmed = window.confirm(
      `Deseja finalizar o atendimento da tarefa "${serviceRecord.task?.title ?? serviceRecord.taskId}"? Após finalizar, será possível anexar fotos e relatórios.`,
    );

    if (!confirmed) {
      return;
    }

    const finishedAt = new Date().toISOString();

    try {
      await updateServiceRecord(serviceRecord.id, {
        finishedAt,
      });

      setFinishedRecordForAttachments({
        ...serviceRecord,
        finishedAt,
      });
      setFinishAttachmentFormData(emptyFinishAttachmentFormData);
      setFinishAttachmentError('');

      await handleRefresh();
    } catch {
      setError('Não foi possível finalizar o atendimento.');
    }
  }

  async function handleReopen(serviceRecord: ServiceRecord) {
    if (!canManageServiceRecords) {
      return;
    }

    const confirmed = window.confirm(
      `Deseja reabrir o atendimento da tarefa "${serviceRecord.task?.title ?? serviceRecord.taskId}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await updateServiceRecord(serviceRecord.id, {
        finishedAt: null,
      });

      if (finishedRecordForAttachments?.id === serviceRecord.id) {
        closeFinishAttachmentPanel();
      }

      await handleRefresh();
    } catch {
      setError('Não foi possível reabrir o atendimento.');
    }
  }

  async function handleRemove(serviceRecord: ServiceRecord) {
    if (!canManageServiceRecords) {
      return;
    }

    const confirmed = window.confirm(
      `Deseja realmente remover o atendimento da tarefa "${serviceRecord.task?.title ?? serviceRecord.taskId}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await removeServiceRecord(serviceRecord.id);

      if (finishedRecordForAttachments?.id === serviceRecord.id) {
        closeFinishAttachmentPanel();
      }

      await handleRefresh();
    } catch {
      setError('Não foi possível remover o atendimento.');
    }
  }

  async function handleFinishAttachmentSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!finishedRecordForAttachments || !canManageServiceRecords) {
      return;
    }

    setFinishAttachmentError('');

    if (finishAttachmentFormData.files.length === 0) {
      setFinishAttachmentError('Selecione uma ou mais fotos/arquivos.');
      return;
    }

    const oversizedFile = finishAttachmentFormData.files.find(
      (file) => file.size > maxAttachmentSizeInBytes,
    );

    if (oversizedFile) {
      setFinishAttachmentError(
        `O arquivo "${oversizedFile.name}" ultrapassa o limite de 10 MB.`,
      );
      return;
    }

    setIsUploadingFinishAttachments(true);

    try {
      for (const file of finishAttachmentFormData.files) {
        await createAttachment({
          file,
          companyId: finishedRecordForAttachments.companyId || undefined,
          taskId: finishedRecordForAttachments.taskId || undefined,
          serviceRecordId: finishedRecordForAttachments.id,
          type: finishAttachmentFormData.type,
        });
      }

      closeFinishAttachmentPanel();
      await handleRefresh();
    } catch (requestError) {
      setFinishAttachmentError(getAttachmentRequestErrorMessage(requestError));
    } finally {
      setIsUploadingFinishAttachments(false);
    }
  }

  if (isLoading) {
    return (
      <LoadingState
        title="Carregando atendimentos..."
        description="Buscando registros técnicos."
      />
    );
  }

  return (
    <div className="service-records-page">
      <header className="service-records-header">
        <div>
          <span>Operação</span>
          <h1>Atendimentos</h1>
          <p>
            Acompanhe registros de atendimento técnico, tempo parado,
            equipamentos afetados, problema padronizado e responsáveis.
          </p>

          {!canManageServiceRecords ? (
            <p>
              Seu acesso é somente consulta. Registros e finalizações ficam
              restritos à equipe técnica.
            </p>
          ) : null}
        </div>

        {canManageServiceRecords ? (
          <button type="button" onClick={openCreateForm}>
            Novo atendimento
          </button>
        ) : null}
      </header>

      <section className="service-records-summary">
        <SummaryCard title="Total" value={serviceRecords.length} />
        <SummaryCard title="Em andamento" value={runningRecords} />
        <SummaryCard title="Finalizados" value={finishedRecords} />
        <SummaryCard title="Com tempo parado" value={recordsWithDowntime} />
        <SummaryCard
          title="Tempo parado"
          value={formatMinutes(totalDowntimeMinutes)}
          danger={totalDowntimeMinutes > 0}
        />
      </section>

      {isFormOpen && canManageServiceRecords ? (
        <section className="service-record-form-panel">
          <div className="service-record-form-header">
            <div>
              <span>Atendimento</span>
              <h2>
                {editingRecord ? 'Editar atendimento' : 'Novo atendimento'}
              </h2>
            </div>

            <button type="button" onClick={closeForm}>
              Fechar
            </button>
          </div>

          <div className="service-record-form-tip">
            <strong>Registro técnico em campo</strong>
            <p>
              Selecione a tarefa vinculada, registre o problema encontrado, o
              serviço realizado e preencha o fim quando o atendimento estiver
              encerrado. O tempo parado é calculado a partir do início e fim.
            </p>
          </div>

          <form className="service-record-form" onSubmit={handleSubmit}>
            <label className="service-record-form-wide">
              Tarefa *
              <select
                value={formData.taskId}
                disabled={Boolean(editingRecord)}
                onChange={(event) =>
                  updateFormField('taskId', event.target.value)
                }
              >
                <option value="">Selecione uma tarefa sem atendimento</option>

                {formTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Técnico
              <select
                value={formData.technicianId}
                onChange={(event) =>
                  updateFormField('technicianId', event.target.value)
                }
              >
                <option value="">Usar responsável da tarefa/usuário atual</option>

                {formTechnicians.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Início
              <input
                type="datetime-local"
                value={formData.startedAt}
                onChange={(event) =>
                  updateFormField('startedAt', event.target.value)
                }
              />
            </label>

            <label>
              Fim
              <input
                type="datetime-local"
                value={formData.finishedAt}
                onChange={(event) =>
                  updateFormField('finishedAt', event.target.value)
                }
              />
            </label>

            <div className="service-record-form-wide service-record-problem-field">
              <label htmlFor="standardizedProblem">
                Problema/componente
                <input
                  id="standardizedProblem"
                  value={formData.standardizedProblem}
                  onChange={(event) => {
                    updateFormField(
                      'standardizedProblem',
                      event.target.value,
                    );
                    setIsProblemSuggestionsOpen(true);
                  }}
                  onFocus={() => setIsProblemSuggestionsOpen(true)}
                  onBlur={() => {
                    window.setTimeout(() => {
                      setIsProblemSuggestionsOpen(false);
                    }, 120);
                  }}
                  placeholder="Digite ou selecione uma sugestão. Ex: Compressor travou"
                  autoComplete="off"
                />
                <small className="service-record-problem-help">
                  Você pode selecionar uma sugestão cadastrada ou escrever um
                  problema novo livremente.
                </small>
              </label>

              {isProblemSuggestionsOpen &&
              filteredProblemSuggestions.length > 0 ? (
                <div className="service-record-suggestions">
                  {filteredProblemSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() =>
                        handleProblemSuggestionSelect(suggestion.title)
                      }
                    >
                      <strong>{suggestion.title}</strong>
                      {suggestion.description ? (
                        <small>{suggestion.description}</small>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}

              {formData.standardizedProblem.trim() &&
              !isExistingProblemSuggestion(
                formData.standardizedProblem,
                problemSuggestions,
              ) ? (
                <small className="service-record-free-text-hint">
                  Este texto será salvo no atendimento mesmo não estando nas
                  sugestões cadastradas.
                </small>
              ) : null}
            </div>

            <label className="service-record-form-wide">
              Problema encontrado
              <textarea
                value={formData.problemFound}
                onChange={(event) =>
                  updateFormField('problemFound', event.target.value)
                }
                placeholder="Descreva o problema encontrado..."
                rows={3}
              />
            </label>

            <label className="service-record-form-wide">
              Serviço realizado
              <textarea
                value={formData.servicePerformed}
                onChange={(event) =>
                  updateFormField('servicePerformed', event.target.value)
                }
                placeholder="Descreva o serviço realizado..."
                rows={3}
              />
            </label>

            <label className="service-record-form-wide">
              Observações
              <textarea
                value={formData.notes}
                onChange={(event) =>
                  updateFormField('notes', event.target.value)
                }
                placeholder="Observações adicionais..."
                rows={3}
              />
            </label>

            {formError ? (
              <strong className="service-record-form-error">
                {formError}
              </strong>
            ) : null}

            <div className="service-record-form-actions">
              <button type="button" onClick={closeForm}>
                Cancelar
              </button>

              <button type="submit" disabled={isSaving}>
                {isSaving
                  ? 'Salvando...'
                  : editingRecord
                    ? 'Salvar alterações'
                    : 'Cadastrar atendimento'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {finishedRecordForAttachments && canManageServiceRecords ? (
        <section className="service-record-attachment-panel">
          <div className="service-record-attachment-header">
            <div>
              <span>Finalização concluída</span>
              <h2>Anexar fotos ou relatório</h2>
              <p>
                O atendimento foi finalizado. Selecione uma ou mais fotos ou
                arquivos para vincular diretamente a este atendimento.
              </p>
            </div>

            <button type="button" onClick={closeFinishAttachmentPanel}>
              Agora não
            </button>
          </div>

          <div className="service-record-attachment-context">
            <div>
              <span>Tarefa</span>
              <strong>
                {finishedRecordForAttachments.task?.title ??
                  finishedRecordForAttachments.taskId}
              </strong>
            </div>

            <div>
              <span>Atendimento</span>
              <strong>{shortId(finishedRecordForAttachments.id)}</strong>
            </div>

            <div>
              <span>Finalizado em</span>
              <strong>
                {formatDateTime(finishedRecordForAttachments.finishedAt)}
              </strong>
            </div>
          </div>

          <form
            className="service-record-attachment-form"
            onSubmit={handleFinishAttachmentSubmit}
          >
            <label>
              Tipo de anexo
              <select
                value={finishAttachmentFormData.type}
                onChange={(event) =>
                  setFinishAttachmentFormData((current) => ({
                    ...current,
                    type: event.target.value as AttachmentType,
                  }))
                }
              >
                {attachmentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="service-record-attachment-file-field">
              Fotos/arquivos
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={(event) => updateFinishAttachmentFiles(event.target.files)}
              />
              <small>
                Você pode selecionar várias fotos de uma vez. Limite: 10 MB por
                arquivo. Para relatório ou evidência do Auvo, use o tipo
                Relatório Auvo.
              </small>
            </label>

            {finishAttachmentFormData.files.length > 0 ? (
              <div className="service-record-attachment-selected-files">
                <strong>
                  {finishAttachmentFormData.files.length} arquivo(s)
                  selecionado(s) · {formatFileSize(selectedAttachmentFilesSize)}
                </strong>

                <div>
                  {finishAttachmentFormData.files.map((file) => (
                    <span key={`${file.name}-${file.size}-${file.lastModified}`}>
                      {file.name} · {formatFileSize(file.size)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {finishAttachmentError ? (
              <strong className="service-record-form-error">
                {finishAttachmentError}
              </strong>
            ) : null}

            <div className="service-record-attachment-actions">
              <button type="button" onClick={closeFinishAttachmentPanel}>
                Pular anexos
              </button>

              <button type="submit" disabled={isUploadingFinishAttachments}>
                {isUploadingFinishAttachments
                  ? 'Enviando anexos...'
                  : 'Enviar anexos'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="service-records-panel">
        <div className="service-records-panel-header">
          <div>
            <h2>Lista de atendimentos</h2>
            <p>
              {filteredServiceRecords.length} registro(s) exibido(s) de{' '}
              {serviceRecords.length} carregado(s)
            </p>
          </div>

          <button
            type="button"
            className="service-records-filter-toggle"
            onClick={() => setIsFiltersOpen((current) => !current)}
          >
            {isFiltersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
            {activeFilters.length > 0 ? <span>{activeFilters.length}</span> : null}
          </button>
        </div>

        <div
          className={
            isFiltersOpen
              ? 'service-records-filter-area open'
              : 'service-records-filter-area'
          }
        >
          <div className="service-records-actions">
            <label className="service-records-filter-field">
              <span>Empresa</span>
              <select
                value={selectedCompanyId}
                onChange={(event) => {
                  setSelectedCompanyId(event.target.value);
                  setSelectedRoomId('');
                  setSelectedEquipmentId('');
                  setSelectedTaskId('');
                  setSelectedTechnicianId('');
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

            <label className="service-records-filter-field">
              <span>Sala</span>
              <select
                value={selectedRoomId}
                onChange={(event) => {
                  setSelectedRoomId(event.target.value);
                  setSelectedEquipmentId('');
                  setSelectedTaskId('');
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

            <label className="service-records-filter-field">
              <span>Equipamento</span>
              <select
                value={selectedEquipmentId}
                onChange={(event) => {
                  setSelectedEquipmentId(event.target.value);
                  setSelectedTaskId('');
                }}
              >
                <option value="">Todos os equipamentos</option>

                {equipments.map((equipment) => (
                  <option key={equipment.id} value={equipment.id}>
                    {equipment.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="service-records-filter-field">
              <span>Tarefa</span>
              <select
                value={selectedTaskId}
                onChange={(event) => setSelectedTaskId(event.target.value)}
              >
                <option value="">Todas as tarefas</option>

                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="service-records-filter-field">
              <span>Técnico</span>
              <select
                value={selectedTechnicianId}
                onChange={(event) => setSelectedTechnicianId(event.target.value)}
              >
                <option value="">Todos os técnicos</option>

                {users.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="service-records-filter-field">
              <span>Início</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>

            <label className="service-records-filter-field">
              <span>Fim</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>

            <label className="service-records-filter-field service-records-search-field">
              <span>Busca</span>
              <input
                type="search"
                placeholder="Buscar por tarefa, problema, técnico..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <div className="service-records-action-buttons">
              <button type="button" onClick={() => void handleRefresh()}>
                Aplicar filtros
              </button>

              <button
                type="button"
                className="service-records-secondary-action"
                onClick={handleClearFilters}
              >
                Limpar filtros
              </button>
            </div>
          </div>

          <div className="service-records-filter-status">
            <div>
              <strong>Filtros selecionados</strong>
              <span>
                No celular, mantenha os filtros fechados durante o atendimento e
                abra apenas quando precisar localizar registros específicos.
              </span>
            </div>

            <div className="service-records-filter-chips">
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
        </div>

        {activeFilters.length > 0 && !isFiltersOpen ? (
          <div className="service-records-compact-filter-status">
            <span>{activeFilters.length} filtro(s) ativo(s)</span>
            <button type="button" onClick={() => setIsFiltersOpen(true)}>
              Ver filtros
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="service-records-error">
            <strong>{error}</strong>

            <button type="button" onClick={() => void handleRefresh()}>
              Tentar novamente
            </button>
          </div>
        ) : null}

        {!error && filteredServiceRecords.length === 0 ? (
          <EmptyState
            title="Nenhum atendimento encontrado."
            description="Registre um atendimento ou ajuste os filtros para visualizar resultados."
          />
        ) : null}

        {!error && filteredServiceRecords.length > 0 ? (
          <>
            <div className="service-records-mobile-list">
              {filteredServiceRecords.map((serviceRecord) => (
                <ServiceRecordMobileCard
                  key={serviceRecord.id}
                  serviceRecord={serviceRecord}
                  canManageServiceRecords={canManageServiceRecords}
                  onEdit={openEditForm}
                  onFinish={handleFinish}
                  onReopen={handleReopen}
                  onRemove={handleRemove}
                />
              ))}
            </div>

            <div className="service-records-table-wrapper">
              <table className="service-records-table">
                <thead>
                  <tr>
                    <th>Atendimento</th>
                    <th>Tarefa</th>
                    <th>Empresa</th>
                    <th>Sala</th>
                    <th>Equipamento</th>
                    <th>Técnico</th>
                    <th>Status</th>
                    <th>Início</th>
                    <th>Fim</th>
                    <th>Tempo parado</th>
                    <th>Problema padrão</th>
                    <th>Problema detalhado</th>
                    <th>Serviço</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredServiceRecords.map((serviceRecord) => (
                    <tr key={serviceRecord.id}>
                      <td>
                        <strong>{shortId(serviceRecord.id)}</strong>
                        <small>{formatDate(serviceRecord.createdAt)}</small>
                      </td>

                      <td>
                        <strong>{serviceRecord.task?.title ?? '-'}</strong>

                        {serviceRecord.task?.priority ? (
                          <small>
                            Prioridade:{' '}
                            {formatTaskPriority(serviceRecord.task.priority)}
                          </small>
                        ) : null}
                      </td>

                      <td>
                        {serviceRecord.company?.name ?? serviceRecord.companyId}
                      </td>

                      <td>{serviceRecord.room?.name ?? '-'}</td>

                      <td>
                        <span>{serviceRecord.equipment?.name ?? '-'}</span>

                        {serviceRecord.equipment?.code ? (
                          <small>{serviceRecord.equipment.code}</small>
                        ) : null}
                      </td>

                      <td>
                        <span>{serviceRecord.technician?.name ?? '-'}</span>

                        {serviceRecord.technician?.email ? (
                          <small>{serviceRecord.technician.email}</small>
                        ) : null}
                      </td>

                      <td>
                        <ServiceRecordStatusBadge
                          finishedAt={serviceRecord.finishedAt}
                        />
                      </td>

                      <td>{formatDateTime(serviceRecord.startedAt)}</td>

                      <td>{formatDateTime(serviceRecord.finishedAt)}</td>

                      <td>
                        <strong>
                          {formatMinutes(serviceRecord.downtimeMinutes)}
                        </strong>
                      </td>

                      <td>
                        {serviceRecord.standardizedProblem ? (
                          <strong className="service-record-standardized-problem">
                            {serviceRecord.standardizedProblem}
                          </strong>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td>{serviceRecord.problemFound || '-'}</td>

                      <td>{serviceRecord.servicePerformed || '-'}</td>

                      <td>
                        {canManageServiceRecords ? (
                          <div className="service-record-row-actions">
                            <button
                              type="button"
                              onClick={() => openEditForm(serviceRecord)}
                            >
                              Editar
                            </button>

                            {!serviceRecord.finishedAt ? (
                              <button
                                type="button"
                                className="service-record-row-action-finish"
                                onClick={() => void handleFinish(serviceRecord)}
                              >
                                Finalizar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleReopen(serviceRecord)}
                              >
                                Reabrir
                              </button>
                            )}

                            <button
                              type="button"
                              className="service-record-row-action-remove"
                              onClick={() => void handleRemove(serviceRecord)}
                            >
                              Remover
                            </button>
                          </div>
                        ) : (
                          <span className="service-record-readonly-badge">
                            Somente consulta
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

type SummaryCardProps = {
  title: string;
  value: number | string;
  danger?: boolean;
};

function SummaryCard({ title, value, danger = false }: SummaryCardProps) {
  return (
    <article
      className={
        danger
          ? 'service-records-summary-card danger'
          : 'service-records-summary-card'
      }
    >
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}

type ServiceRecordStatusBadgeProps = {
  finishedAt?: string | null;
};

function ServiceRecordStatusBadge({
  finishedAt,
}: ServiceRecordStatusBadgeProps) {
  if (finishedAt) {
    return <span className="service-record-status finished">Finalizado</span>;
  }

  return <span className="service-record-status running">Em andamento</span>;
}

type ServiceRecordMobileCardProps = {
  serviceRecord: ServiceRecord;
  canManageServiceRecords: boolean;
  onEdit: (serviceRecord: ServiceRecord) => void;
  onFinish: (serviceRecord: ServiceRecord) => Promise<void>;
  onReopen: (serviceRecord: ServiceRecord) => Promise<void>;
  onRemove: (serviceRecord: ServiceRecord) => Promise<void>;
};

function ServiceRecordMobileCard({
  serviceRecord,
  canManageServiceRecords,
  onEdit,
  onFinish,
  onReopen,
  onRemove,
}: ServiceRecordMobileCardProps) {
  return (
    <article className="service-record-mobile-card">
      <div className="service-record-mobile-card-header">
        <div>
          <span>Atendimento {shortId(serviceRecord.id)}</span>
          <strong>{serviceRecord.task?.title ?? 'Tarefa não informada'}</strong>
        </div>

        <ServiceRecordStatusBadge finishedAt={serviceRecord.finishedAt} />
      </div>

      <div className="service-record-mobile-card-main">
        <div>
          <span>Sala</span>
          <strong>{serviceRecord.room?.name ?? '-'}</strong>
        </div>

        <div>
          <span>Equipamento</span>
          <strong>{serviceRecord.equipment?.name ?? '-'}</strong>
          {serviceRecord.equipment?.code ? (
            <small>{serviceRecord.equipment.code}</small>
          ) : null}
        </div>

        <div>
          <span>Técnico</span>
          <strong>{serviceRecord.technician?.name ?? '-'}</strong>
        </div>

        <div>
          <span>Tempo parado</span>
          <strong>{formatMinutes(serviceRecord.downtimeMinutes)}</strong>
        </div>
      </div>

      <div className="service-record-mobile-card-dates">
        <span>Início: {formatDateTime(serviceRecord.startedAt)}</span>
        <span>Fim: {formatDateTime(serviceRecord.finishedAt)}</span>
      </div>

      {serviceRecord.standardizedProblem ||
      serviceRecord.problemFound ||
      serviceRecord.servicePerformed ? (
        <div className="service-record-mobile-card-detail">
          {serviceRecord.standardizedProblem ? (
            <strong className="service-record-standardized-problem">
              {serviceRecord.standardizedProblem}
            </strong>
          ) : null}

          {serviceRecord.problemFound ? (
            <p>
              <strong>Problema:</strong> {serviceRecord.problemFound}
            </p>
          ) : null}

          {serviceRecord.servicePerformed ? (
            <p>
              <strong>Serviço:</strong> {serviceRecord.servicePerformed}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="service-record-mobile-card-actions">
        {canManageServiceRecords ? (
          <>
            <button type="button" onClick={() => onEdit(serviceRecord)}>
              Editar
            </button>

            {!serviceRecord.finishedAt ? (
              <button
                type="button"
                className="finish"
                onClick={() => void onFinish(serviceRecord)}
              >
                Finalizar
              </button>
            ) : (
              <button
                type="button"
                className="reopen"
                onClick={() => void onReopen(serviceRecord)}
              >
                Reabrir
              </button>
            )}

            <button
              type="button"
              className="remove"
              onClick={() => void onRemove(serviceRecord)}
            >
              Remover
            </button>
          </>
        ) : (
          <span className="service-record-readonly-badge">
            Somente consulta
          </span>
        )}
      </div>
    </article>
  );
}

function optionalValue(value: string) {
  const normalized = value.trim();

  return normalized || undefined;
}

function nullableValue(value: string) {
  const normalized = value.trim();

  return normalized || null;
}

function optionalStartIsoDate(value: string) {
  if (!value) {
    return undefined;
  }

  return new Date(`${value}T00:00:00`).toISOString();
}

function optionalEndIsoDate(value: string) {
  if (!value) {
    return undefined;
  }

  return new Date(`${value}T23:59:59`).toISOString();
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

function currentDateTimeInput() {
  return formatDateTimeInput(new Date().toISOString());
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

function shortId(value: string) {
  return value.slice(0, 8).toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) {
    return '';
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('pt-BR');
}

function formatMinutes(value?: number | null) {
  if (value === null || value === undefined) {
    return '-';
  }

  if (value < 60) {
    return `${value} min`;
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}min`;
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

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isExistingProblemSuggestion(
  value: string,
  suggestions: ServiceProblemSuggestion[],
) {
  const normalizedValue = normalizeSearchText(value);

  if (!normalizedValue) {
    return true;
  }

  return suggestions.some((suggestion) => {
    return normalizeSearchText(suggestion.title) === normalizedValue;
  });
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

  return 'Não foi possível salvar o atendimento.';
}

function getAttachmentRequestErrorMessage(error: unknown) {
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

  return 'Não foi possível enviar os anexos.';
}


import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import {

  Building2,

  Camera,

  CheckCircle2,

  CircleOff,

  ClipboardList,

  Download,

  File,

  FileImage,

  Files,

  FileText,

  HardDrive,

  Image,

  Link2,

  Paperclip,

  Plus,

  RefreshCw,

  RotateCcw,

  Search,

  TriangleAlert,

  Upload,

  UserRound,

  Wrench,

} from 'lucide-react';

import { CollapsibleSection } from '../../components/CollapsibleSection/CollapsibleSection';

import {

  ActionButton,

  EmptyState,

  InlineNotice,

  LoadingState,

  MetaPill,

  MetricCard,

  PageHeader,

  StatusBadge,

  type UiTone,

} from '../../components/ui/CryoUi';

import { useAuth } from '../../contexts/useAuth';

import {

  createAttachment,

  downloadAttachment,

  getAttachments,

  removeAttachment,

} from '../../services/attachments';

import { getCompanies } from '../../services/companies';

import { getServiceRecords } from '../../services/service-records';

import { getTasks } from '../../services/tasks';

import { getUsers } from '../../services/users';

import type { Attachment, AttachmentType } from '../../types/attachment';

import type { Company } from '../../types/company';

import type { ServiceRecord } from '../../types/service-record';

import type { Task } from '../../types/task';

import type { User } from '../../types/user';

import './Attachments.css';

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

    value: 'COMPANY_LOGO',

    label: 'Logo da empresa',

  },

  {

    value: 'FLOOR_PLAN',

    label: 'Planta baixa',

  },

  {

    value: 'OTHER',

    label: 'Outro',

  },

];

type AttachmentFormData = {

  companyId: string;

  taskId: string;

  serviceRecordId: string;

  type: AttachmentType;

  files: File[];

};

const emptyFormData: AttachmentFormData = {

  companyId: '',

  taskId: '',

  serviceRecordId: '',

  type: 'OTHER',

  files: [],

};

const maxAttachmentSizeInBytes = 10 * 1024 * 1024;

export function Attachments() {

  const { user } = useAuth();

  const canManageAttachments =

    user?.role === 'MASTER_ADMIN' ||

    user?.role === 'SUPERVISOR' ||

    user?.role === 'TECHNICIAN';

  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [companies, setCompanies] = useState<Company[]>([]);

  const [tasks, setTasks] = useState<Task[]>([]);

  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);

  const [users, setUsers] = useState<User[]>([]);

  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  const [selectedTaskId, setSelectedTaskId] = useState('');

  const [selectedServiceRecordId, setSelectedServiceRecordId] = useState('');

  const [selectedUploadedByUserId, setSelectedUploadedByUserId] = useState('');

  const [selectedType, setSelectedType] = useState('');

  const [search, setSearch] = useState('');

  const [error, setError] = useState('');

  const [success, setSuccess] = useState('');

  const [formError, setFormError] = useState('');

  const [actionAttachmentId, setActionAttachmentId] = useState<string | null>(

    null,

  );

  const [isLoading, setIsLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);

  const [formData, setFormData] = useState<AttachmentFormData>(emptyFormData);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleRefresh() {

    setError('');

    setSuccess('');

    setIsLoading(true);

    try {

      const [

        companiesData,

        tasksData,

        serviceRecordsData,

        usersData,

        attachmentsData,

      ] = await Promise.all([

        getCompanies(),

        getTasks({

          companyId: selectedCompanyId || undefined,

        }),

        getServiceRecords({

          companyId: selectedCompanyId || undefined,

          taskId: selectedTaskId || undefined,

        }),

        getUsers({

          companyId: selectedCompanyId || undefined,

        }),

        getAttachments({

          companyId: selectedCompanyId || undefined,

          taskId: selectedTaskId || undefined,

          serviceRecordId: selectedServiceRecordId || undefined,

          uploadedByUserId: selectedUploadedByUserId || undefined,

          type: (selectedType as AttachmentType) || undefined,

        }),

      ]);

      setCompanies(companiesData);

      setTasks(tasksData);

      setServiceRecords(serviceRecordsData);

      setUsers(usersData);

      setAttachments(attachmentsData);

    } catch {

      setError('Não foi possível carregar os anexos.');

    } finally {

      setIsLoading(false);

    }

  }

  useEffect(() => {

    let isMounted = true;

    Promise.all([

      getCompanies(),

      getTasks(),

      getServiceRecords(),

      getUsers(),

      getAttachments(),

    ])

      .then(

        ([

          companiesData,

          tasksData,

          serviceRecordsData,

          usersData,

          attachmentsData,

        ]) => {

          if (!isMounted) {

            return;

          }

          setCompanies(companiesData);

          setTasks(tasksData);

          setServiceRecords(serviceRecordsData);

          setUsers(usersData);

          setAttachments(attachmentsData);

        },

      )

      .catch(() => {

        if (!isMounted) {

          return;

        }

        setError('Não foi possível carregar os anexos.');

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
    if (!success) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccess('');
    }, 4500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [success]);

  useEffect(() => {

    let isMounted = true;

    Promise.all([

      getTasks({

        companyId: selectedCompanyId || undefined,

      }),

      getServiceRecords({

        companyId: selectedCompanyId || undefined,

        taskId: selectedTaskId || undefined,

      }),

      getUsers({

        companyId: selectedCompanyId || undefined,

      }),

    ])

      .then(([tasksData, serviceRecordsData, usersData]) => {

        if (!isMounted) {

          return;

        }

        setTasks(tasksData);

        setServiceRecords(serviceRecordsData);

        setUsers(usersData);

        if (

          selectedTaskId &&

          !tasksData.some((task) => task.id === selectedTaskId)

        ) {

          setSelectedTaskId('');

        }

        if (

          selectedServiceRecordId &&

          !serviceRecordsData.some(

            (serviceRecord) => serviceRecord.id === selectedServiceRecordId,

          )

        ) {

          setSelectedServiceRecordId('');

        }

        if (

          selectedUploadedByUserId &&

          !usersData.some((user) => user.id === selectedUploadedByUserId)

        ) {

          setSelectedUploadedByUserId('');

        }

      })

      .catch(() => {

        if (!isMounted) {

          return;

        }

        setError('Não foi possível carregar filtros de anexos.');

      });

    return () => {

      isMounted = false;

    };

  }, [

    selectedCompanyId,

    selectedTaskId,

    selectedServiceRecordId,

    selectedUploadedByUserId,

  ]);

  useEffect(() => {

    if (!isFormOpen || !canManageAttachments) {

      return;

    }

    let isMounted = true;

    Promise.all([

      getTasks({

        companyId: formData.companyId || undefined,

      }),

      getServiceRecords({

        companyId: formData.companyId || undefined,

        taskId: formData.taskId || undefined,

      }),

    ])

      .then(([tasksData, serviceRecordsData]) => {

        if (!isMounted) {

          return;

        }

        setTasks(tasksData);

        setServiceRecords(serviceRecordsData);

        if (

          formData.taskId &&

          !tasksData.some((task) => task.id === formData.taskId)

        ) {

          updateFormField('taskId', '');

        }

        if (

          formData.serviceRecordId &&

          !serviceRecordsData.some(

            (serviceRecord) => serviceRecord.id === formData.serviceRecordId,

          )

        ) {

          updateFormField('serviceRecordId', '');

        }

      })

      .catch(() => {

        if (!isMounted) {

          return;

        }

        setFormError('Não foi possível carregar vínculos do formulário.');

      });

    return () => {

      isMounted = false;

    };

  }, [

    isFormOpen,

    canManageAttachments,

    formData.companyId,

    formData.taskId,

    formData.serviceRecordId,

  ]);

  const filteredAttachments = useMemo(() => {

    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {

      return attachments;

    }

    return attachments.filter((attachment) => {

      return [

        attachment.originalName,

        attachment.fileName,

        attachment.mimeType,

        attachment.type,

        attachment.company?.name ?? '',

        attachment.task?.title ?? '',

        attachment.uploadedByUser?.name ?? '',

        attachment.uploadedByUser?.email ?? '',

        attachment.serviceRecord?.id ?? '',

      ]

        .join(' ')

        .toLowerCase()

        .includes(normalizedSearch);

    });

  }, [attachments, search]);

  const totalSize = attachments.reduce(

    (total, attachment) => total + attachment.size,

    0,

  );

  const selectedFilesSize = formData.files.reduce(

    (total, file) => total + file.size,

    0,

  );

  const servicePhotos = attachments.filter(

    (attachment) => attachment.type === 'SERVICE_PHOTO',

  ).length;

  const floorPlans = attachments.filter(

    (attachment) => attachment.type === 'FLOOR_PLAN',

  ).length;

  const linkedToTasks = attachments.filter(

    (attachment) => attachment.taskId,

  ).length;

  const linkedToServiceRecords = attachments.filter(

    (attachment) => attachment.serviceRecordId,

  ).length;

  const activeFilterCount = [

    selectedCompanyId,

    selectedTaskId,

    selectedServiceRecordId,

    selectedUploadedByUserId,

    selectedType,

    search.trim(),

  ].filter(Boolean).length;

  function openCreateForm() {

    if (!canManageAttachments) {

      return;

    }

    setError('');
    setSuccess('');

    setFormData({

      ...emptyFormData,

      companyId: selectedCompanyId,

      taskId: selectedTaskId,

      serviceRecordId: selectedServiceRecordId,

      type: (selectedType as AttachmentType) || 'OTHER',

    });

    setFormError('');

    setIsFormOpen(true);

  }

  function resetFormState() {
    setIsFormOpen(false);
    setFormData(emptyFormData);
    setFormError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    resetFormState();
  }

  function clearFilters() {

    setSelectedCompanyId('');

    setSelectedTaskId('');

    setSelectedServiceRecordId('');

    setSelectedUploadedByUserId('');

    setSelectedType('');

    setSearch('');

  }

  function updateFormField<K extends keyof AttachmentFormData>(

    field: K,

    value: AttachmentFormData[K],

  ) {

    setFormData((current) => ({

      ...current,

      [field]: value,

    }));

  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {

    event.preventDefault();

    if (!canManageAttachments) {

      return;

    }

    setFormError('');
    setSuccess('');

    if (!formData.companyId && !formData.taskId && !formData.serviceRecordId) {

      setFormError('Vincule o anexo a uma empresa, tarefa ou atendimento.');

      return;

    }

    if (formData.files.length === 0) {

      setFormError('Selecione um ou mais arquivos.');

      return;

    }

    const oversizedFile = formData.files.find(

      (file) => file.size > maxAttachmentSizeInBytes,

    );

    if (oversizedFile) {

      setFormError(

        `O arquivo "${oversizedFile.name}" deve ter no máximo 10 MB.`,

      );

      return;

    }

    const fileCount = formData.files.length;

    setIsSaving(true);

    try {

      for (const file of formData.files) {

        await createAttachment({

          file,

          companyId: formData.companyId || undefined,

          taskId: formData.taskId || undefined,

          serviceRecordId: formData.serviceRecordId || undefined,

          type: formData.type,

        });

      }

      resetFormState();

      await handleRefresh();

      setSuccess(
        fileCount === 1
          ? 'Anexo enviado com sucesso.'
          : `${fileCount} anexos enviados com sucesso.`,
      );

    } catch (requestError) {

      setFormError(getRequestErrorMessage(requestError));

    } finally {

      setIsSaving(false);

    }

  }

  async function handleDownload(attachment: Attachment) {

    setActionAttachmentId(attachment.id);

    setError('');
    setSuccess('');

    try {

      await downloadAttachment(attachment);
      setSuccess(`Download de "${attachment.originalName}" iniciado.`);

    } catch {

      setError('Não foi possível baixar o anexo.');

    } finally {

      setActionAttachmentId(null);

    }

  }

  async function handleRemove(attachment: Attachment) {

    if (!canManageAttachments) {

      return;

    }

    const confirmed = window.confirm(

      `Deseja realmente remover o anexo "${attachment.originalName}"?`,

    );

    if (!confirmed) {

      return;

    }

    setActionAttachmentId(attachment.id);

    setError('');
    setSuccess('');

    try {

      await removeAttachment(attachment.id);

      await handleRefresh();
      setSuccess('Anexo removido com sucesso.');

    } catch {

      setError('Não foi possível remover o anexo.');

    } finally {

      setActionAttachmentId(null);

    }

  }

  if (isLoading) {

    return (

      <LoadingState

        title="Carregando anexos"

        description="Buscando arquivos vinculados ao sistema."

      />

    );

  }

  return (

    <div className="attachments-page">

      <PageHeader

        eyebrow="Arquivos"

        title="Anexos"

        description="Consulte e gerencie arquivos vinculados a empresas, tarefas e atendimentos técnicos."

        icon={Paperclip}

        actions={

          canManageAttachments ? (

            <ActionButton

              type="button"

              icon={Plus}

              variant="primary"

              onClick={openCreateForm}

            >

              Novo anexo

            </ActionButton>

          ) : undefined

        }

        meta={

          <>

            <MetaPill icon={Files}>{attachments.length} arquivo(s)</MetaPill>

            <MetaPill icon={Camera} tone="info">

              {servicePhotos} foto(s)

            </MetaPill>

            <MetaPill icon={HardDrive}>{formatFileSize(totalSize)}</MetaPill>

          </>

        }

      />

      {!canManageAttachments ? (

        <InlineNotice

          tone="info"

          icon={FileText}

          title="Acesso somente para consulta"

          description="Seu perfil pode visualizar e baixar anexos, mas não pode enviar ou remover arquivos."

        />

      ) : null}

      {success ? (
        <InlineNotice
          tone="success"
          icon={CheckCircle2}
          title={success}
          description="A operação foi concluída."
        />
      ) : null}

      <CollapsibleSection

        title="Resumo dos anexos"

        openDescription="Indicadores dos arquivos cadastrados estão visíveis."

        closedDescription="Indicadores gerais estão ocultos para liberar espaço na tela."

        openLabel="Ocultar resumo"

        closedLabel="Mostrar resumo"

        storageKey="cryomap.attachments.summary-open"

        defaultOpen

        defaultOpenOnMobile={false}

        className="attachments-summary-disclosure"

        contentClassName="attachments-summary"

        variant="section"

      >

        <MetricCard

          label="Total"

          value={attachments.length}

          detail="Arquivos cadastrados"

          icon={Files}

          tone="info"

        />

        <MetricCard

          label="Fotos de serviço"

          value={servicePhotos}

          detail="Registros fotográficos"

          icon={Camera}

          tone="info"

        />

        <MetricCard

          label="Plantas baixas"

          value={floorPlans}

          detail="Documentação de ambientes"

          icon={Image}

          tone="neutral"

        />

        <MetricCard

          label="Em tarefas"

          value={linkedToTasks}

          detail="Arquivos ligados a tarefas"

          icon={ClipboardList}

          tone="warning"

        />

        <MetricCard

          label="Em atendimentos"

          value={linkedToServiceRecords}

          detail="Arquivos ligados a atendimentos"

          icon={Wrench}

          tone="success"

        />

        <MetricCard

          label="Tamanho total"

          value={formatFileSize(totalSize)}

          detail="Volume armazenado"

          icon={HardDrive}

          tone="neutral"

        />

      </CollapsibleSection>

      {isFormOpen && canManageAttachments ? (

        <section className="attachment-form-panel">

          <div className="attachment-form-header">

            <div>

              <span>Upload</span>

              <h2>Novo anexo</h2>

              <p>

                Selecione os vínculos do arquivo e envie um ou mais documentos.

              </p>

            </div>

            <ActionButton
              type="button"
              variant="ghost"
              onClick={closeForm}
              disabled={isSaving}
            >
              Fechar
            </ActionButton>

          </div>

          <InlineNotice

            tone="info"

            icon={Upload}

            title="Vínculo obrigatório"

            description="O anexo precisa estar associado a pelo menos uma empresa, tarefa ou atendimento. O limite é de 10 MB por arquivo."

          />

          <form className="attachment-form" onSubmit={handleSubmit}>

            <label>

              Empresa

              <select

                value={formData.companyId}

                onChange={(event) => {

                  updateFormField('companyId', event.target.value);

                  updateFormField('taskId', '');

                  updateFormField('serviceRecordId', '');

                }}

              >

                <option value="">Sem empresa direta</option>

                {companies.map((company) => (

                  <option key={company.id} value={company.id}>

                    {company.name}

                  </option>

                ))}

              </select>

            </label>

            <label>

              Tarefa

              <select

                value={formData.taskId}

                onChange={(event) => {

                  updateFormField('taskId', event.target.value);

                  updateFormField('serviceRecordId', '');

                }}

              >

                <option value="">Sem tarefa</option>

                {tasks.map((task) => (

                  <option key={task.id} value={task.id}>

                    {task.title}

                  </option>

                ))}

              </select>

            </label>

            <label>

              Atendimento

              <select

                value={formData.serviceRecordId}

                onChange={(event) =>

                  updateFormField('serviceRecordId', event.target.value)

                }

              >

                <option value="">Sem atendimento</option>

                {serviceRecords.map((serviceRecord) => (

                  <option key={serviceRecord.id} value={serviceRecord.id}>

                    {serviceRecord.task?.title ??

                      `Atendimento ${shortId(serviceRecord.id)}`}

                  </option>

                ))}

              </select>

            </label>

            <label>

              Tipo

              <select

                value={formData.type}

                onChange={(event) =>

                  updateFormField('type', event.target.value as AttachmentType)

                }

              >

                {attachmentTypeOptions.map((option) => (

                  <option key={option.value} value={option.value}>

                    {option.label}

                  </option>

                ))}

              </select>

            </label>

            <label className="attachment-form-wide">

              Arquivos *

              <input

                ref={fileInputRef}

                type="file"

                multiple

                onChange={(event) =>

                  updateFormField(

                    'files',

                    Array.from(event.target.files ?? []),

                  )

                }

              />

              <small>

                Você pode selecionar mais de um arquivo. Limite: 10 MB por

                arquivo.

              </small>

            </label>

            {formData.files.length > 0 ? (

              <div className="attachment-selected-file">

                <div className="attachment-selected-file-summary">

                  <div>

                    <File size={16} strokeWidth={2} />

                    <strong>

                      {formData.files.length} arquivo(s) selecionado(s)

                    </strong>

                  </div>

                  <span>{formatFileSize(selectedFilesSize)}</span>

                </div>

                <div className="attachment-selected-file-list">

                  {formData.files.map((file) => (

                    <small key={`${file.name}-${file.size}-${file.lastModified}`}>

                      {file.name} · {formatFileSize(file.size)}

                    </small>

                  ))}

                </div>

              </div>

            ) : null}

            {formError ? (

              <strong className="attachment-form-error">{formError}</strong>

            ) : null}

            <div className="attachment-form-actions">

              <ActionButton

                type="button"

                variant="secondary"

                onClick={closeForm}

                disabled={isSaving}

              >

                Cancelar

              </ActionButton>

              <ActionButton

                type="submit"

                icon={Upload}

                variant="primary"

                disabled={isSaving}

              >

                {isSaving ? 'Enviando...' : 'Enviar anexos'}

              </ActionButton>

            </div>

          </form>

        </section>

      ) : null}

      <section className="attachments-panel">

        <div className="attachments-panel-header">

          <div>

            <span>Biblioteca</span>

            <h2>Lista de anexos</h2>

            <p>

              {filteredAttachments.length} arquivo(s) exibido(s) de{' '}

              {attachments.length} carregado(s)

            </p>

          </div>

          <ActionButton

            type="button"

            icon={RefreshCw}

            onClick={() => void handleRefresh()}

          >

            Atualizar

          </ActionButton>

        </div>

        <CollapsibleSection

          title="Filtros"

          openDescription="Refine a lista por empresa, tarefa, atendimento, usuário, tipo ou busca textual."

          closedDescription={

            activeFilterCount > 0

              ? `${activeFilterCount} filtro(s) ativo(s).`

              : 'Nenhum filtro específico selecionado.'

          }

          openLabel="Ocultar filtros"

          closedLabel="Filtros"

          storageKey="cryomap.attachments.filters-open"

          defaultOpen={false}

          defaultOpenOnMobile={false}

          count={activeFilterCount}

          className="attachments-filters-disclosure"

          contentClassName="attachments-filter-area"

          variant="toolbar"

        >

          <div className="attachments-actions">

            <label className="attachments-filter-field">

              <span>Empresa</span>

              <select

                value={selectedCompanyId}

                onChange={(event) => {

                  setSelectedCompanyId(event.target.value);

                  setSelectedTaskId('');

                  setSelectedServiceRecordId('');

                  setSelectedUploadedByUserId('');

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

            <label className="attachments-filter-field">

              <span>Tarefa</span>

              <select

                value={selectedTaskId}

                onChange={(event) => {

                  setSelectedTaskId(event.target.value);

                  setSelectedServiceRecordId('');

                }}

              >

                <option value="">Todas as tarefas</option>

                {tasks.map((task) => (

                  <option key={task.id} value={task.id}>

                    {task.title}

                  </option>

                ))}

              </select>

            </label>

            <label className="attachments-filter-field">

              <span>Atendimento</span>

              <select

                value={selectedServiceRecordId}

                onChange={(event) =>

                  setSelectedServiceRecordId(event.target.value)

                }

              >

                <option value="">Todos os atendimentos</option>

                {serviceRecords.map((serviceRecord) => (

                  <option key={serviceRecord.id} value={serviceRecord.id}>

                    {serviceRecord.task?.title ??

                      `Atendimento ${shortId(serviceRecord.id)}`}

                  </option>

                ))}

              </select>

            </label>

            <label className="attachments-filter-field">

              <span>Enviado por</span>

              <select

                value={selectedUploadedByUserId}

                onChange={(event) =>

                  setSelectedUploadedByUserId(event.target.value)

                }

              >

                <option value="">Todos os usuários</option>

                {users.map((attachmentUser) => (

                  <option key={attachmentUser.id} value={attachmentUser.id}>

                    {attachmentUser.name}

                  </option>

                ))}

              </select>

            </label>

            <label className="attachments-filter-field">

              <span>Tipo</span>

              <select

                value={selectedType}

                onChange={(event) => setSelectedType(event.target.value)}

              >

                <option value="">Todos os tipos</option>

                {attachmentTypeOptions.map((option) => (

                  <option key={option.value} value={option.value}>

                    {option.label}

                  </option>

                ))}

              </select>

            </label>

            <label className="attachments-filter-field attachments-search-field">

              <span>

                <Search size={13} strokeWidth={2.1} aria-hidden="true" />

                Busca

              </span>

              <input

                type="search"

                placeholder="Buscar por arquivo, empresa, tarefa..."

                value={search}

                onChange={(event) => setSearch(event.target.value)}

              />

            </label>

            <div className="attachments-filter-actions">

              <ActionButton

                type="button"

                icon={RotateCcw}

                variant="secondary"

                disabled={activeFilterCount === 0}

                onClick={clearFilters}

              >

                Limpar filtros

              </ActionButton>

            </div>

          </div>

        </CollapsibleSection>

        {error ? (

          <InlineNotice

            tone="danger"

            icon={TriangleAlert}

            title={error}

            description="Verifique sua conexão e tente novamente. Se necessário, atualize a lista."

            action={

              <ActionButton

                type="button"

                icon={RefreshCw}

                variant="danger"

                onClick={() => void handleRefresh()}

              >

                Atualizar lista

              </ActionButton>

            }

          />

        ) : null}

        {!error && filteredAttachments.length === 0 ? (

          <EmptyState

            icon={Paperclip}

            title="Nenhum anexo encontrado"

            description="Envie um anexo ou ajuste os filtros para visualizar arquivos."

          />

        ) : null}

        {!error && filteredAttachments.length > 0 ? (

          <>

            <div className="attachments-mobile-list">

              {filteredAttachments.map((attachment) => (

                <AttachmentMobileCard

                  key={attachment.id}

                  attachment={attachment}

                  canManageAttachments={canManageAttachments}

                  isActionPending={actionAttachmentId === attachment.id}

                  onDownload={handleDownload}

                  onRemove={handleRemove}

                />

              ))}

            </div>

            <div className="attachments-table-wrapper">

              <table className="attachments-table">

                <thead>

                  <tr>

                    <th>Arquivo</th>

                    <th>Vínculo</th>

                    <th>Tipo</th>

                    <th>Enviado por</th>

                    <th>Detalhes</th>

                    <th>Ações</th>

                  </tr>

                </thead>

                <tbody>

                  {filteredAttachments.map((attachment) => (

                    <tr key={attachment.id}>

                      <td>

                        <div className="attachment-table-primary">

                          <AttachmentFileIcon attachment={attachment} />

                          <div>

                            <strong>{attachment.originalName}</strong>

                            <span>{attachment.mimeType}</span>

                            <small>ID {shortId(attachment.id)}</small>

                          </div>

                        </div>

                      </td>

                      <td>

                        <AttachmentLinks attachment={attachment} />

                      </td>

                      <td>

                        <AttachmentTypeBadge type={attachment.type} />

                      </td>

                      <td>

                        <div className="attachment-uploader">

                          <UserRound size={13} strokeWidth={2} />

                          <div>

                            <strong>

                              {attachment.uploadedByUser?.name ?? 'Não informado'}

                            </strong>

                            <small>

                              {attachment.uploadedByUser?.email ?? '-'}

                            </small>

                          </div>

                        </div>

                      </td>

                      <td>

                        <div className="attachment-details">

                          <span>{formatFileSize(attachment.size)}</span>

                          <small>{formatDateTime(attachment.createdAt)}</small>

                        </div>

                      </td>

                      <td>

                        <div className="attachment-row-actions">

                          <button

                            type="button"

                            className="attachment-icon-action"

                            title="Baixar anexo"

                            aria-label={`Baixar ${attachment.originalName}`}

                            disabled={actionAttachmentId === attachment.id}

                            onClick={() => void handleDownload(attachment)}

                          >

                            <Download size={15} strokeWidth={2} />

                          </button>

                          {canManageAttachments ? (

                            <button

                              type="button"

                              className="attachment-icon-action attachment-icon-action--danger"

                              title="Remover anexo"

                              aria-label={`Remover ${attachment.originalName}`}

                              disabled={actionAttachmentId === attachment.id}

                              onClick={() => void handleRemove(attachment)}

                            >

                              <CircleOff size={15} strokeWidth={2} />

                            </button>

                          ) : (

                            <StatusBadge tone="neutral">

                              Somente consulta

                            </StatusBadge>

                          )}

                        </div>

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

type AttachmentMobileCardProps = {

  attachment: Attachment;

  canManageAttachments: boolean;

  isActionPending: boolean;

  onDownload: (attachment: Attachment) => Promise<void>;

  onRemove: (attachment: Attachment) => Promise<void>;

};

function AttachmentMobileCard({

  attachment,

  canManageAttachments,

  isActionPending,

  onDownload,

  onRemove,

}: AttachmentMobileCardProps) {

  return (

    <article className="attachment-mobile-card">

      <div className="attachment-mobile-card-header">

        <div className="attachment-mobile-file">

          <AttachmentFileIcon attachment={attachment} />

          <div>

            <span>{attachment.mimeType}</span>

            <strong>{attachment.originalName}</strong>

            <small>ID {shortId(attachment.id)}</small>

          </div>

        </div>

        <AttachmentTypeBadge type={attachment.type} />

      </div>

      <AttachmentLinks attachment={attachment} />

      <div className="attachment-mobile-info">

        <div>

          <UserRound size={14} strokeWidth={2} />

          <div>

            <span>Enviado por</span>

            <strong>

              {attachment.uploadedByUser?.name ?? 'Não informado'}

            </strong>

            <small>{attachment.uploadedByUser?.email ?? '-'}</small>

          </div>

        </div>

        <div>

          <HardDrive size={14} strokeWidth={2} />

          <div>

            <span>Tamanho</span>

            <strong>{formatFileSize(attachment.size)}</strong>

          </div>

        </div>

        <div>

          <FileText size={14} strokeWidth={2} />

          <div>

            <span>Data</span>

            <strong>{formatDateTime(attachment.createdAt)}</strong>

          </div>

        </div>

      </div>

      <div className="attachment-mobile-card-actions">

        <ActionButton

          type="button"

          icon={Download}

          variant="secondary"

          disabled={isActionPending}

          onClick={() => void onDownload(attachment)}

        >

          Baixar

        </ActionButton>

        {canManageAttachments ? (

          <ActionButton

            type="button"

            icon={CircleOff}

            variant="danger"

            disabled={isActionPending}

            onClick={() => void onRemove(attachment)}

          >

            Remover

          </ActionButton>

        ) : null}

      </div>

    </article>

  );

}

type AttachmentLinksProps = {

  attachment: Attachment;

};

function AttachmentLinks({ attachment }: AttachmentLinksProps) {

  const hasLinks =

    attachment.company ||

    attachment.task ||

    attachment.serviceRecord;

  if (!hasLinks) {

    return (

      <div className="attachment-links attachment-links--empty">

        <Link2 size={13} strokeWidth={2} />

        <span>Sem vínculo exibido</span>

      </div>

    );

  }

  return (

    <div className="attachment-links">

      {attachment.company ? (

        <span>

          <Building2 size={13} strokeWidth={2} />

          {attachment.company.name}

        </span>

      ) : null}

      {attachment.task ? (

        <span>

          <ClipboardList size={13} strokeWidth={2} />

          <span>

            {attachment.task.title}

            {attachment.task.status ? (

              <small>{formatTaskStatus(attachment.task.status)}</small>

            ) : null}

          </span>

        </span>

      ) : null}

      {attachment.serviceRecord ? (

        <span>

          <Wrench size={13} strokeWidth={2} />

          <span>

            {attachment.serviceRecord.finishedAt

              ? 'Atendimento finalizado'

              : 'Atendimento em andamento'}

            <small>

              {formatDateTime(attachment.serviceRecord.startedAt)}

            </small>

          </span>

        </span>

      ) : null}

    </div>

  );

}

function AttachmentFileIcon({ attachment }: { attachment: Attachment }) {

  const className = 'attachment-file-icon';

  if (attachment.mimeType.startsWith('image/')) {

    return <FileImage className={className} size={18} strokeWidth={2} />;

  }

  if (

    attachment.mimeType.includes('pdf') ||

    attachment.mimeType.includes('document') ||

    attachment.mimeType.includes('text')

  ) {

    return <FileText className={className} size={18} strokeWidth={2} />;

  }

  return <File className={className} size={18} strokeWidth={2} />;

}

function AttachmentTypeBadge({ type }: { type: AttachmentType }) {

  return (

    <StatusBadge tone={getAttachmentTypeTone(type)}>

      {formatAttachmentType(type)}

    </StatusBadge>

  );

}

function getAttachmentTypeTone(type: AttachmentType): UiTone {

  if (type === 'SERVICE_PHOTO') {

    return 'info';

  }

  if (type === 'AUVO_REPORT') {

    return 'success';

  }

  if (type === 'FLOOR_PLAN') {

    return 'warning';

  }

  return 'neutral';

}

function formatAttachmentType(value: string) {

  const labels: Record<string, string> = {

    SERVICE_PHOTO: 'Foto de serviço',

    AUVO_REPORT: 'Relatório Auvo',

    COMPANY_LOGO: 'Logo da empresa',

    FLOOR_PLAN: 'Planta baixa',

    OTHER: 'Outro',

  };

  return labels[value] ?? value;

}

function formatTaskStatus(value: string) {

  const labels: Record<string, string> = {

    OPEN: 'Aberta',

    IN_PROGRESS: 'Em andamento',

    DONE: 'Concluída',

    CANCELED: 'Cancelada',

    OVERDUE: 'Atrasada',

  };

  return labels[value] ?? value;

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

function shortId(value: string) {

  return value.slice(0, 8).toUpperCase();

}

function formatDateTime(value?: string | null) {

  if (!value) {

    return '-';

  }

  return new Intl.DateTimeFormat('pt-BR', {

    day: '2-digit',

    month: '2-digit',

    year: 'numeric',

    hour: '2-digit',

    minute: '2-digit',

  }).format(new Date(value));

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

  return 'Não foi possível enviar os anexos.';

}
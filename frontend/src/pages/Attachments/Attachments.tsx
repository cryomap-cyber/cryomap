import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';

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
  file: File | null;
};

const emptyFormData: AttachmentFormData = {
  companyId: '',
  taskId: '',
  serviceRecordId: '',
  type: 'OTHER',
  file: null,
};

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

  function openCreateForm() {
    if (!canManageAttachments) {
      return;
    }

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

  function closeForm() {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setFormData(emptyFormData);
    setFormError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

    if (!formData.companyId && !formData.taskId && !formData.serviceRecordId) {
      setFormError('Vincule o anexo a uma empresa, tarefa ou atendimento.');
      return;
    }

    if (!formData.file) {
      setFormError('Selecione um arquivo.');
      return;
    }

    if (formData.file.size > 10 * 1024 * 1024) {
      setFormError('O arquivo deve ter no máximo 10 MB.');
      return;
    }

    setIsSaving(true);

    try {
      await createAttachment({
        file: formData.file,
        companyId: formData.companyId || undefined,
        taskId: formData.taskId || undefined,
        serviceRecordId: formData.serviceRecordId || undefined,
        type: formData.type,
      });

      closeForm();
      await handleRefresh();
    } catch (requestError) {
      setFormError(getRequestErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDownload(attachment: Attachment) {
    setActionAttachmentId(attachment.id);
    setError('');

    try {
      await downloadAttachment(attachment);
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

    try {
      await removeAttachment(attachment.id);
      await handleRefresh();
    } catch {
      setError('Não foi possível remover o anexo.');
    } finally {
      setActionAttachmentId(null);
    }
  }

  if (isLoading) {
    return <p>Carregando anexos...</p>;
  }

  return (
    <div className="attachments-page">
      <header className="attachments-header">
        <div>
          <span>Arquivos</span>
          <h1>Anexos</h1>
          <p>
            Envie e acompanhe arquivos vinculados a empresas, tarefas e
            atendimentos técnicos.
          </p>
        </div>

        {canManageAttachments ? (
          <button type="button" onClick={openCreateForm}>
            Novo anexo
          </button>
        ) : null}
      </header>

      <section className="attachments-summary">
        <SummaryCard title="Total" value={attachments.length} />
        <SummaryCard title="Fotos de serviço" value={servicePhotos} />
        <SummaryCard title="Plantas baixas" value={floorPlans} />
        <SummaryCard title="Em tarefas" value={linkedToTasks} />
        <SummaryCard title="Em atendimentos" value={linkedToServiceRecords} />
        <SummaryCard title="Tamanho total" value={formatFileSize(totalSize)} />
      </section>

      {isFormOpen && canManageAttachments ? (
        <section className="attachment-form-panel">
          <div className="attachment-form-header">
            <div>
              <span>Upload</span>
              <h2>Novo anexo</h2>
            </div>

            <button type="button" onClick={closeForm}>
              Fechar
            </button>
          </div>

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
                  updateFormField(
                    'type',
                    event.target.value as AttachmentType,
                  )
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
              Arquivo *
              <input
                ref={fileInputRef}
                type="file"
                onChange={(event) =>
                  updateFormField('file', event.target.files?.[0] ?? null)
                }
              />
              <small>Limite: 10 MB por arquivo.</small>
            </label>

            {formData.file ? (
              <div className="attachment-selected-file">
                <strong>{formData.file.name}</strong>
                <span>{formatFileSize(formData.file.size)}</span>
              </div>
            ) : null}

            {formError ? (
              <strong className="attachment-form-error">{formError}</strong>
            ) : null}

            <div className="attachment-form-actions">
              <button type="button" onClick={closeForm}>
                Cancelar
              </button>

              <button type="submit" disabled={isSaving}>
                {isSaving ? 'Enviando...' : 'Enviar anexo'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="attachments-panel">
        <div className="attachments-panel-header">
          <div>
            <h2>Lista de anexos</h2>
            <p>{filteredAttachments.length} arquivo(s) encontrado(s)</p>
          </div>

          <div className="attachments-actions">
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

            <select
              value={selectedUploadedByUserId}
              onChange={(event) =>
                setSelectedUploadedByUserId(event.target.value)
              }
            >
              <option value="">Todos os usuários</option>

              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>

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

            <input
              type="search"
              placeholder="Buscar por arquivo, empresa, tarefa..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <button type="button" onClick={handleRefresh}>
              Atualizar
            </button>
          </div>
        </div>

        {error ? (
          <div className="attachments-error">
            <strong>{error}</strong>

            <button type="button" onClick={handleRefresh}>
              Tentar novamente
            </button>
          </div>
        ) : null}

        {!error && filteredAttachments.length === 0 ? (
          <p className="attachments-empty">
            Nenhum anexo encontrado para os filtros selecionados.
          </p>
        ) : null}

        {!error && filteredAttachments.length > 0 ? (
          <div className="attachments-table-wrapper">
            <table className="attachments-table">
              <thead>
                <tr>
                  <th>Arquivo</th>
                  <th>Tipo</th>
                  <th>Empresa</th>
                  <th>Tarefa</th>
                  <th>Atendimento</th>
                  <th>Enviado por</th>
                  <th>Tamanho</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {filteredAttachments.map((attachment) => (
                  <tr key={attachment.id}>
                    <td>
                      <strong>{attachment.originalName}</strong>
                      <small>
                        {attachment.mimeType} · {shortId(attachment.id)}
                      </small>
                    </td>

                    <td>
                      <span className="attachment-type-badge">
                        {formatAttachmentType(attachment.type)}
                      </span>
                    </td>

                    <td>{attachment.company?.name ?? '-'}</td>

                    <td>
                      <span>{attachment.task?.title ?? '-'}</span>
                      {attachment.task?.status ? (
                        <small>{attachment.task.status}</small>
                      ) : null}
                    </td>

                    <td>
                      {attachment.serviceRecord ? (
                        <>
                          <span>
                            {attachment.serviceRecord.finishedAt
                              ? 'Finalizado'
                              : 'Em andamento'}
                          </span>
                          <small>
                            {formatDateTime(attachment.serviceRecord.startedAt)}
                          </small>
                        </>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td>
                      <span>{attachment.uploadedByUser?.name ?? '-'}</span>
                      {attachment.uploadedByUser?.email ? (
                        <small>{attachment.uploadedByUser.email}</small>
                      ) : null}
                    </td>

                    <td>{formatFileSize(attachment.size)}</td>

                    <td>{formatDateTime(attachment.createdAt)}</td>

                    <td>
                      <div className="attachment-row-actions">
                        <button
                          type="button"
                          disabled={actionAttachmentId === attachment.id}
                          onClick={() => void handleDownload(attachment)}
                        >
                          Baixar
                        </button>

                        {canManageAttachments ? (
                          <button
                            type="button"
                            disabled={actionAttachmentId === attachment.id}
                            onClick={() => void handleRemove(attachment)}
                          >
                            Remover
                          </button>
                        ) : (
                          <span className="attachment-readonly-badge">
                            Somente consulta
                          </span>
                        )}
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
  value: number | string;
};

function SummaryCard({ title, value }: SummaryCardProps) {
  return (
    <article className="attachments-summary-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
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

  return new Date(value).toLocaleString('pt-BR');
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

  return 'Não foi possível enviar o anexo.';
}

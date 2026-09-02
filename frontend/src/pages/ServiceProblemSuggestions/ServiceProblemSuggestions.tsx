import { type FormEvent, useEffect, useMemo, useState } from 'react';

import { EmptyState } from '../../components/Feedback/EmptyState';
import { LoadingState } from '../../components/Feedback/LoadingState';
import {
  createServiceProblemSuggestion,
  getServiceProblemSuggestions,
  removeServiceProblemSuggestion,
  updateServiceProblemSuggestion,
  type CreateServiceProblemSuggestionPayload,
  type UpdateServiceProblemSuggestionPayload,
} from '../../services/service-problem-suggestions';
import type { ServiceProblemSuggestion } from '../../types/service-problem-suggestion';
import './ServiceProblemSuggestions.css';

type SuggestionStatusFilter = '' | 'ACTIVE' | 'INACTIVE';

type ServiceProblemSuggestionFormData = {
  title: string;
  description: string;
  isActive: boolean;
};

const emptyFormData: ServiceProblemSuggestionFormData = {
  title: '',
  description: '',
  isActive: true,
};

export function ServiceProblemSuggestions() {
  const [suggestions, setSuggestions] = useState<ServiceProblemSuggestion[]>(
    [],
  );
  const [selectedStatus, setSelectedStatus] =
    useState<SuggestionStatusFilter>('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSuggestion, setEditingSuggestion] =
    useState<ServiceProblemSuggestion | null>(null);
  const [formData, setFormData] =
    useState<ServiceProblemSuggestionFormData>(emptyFormData);

  async function handleRefresh() {
    setError('');
    setIsLoading(true);

    try {
      const suggestionsData = await getServiceProblemSuggestions({
        includeInactive: true,
      });

      setSuggestions(suggestionsData);
    } catch {
      setError('Não foi possível carregar as sugestões de problemas.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    getServiceProblemSuggestions({
      includeInactive: true,
    })
      .then((suggestionsData) => {
        if (!isMounted) {
          return;
        }

        setSuggestions(suggestionsData);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível carregar as sugestões de problemas.');
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

  const filteredSuggestions = useMemo(() => {
    const normalizedSearch = normalizeSearchText(search);

    return suggestions.filter((suggestion) => {
      const matchesStatus =
        !selectedStatus ||
        (selectedStatus === 'ACTIVE' && suggestion.isActive) ||
        (selectedStatus === 'INACTIVE' && !suggestion.isActive);

      const matchesSearch =
        !normalizedSearch ||
        [
          suggestion.title,
          suggestion.normalizedTitle,
          suggestion.description ?? '',
          suggestion.isActive ? 'ativo' : 'inativo',
        ]
          .join(' ')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [suggestions, selectedStatus, search]);

  const activeSuggestions = suggestions.filter(
    (suggestion) => suggestion.isActive,
  ).length;

  const inactiveSuggestions = suggestions.filter(
    (suggestion) => !suggestion.isActive,
  ).length;

  const suggestionsWithDescription = suggestions.filter((suggestion) =>
    Boolean(suggestion.description),
  ).length;

  function openCreateForm() {
    setEditingSuggestion(null);
    setFormData(emptyFormData);
    setFormError('');
    setIsFormOpen(true);
  }

  function openEditForm(suggestion: ServiceProblemSuggestion) {
    setEditingSuggestion(suggestion);
    setFormData({
      title: suggestion.title,
      description: suggestion.description ?? '',
      isActive: suggestion.isActive,
    });
    setFormError('');
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setEditingSuggestion(null);
    setFormData(emptyFormData);
    setFormError('');
  }

  function updateFormField<K extends keyof ServiceProblemSuggestionFormData>(
    field: K,
    value: ServiceProblemSuggestionFormData[K],
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError('');

    if (formData.title.trim().length < 2) {
      setFormError('Informe uma sugestão com pelo menos 2 caracteres.');
      return;
    }

    setIsSaving(true);

    try {
      if (editingSuggestion) {
        const payload: UpdateServiceProblemSuggestionPayload = {
          title: formData.title.trim(),
          description: nullableValue(formData.description),
          isActive: formData.isActive,
        };

        await updateServiceProblemSuggestion(editingSuggestion.id, payload);
      } else {
        const payload: CreateServiceProblemSuggestionPayload = {
          title: formData.title.trim(),
          description: optionalValue(formData.description),
        };

        await createServiceProblemSuggestion(payload);
      }

      closeForm();
      await handleRefresh();
    } catch (requestError) {
      setFormError(getRequestErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleActivate(suggestion: ServiceProblemSuggestion) {
    const confirmed = window.confirm(
      `Deseja ativar a sugestão "${suggestion.title}"?`,
    );

    if (!confirmed) {
      return;
    }

    setError('');

    try {
      await updateServiceProblemSuggestion(suggestion.id, {
        isActive: true,
      });

      await handleRefresh();
    } catch {
      setError('Não foi possível ativar a sugestão.');
    }
  }

  async function handleInactivate(suggestion: ServiceProblemSuggestion) {
    const confirmed = window.confirm(
      `Deseja inativar a sugestão "${suggestion.title}"?`,
    );

    if (!confirmed) {
      return;
    }

    setError('');

    try {
      await removeServiceProblemSuggestion(suggestion.id);
      await handleRefresh();
    } catch {
      setError('Não foi possível inativar a sugestão.');
    }
  }

  if (isLoading) {
    return (
      <LoadingState
        title="Carregando sugestões..."
        description="Buscando problemas padronizados cadastrados."
      />
    );
  }

  return (
    <div className="problem-suggestions-page">
      <header className="problem-suggestions-header">
        <div>
          <span>Atendimentos</span>
          <h1>Sugestões de problemas</h1>
          <p>
            Cadastre problemas e componentes recorrentes para acelerar o
            preenchimento dos atendimentos técnicos com autocomplete.
          </p>
        </div>

        <button type="button" onClick={openCreateForm}>
          Nova sugestão
        </button>
      </header>

      <section className="problem-suggestions-summary">
        <SummaryCard title="Total" value={suggestions.length} />
        <SummaryCard title="Ativas" value={activeSuggestions} />
        <SummaryCard
          title="Inativas"
          value={inactiveSuggestions}
          danger={inactiveSuggestions > 0}
        />
        <SummaryCard
          title="Com descrição"
          value={suggestionsWithDescription}
        />
      </section>

      {isFormOpen ? (
        <section className="problem-suggestion-form-panel">
          <div className="problem-suggestion-form-header">
            <div>
              <span>Sugestão</span>
              <h2>
                {editingSuggestion ? 'Editar sugestão' : 'Nova sugestão'}
              </h2>
            </div>

            <button type="button" onClick={closeForm}>
              Fechar
            </button>
          </div>

          <form
            className="problem-suggestion-form"
            onSubmit={handleSubmit}
          >
            <label>
              Problema/componente *
              <input
                type="text"
                value={formData.title}
                onChange={(event) =>
                  updateFormField('title', event.target.value)
                }
                placeholder="Ex: Compressor travou"
              />
            </label>

            <label>
              Status
              <select
                value={formData.isActive ? 'ACTIVE' : 'INACTIVE'}
                disabled={!editingSuggestion}
                onChange={(event) =>
                  updateFormField(
                    'isActive',
                    event.target.value === 'ACTIVE',
                  )
                }
              >
                <option value="ACTIVE">Ativa</option>
                <option value="INACTIVE">Inativa</option>
              </select>
            </label>

            <label className="problem-suggestion-form-wide">
              Descrição
              <textarea
                value={formData.description}
                onChange={(event) =>
                  updateFormField('description', event.target.value)
                }
                placeholder="Descrição opcional para orientar o técnico..."
                rows={4}
              />
            </label>

            {formError ? (
              <strong className="problem-suggestion-form-error">
                {formError}
              </strong>
            ) : null}

            <div className="problem-suggestion-form-actions">
              <button type="button" onClick={closeForm}>
                Cancelar
              </button>

              <button type="submit" disabled={isSaving}>
                {isSaving
                  ? 'Salvando...'
                  : editingSuggestion
                    ? 'Salvar alterações'
                    : 'Cadastrar sugestão'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="problem-suggestions-panel">
        <div className="problem-suggestions-panel-header">
          <div>
            <h2>Lista de sugestões</h2>
            <p>{filteredSuggestions.length} sugestão(ões) encontrada(s)</p>
          </div>

          <div className="problem-suggestions-actions">
            <select
              value={selectedStatus}
              onChange={(event) =>
                setSelectedStatus(event.target.value as SuggestionStatusFilter)
              }
            >
              <option value="">Todos os status</option>
              <option value="ACTIVE">Ativas</option>
              <option value="INACTIVE">Inativas</option>
            </select>

            <input
              type="search"
              placeholder="Buscar por problema, componente ou descrição..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <button type="button" onClick={() => void handleRefresh()}>
              Atualizar
            </button>
          </div>
        </div>

        {error ? (
          <div className="problem-suggestions-error">
            <strong>{error}</strong>

            <button type="button" onClick={() => void handleRefresh()}>
              Tentar novamente
            </button>
          </div>
        ) : null}

        {!error && filteredSuggestions.length === 0 ? (
          <EmptyState
            title="Nenhuma sugestão encontrada."
            description="Cadastre uma sugestão ou ajuste os filtros para visualizar resultados."
          />
        ) : null}

        {!error && filteredSuggestions.length > 0 ? (
          <div className="problem-suggestions-table-wrapper">
            <table className="problem-suggestions-table">
              <thead>
                <tr>
                  <th>Sugestão</th>
                  <th>Descrição</th>
                  <th>Status</th>
                  <th>Normalização</th>
                  <th>Criada em</th>
                  <th>Atualizada em</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {filteredSuggestions.map((suggestion) => (
                  <tr key={suggestion.id}>
                    <td>
                      <strong>{suggestion.title}</strong>
                      <small>{shortId(suggestion.id)}</small>
                    </td>

                    <td>{suggestion.description || '-'}</td>

                    <td>
                      <SuggestionStatusBadge isActive={suggestion.isActive} />
                    </td>

                    <td>
                      <code>{suggestion.normalizedTitle}</code>
                    </td>

                    <td>{formatDateTime(suggestion.createdAt)}</td>

                    <td>{formatDateTime(suggestion.updatedAt)}</td>

                    <td>
                      <div className="problem-suggestion-row-actions">
                        <button
                          type="button"
                          onClick={() => openEditForm(suggestion)}
                        >
                          Editar
                        </button>

                        {suggestion.isActive ? (
                          <button
                            type="button"
                            onClick={() => void handleInactivate(suggestion)}
                          >
                            Inativar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleActivate(suggestion)}
                          >
                            Ativar
                          </button>
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
  danger?: boolean;
};

function SummaryCard({ title, value, danger = false }: SummaryCardProps) {
  return (
    <article
      className={
        danger
          ? 'problem-suggestions-summary-card danger'
          : 'problem-suggestions-summary-card'
      }
    >
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}

type SuggestionStatusBadgeProps = {
  isActive: boolean;
};

function SuggestionStatusBadge({ isActive }: SuggestionStatusBadgeProps) {
  if (isActive) {
    return (
      <span className="problem-suggestion-status active">
        Ativa
      </span>
    );
  }

  return (
    <span className="problem-suggestion-status inactive">
      Inativa
    </span>
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

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
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

  return 'Não foi possível salvar a sugestão.';
}

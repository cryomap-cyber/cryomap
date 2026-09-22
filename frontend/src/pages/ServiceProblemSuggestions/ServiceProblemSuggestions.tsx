import { type FormEvent, useEffect, useMemo, useState } from 'react';

import {

  AlignLeft,

  CheckCircle2,

  CircleOff,

  Edit3,

  Filter,

  Hash,

  Lightbulb,

  Plus,

  Power,

  PowerOff,

  RefreshCw,

  Save,

  Search,

  Sparkles,

  X,

} from 'lucide-react';

import { CollapsibleSection } from '../../components/CollapsibleSection/CollapsibleSection';

import { EmptyState } from '../../components/Feedback/EmptyState';

import { LoadingState } from '../../components/Feedback/LoadingState';

import {
  ActionButton,
  InlineNotice,
} from '../../components/ui/CryoUi';

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

type SummaryTone = 'default' | 'success' | 'danger' | 'info';

const emptyFormData: ServiceProblemSuggestionFormData = {

  title: '',

  description: '',

  isActive: true,

};

export function ServiceProblemSuggestions() {

  const [suggestions, setSuggestions] = useState<ServiceProblemSuggestion[]>([]);

  const [selectedStatus, setSelectedStatus] =

    useState<SuggestionStatusFilter>('');

  const [search, setSearch] = useState('');

  const [error, setError] = useState('');

  const [success, setSuccess] = useState('');

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

    setSuccess('');

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

  const activeFilterCount = [

    selectedStatus,

    search.trim(),

  ].filter(Boolean).length;

  function openCreateForm() {

    setSuccess('');

    setEditingSuggestion(null);

    setFormData(emptyFormData);

    setFormError('');

    setIsFormOpen(true);

  }

  function openEditForm(suggestion: ServiceProblemSuggestion) {

    setSuccess('');

    setEditingSuggestion(suggestion);

    setFormData({

      title: suggestion.title,

      description: suggestion.description ?? '',

      isActive: suggestion.isActive,

    });

    setFormError('');

    setIsFormOpen(true);

  }

  function resetFormState() {
    setIsFormOpen(false);
    setEditingSuggestion(null);
    setFormData(emptyFormData);
    setFormError('');
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    resetFormState();
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
    setSuccess('');

    if (formData.title.trim().length < 2) {
      setFormError('Informe uma sugestão com pelo menos 2 caracteres.');
      return;
    }

    const successMessage = editingSuggestion
      ? 'Sugestão atualizada com sucesso.'
      : 'Sugestão cadastrada com sucesso.';

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

      resetFormState();
      await handleRefresh();
      setSuccess(successMessage);
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
    setSuccess('');

    try {

      await updateServiceProblemSuggestion(suggestion.id, {

        isActive: true,

      });

      await handleRefresh();
      setSuccess('Sugestão ativada com sucesso.');

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
    setSuccess('');

    try {

      await removeServiceProblemSuggestion(suggestion.id);

      await handleRefresh();
      setSuccess('Sugestão inativada com sucesso.');

    } catch {

      setError('Não foi possível inativar a sugestão.');

    }

  }

  function clearFilters() {

    setSelectedStatus('');

    setSearch('');

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

        <div className="problem-suggestions-header-copy">

          <span className="problem-suggestions-kicker">

            <Sparkles size={15} strokeWidth={2.2} />

            Atendimentos

          </span>

          <h1>Sugestões de problemas</h1>

          <p>

            Padronize problemas e componentes recorrentes para tornar o

            preenchimento dos atendimentos técnicos mais rápido e consistente.

          </p>

        </div>

        <button

          type="button"

          className="problem-suggestions-primary-action"

          onClick={openCreateForm}

        >

          <Plus size={18} strokeWidth={2.3} />

          Nova sugestão

        </button>

      </header>

      <CollapsibleSection

        title="Resumo das sugestões"

        openDescription="Indicadores do catálogo de problemas estão visíveis."

        closedDescription="Indicadores estão ocultos para liberar espaço na tela."

        openLabel="Ocultar resumo"

        closedLabel="Mostrar resumo"

        storageKey="cryomap.problem-suggestions.summary-open"

        defaultOpen

        defaultOpenOnMobile={false}

        className="problem-suggestions-summary-disclosure"

        contentClassName="problem-suggestions-summary"

        variant="section"

      >

        <SummaryCard

          title="Total"

          value={suggestions.length}

          icon={Lightbulb}

        />

        <SummaryCard

          title="Ativas"

          value={activeSuggestions}

          icon={CheckCircle2}

          tone="success"

        />

        <SummaryCard

          title="Inativas"

          value={inactiveSuggestions}

          icon={CircleOff}

          tone={inactiveSuggestions > 0 ? 'danger' : 'default'}

        />

        <SummaryCard

          title="Com descrição"

          value={suggestionsWithDescription}

          icon={AlignLeft}

          tone="info"

        />

      </CollapsibleSection>

      {isFormOpen ? (

        <div className="problem-suggestion-form-layer" role="presentation">

          <button

            type="button"

            className="problem-suggestion-form-backdrop"

            aria-label="Fechar formulário"

            onClick={closeForm}

          />

          <section

            className="problem-suggestion-form-panel"

            aria-label={

              editingSuggestion ? 'Editar sugestão' : 'Nova sugestão'

            }

          >

            <div className="problem-suggestion-form-header">

              <div className="problem-suggestion-form-title">

                <span className="problem-suggestion-form-icon">

                  <Lightbulb size={20} strokeWidth={2.1} />

                </span>

                <div>

                  <span>Sugestão</span>

                  <h2>

                    {editingSuggestion ? 'Editar sugestão' : 'Nova sugestão'}

                  </h2>

                  <p>

                    {editingSuggestion

                      ? 'Atualize o item padronizado usado nos atendimentos.'

                      : 'Cadastre um problema ou componente para reutilização rápida.'}

                  </p>

                </div>

              </div>

              <button

                type="button"

                className="problem-suggestion-form-close"

                aria-label="Fechar"

                onClick={closeForm}

              >

                <X size={19} strokeWidth={2.2} />

              </button>

            </div>

            <form

              className="problem-suggestion-form"

              onSubmit={handleSubmit}

            >

              <label>

                <span>Problema / componente *</span>

                <div className="problem-suggestion-input-wrap">

                  <Lightbulb size={17} strokeWidth={2} />

                  <input

                    type="text"

                    value={formData.title}

                    onChange={(event) =>

                      updateFormField('title', event.target.value)

                    }

                    placeholder="Ex.: Compressor travou"

                    autoFocus

                  />

                </div>

              </label>

              <label>

                <span>Status</span>

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

                {!editingSuggestion ? (

                  <small>Novas sugestões são cadastradas como ativas.</small>

                ) : null}

              </label>

              <label className="problem-suggestion-form-wide">

                <span>Descrição</span>

                <textarea

                  value={formData.description}

                  onChange={(event) =>

                    updateFormField('description', event.target.value)

                  }

                  placeholder="Descrição opcional para orientar o técnico..."

                  rows={5}

                />

              </label>

              {formError ? (

                <strong className="problem-suggestion-form-error">

                  {formError}

                </strong>

              ) : null}

              <div className="problem-suggestion-form-actions">

                <button

                  type="button"

                  className="problem-suggestion-secondary-button"

                  onClick={closeForm}

                  disabled={isSaving}

                >

                  Cancelar

                </button>

                <button

                  type="submit"

                  className="problem-suggestion-save-button"

                  disabled={isSaving}

                >

                  <Save size={17} strokeWidth={2.2} />

                  {isSaving

                    ? 'Salvando...'

                    : editingSuggestion

                      ? 'Salvar alterações'

                      : 'Cadastrar sugestão'}

                </button>

              </div>

            </form>

          </section>

        </div>

      ) : null}

      <section className="problem-suggestions-panel">

        <div className="problem-suggestions-panel-header">

          <div className="problem-suggestions-panel-title">

            <span className="problem-suggestions-panel-icon">

              <Lightbulb size={19} strokeWidth={2.1} />

            </span>

            <div>

              <h2>Catálogo de sugestões</h2>

              <p>

                {filteredSuggestions.length} sugestão(ões) exibida(s) de{' '}

                {suggestions.length} cadastrada(s)

              </p>

            </div>

          </div>

          <button

            type="button"

            className="problem-suggestions-refresh-action"

            onClick={() => void handleRefresh()}

          >

            <RefreshCw size={17} strokeWidth={2.2} />

            Atualizar

          </button>

        </div>

        <CollapsibleSection

          title="Filtros"

          openDescription="Refine o catálogo por status ou busca textual."

          closedDescription={

            activeFilterCount > 0

              ? `${activeFilterCount} filtro(s) ativo(s).`

              : 'Nenhum filtro específico selecionado.'

          }

          openLabel="Ocultar filtros"

          closedLabel="Filtros"

          storageKey="cryomap.problem-suggestions.filters-open"

          defaultOpen={false}

          defaultOpenOnMobile={false}

          count={activeFilterCount}

          className="problem-suggestions-filters-disclosure"

          contentClassName="problem-suggestions-filter-area"

          variant="toolbar"

        >

          <div className="problem-suggestions-actions">

            <label className="problem-suggestions-filter-field">

              <span>Status</span>

              <div className="problem-suggestions-control-wrap">

                <Filter size={16} strokeWidth={2} />

                <select

                  value={selectedStatus}

                  onChange={(event) =>

                    setSelectedStatus(

                      event.target.value as SuggestionStatusFilter,

                    )

                  }

                >

                  <option value="">Todos os status</option>

                  <option value="ACTIVE">Ativas</option>

                  <option value="INACTIVE">Inativas</option>

                </select>

              </div>

            </label>

            <label className="problem-suggestions-filter-field problem-suggestions-search-field">

              <span>Busca</span>

              <div className="problem-suggestions-control-wrap">

                <Search size={16} strokeWidth={2} />

                <input

                  type="search"

                  placeholder="Buscar por problema, componente ou descrição..."

                  value={search}

                  onChange={(event) => setSearch(event.target.value)}

                />

              </div>

            </label>

            <div className="problem-suggestions-filter-actions">

              <button

                type="button"

                className="problem-suggestions-clear-action"

                onClick={clearFilters}

                disabled={activeFilterCount === 0}

              >

                Limpar filtros

              </button>

            </div>

          </div>

        </CollapsibleSection>

        {activeFilterCount > 0 ? (

          <div className="problem-suggestions-filter-status">

            <div>

              <strong>Filtros ativos</strong>

              <span>O catálogo abaixo já está sendo filtrado localmente.</span>

            </div>

            <div className="problem-suggestions-filter-chips">

              {selectedStatus ? (

                <span>

                  Status:{' '}

                  <strong>

                    {selectedStatus === 'ACTIVE' ? 'Ativas' : 'Inativas'}

                  </strong>

                </span>

              ) : null}

              {search.trim() ? (

                <span>

                  Busca: <strong>{search.trim()}</strong>

                </span>

              ) : null}

            </div>

          </div>

        ) : null}

        {success ? (
          <InlineNotice
            title={success}
            description="A alteração já foi aplicada ao catálogo de sugestões."
            tone="success"
            icon={CheckCircle2}
          />
        ) : null}

        {error ? (
          <InlineNotice
            title={error}
            description="Tente atualizar o catálogo novamente."
            tone="danger"
            icon={CircleOff}
            action={
              <ActionButton
                type="button"
                icon={RefreshCw}
                onClick={() => void handleRefresh()}
              >
                Tentar novamente
              </ActionButton>
            }
          />
        ) : null}

        {!error && filteredSuggestions.length === 0 ? (

          <EmptyState

            title="Nenhuma sugestão encontrada."

            description="Cadastre uma sugestão ou ajuste os filtros para visualizar resultados."

          />

        ) : null}

        {!error && filteredSuggestions.length > 0 ? (

          <>

            <div className="problem-suggestions-mobile-list">

              {filteredSuggestions.map((suggestion) => (

                <SuggestionCard

                  key={suggestion.id}

                  suggestion={suggestion}

                  onEdit={openEditForm}

                  onActivate={handleActivate}

                  onInactivate={handleInactivate}

                />

              ))}

            </div>

            <div className="problem-suggestions-table-wrapper">

              <table className="problem-suggestions-table">

                <thead>

                  <tr>

                    <th>Sugestão</th>

                    <th>Descrição</th>

                    <th>Status</th>

                    <th>Normalização</th>

                    <th>Atualização</th>

                    <th>Ações</th>

                  </tr>

                </thead>

                <tbody>

                  {filteredSuggestions.map((suggestion) => (

                    <tr key={suggestion.id}>

                      <td>

                        <div className="problem-suggestion-name-cell">

                          <span className="problem-suggestion-row-icon">

                            <Lightbulb size={17} strokeWidth={2.1} />

                          </span>

                          <div>

                            <strong>{suggestion.title}</strong>

                            <small>

                              <Hash size={12} strokeWidth={2} />

                              {shortId(suggestion.id)}

                            </small>

                          </div>

                        </div>

                      </td>

                      <td>

                        <span className="problem-suggestion-description">

                          {suggestion.description || 'Sem descrição'}

                        </span>

                      </td>

                      <td>

                        <SuggestionStatusBadge

                          isActive={suggestion.isActive}

                        />

                      </td>

                      <td>

                        <code>{suggestion.normalizedTitle}</code>

                      </td>

                      <td>

                        <span>{formatDateTime(suggestion.updatedAt)}</span>

                        <small>

                          Criada em {formatDateTime(suggestion.createdAt)}

                        </small>

                      </td>

                      <td>

                        <div className="problem-suggestion-row-actions">

                          <button

                            type="button"

                            className="edit"

                            onClick={() => openEditForm(suggestion)}

                          >

                            <Edit3 size={15} strokeWidth={2.1} />

                            Editar

                          </button>

                          {suggestion.isActive ? (

                            <button

                              type="button"

                              className="inactivate"

                              onClick={() =>

                                void handleInactivate(suggestion)

                              }

                            >

                              <PowerOff size={15} strokeWidth={2.1} />

                              Inativar

                            </button>

                          ) : (

                            <button

                              type="button"

                              className="activate"

                              onClick={() => void handleActivate(suggestion)}

                            >

                              <Power size={15} strokeWidth={2.1} />

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

          </>

        ) : null}

      </section>

    </div>

  );

}

type SummaryCardProps = {

  title: string;

  value: number | string;

  icon: typeof Lightbulb;

  tone?: SummaryTone;

};

function SummaryCard({

  title,

  value,

  icon: Icon,

  tone = 'default',

}: SummaryCardProps) {

  return (

    <article

      className={`problem-suggestions-summary-card problem-suggestions-summary-card--${tone}`}

    >

      <div className="problem-suggestions-summary-card-header">

        <span className="problem-suggestions-summary-icon">

          <Icon size={18} strokeWidth={2.1} />

        </span>

        <span>{title}</span>

      </div>

      <strong>{value}</strong>

    </article>

  );

}

type SuggestionCardProps = {

  suggestion: ServiceProblemSuggestion;

  onEdit: (suggestion: ServiceProblemSuggestion) => void;

  onActivate: (suggestion: ServiceProblemSuggestion) => Promise<void>;

  onInactivate: (suggestion: ServiceProblemSuggestion) => Promise<void>;

};

function SuggestionCard({

  suggestion,

  onEdit,

  onActivate,

  onInactivate,

}: SuggestionCardProps) {

  return (

    <article className="problem-suggestion-mobile-card">

      <div className="problem-suggestion-mobile-card-header">

        <span className="problem-suggestion-mobile-card-icon">

          <Lightbulb size={18} strokeWidth={2.1} />

        </span>

        <div>

          <strong>{suggestion.title}</strong>

          <small>

            <Hash size={12} strokeWidth={2} />

            {shortId(suggestion.id)}

          </small>

        </div>

        <SuggestionStatusBadge isActive={suggestion.isActive} />

      </div>

      <p>

        {suggestion.description || 'Nenhuma descrição adicional cadastrada.'}

      </p>

      <div className="problem-suggestion-mobile-meta">

        <div>

          <span>Normalização</span>

          <code>{suggestion.normalizedTitle}</code>

        </div>

        <div>

          <span>Atualizada em</span>

          <strong>{formatDateTime(suggestion.updatedAt)}</strong>

        </div>

      </div>

      <div className="problem-suggestion-mobile-actions">

        <button

          type="button"

          className="edit"

          onClick={() => onEdit(suggestion)}

        >

          <Edit3 size={15} strokeWidth={2.1} />

          Editar

        </button>

        {suggestion.isActive ? (

          <button

            type="button"

            className="inactivate"

            onClick={() => void onInactivate(suggestion)}

          >

            <PowerOff size={15} strokeWidth={2.1} />

            Inativar

          </button>

        ) : (

          <button

            type="button"

            className="activate"

            onClick={() => void onActivate(suggestion)}

          >

            <Power size={15} strokeWidth={2.1} />

            Ativar

          </button>

        )}

      </div>

    </article>

  );

}

type SuggestionStatusBadgeProps = {

  isActive: boolean;

};

function SuggestionStatusBadge({ isActive }: SuggestionStatusBadgeProps) {

  return (

    <span

      className={

        isActive

          ? 'problem-suggestion-status active'

          : 'problem-suggestion-status inactive'

      }

    >

      {isActive ? (

        <CheckCircle2 size={13} strokeWidth={2.3} />

      ) : (

        <CircleOff size={13} strokeWidth={2.3} />

      )}

      {isActive ? 'Ativa' : 'Inativa'}

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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {

    return '-';

  }

  return date.toLocaleString('pt-BR');

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
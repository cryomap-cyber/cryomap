import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  TriangleAlert,
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
} from '../../components/ui/CryoUi';
import {
  createCompany,
  getCompanies,
  inactivateCompany,
  updateCompany,
  type CreateCompanyPayload,
} from '../../services/companies';
import type { Company } from '../../types/company';
import './Companies.css';

type CompanyFormData = {
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
};

const emptyFormData: CompanyFormData = {
  name: '',
  cnpj: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
};

export function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>(emptyFormData);

  async function handleRefresh() {
    setError('');
    setIsLoading(true);

    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch {
      setError('Não foi possível carregar as empresas.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    getCompanies()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setCompanies(data);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível carregar as empresas.');
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

  const filteredCompanies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return companies;
    }

    return companies.filter((company) => {
      return [
        company.name,
        company.cnpj,
        company.email ?? '',
        company.phone ?? '',
        company.city ?? '',
        company.state ?? '',
        company.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [companies, search]);

  const activeCompanies = companies.filter(
    (company) => company.status === 'ACTIVE',
  ).length;

  const inactiveCompanies = companies.filter(
    (company) => company.status === 'INACTIVE',
  ).length;

  const activeFilterCount = search.trim() ? 1 : 0;

  function openCreateForm() {
    setEditingCompany(null);
    setFormData(emptyFormData);
    setFormError('');
    setIsFormOpen(true);
  }

  function openEditForm(company: Company) {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      cnpj: company.cnpj,
      email: company.email ?? '',
      phone: company.phone ?? '',
      address: company.address ?? '',
      city: company.city ?? '',
      state: company.state ?? '',
    });
    setFormError('');
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setEditingCompany(null);
    setFormData(emptyFormData);
    setFormError('');
  }

  function updateFormField(field: keyof CompanyFormData, value: string) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Informe o nome da empresa.');
      return;
    }

    if (!formData.cnpj.trim()) {
      setFormError('Informe o CNPJ da empresa.');
      return;
    }

    const payload: CreateCompanyPayload = {
      name: formData.name.trim(),
      cnpj: onlyDigits(formData.cnpj),
      email: optionalValue(formData.email),
      phone: optionalValue(formData.phone),
      address: optionalValue(formData.address),
      city: optionalValue(formData.city),
      state: optionalValue(formData.state)?.toUpperCase(),
    };

    setIsSaving(true);

    try {
      if (editingCompany) {
        await updateCompany(editingCompany.id, payload);
      } else {
        await createCompany(payload);
      }

      closeForm();
      await handleRefresh();
    } catch (requestError) {
      setFormError(getRequestErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleInactivate(company: Company) {
    const confirmed = window.confirm(
      `Deseja realmente inativar a empresa "${company.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await inactivateCompany(company.id);
      await handleRefresh();
    } catch {
      setError('Não foi possível inativar a empresa.');
    }
  }

  if (isLoading) {
    return (
      <LoadingState
        title="Carregando empresas"
        description="Buscando empresas cadastradas."
      />
    );
  }

  return (
    <div className="companies-page">
      <PageHeader
        eyebrow="Cadastros"
        title="Empresas"
        description="Gerencie os clientes cadastrados no CryoMap, seus dados de contato e localização."
        icon={Building2}
        actions={
          <ActionButton
            type="button"
            icon={Plus}
            variant="primary"
            onClick={openCreateForm}
          >
            Nova empresa
          </ActionButton>
        }
        meta={
          <>
            <MetaPill icon={Building2}>{companies.length} empresa(s)</MetaPill>

            <MetaPill icon={CheckCircle2} tone="success">
              {activeCompanies} ativa(s)
            </MetaPill>

            <MetaPill
              icon={Power}
              tone={inactiveCompanies > 0 ? 'neutral' : 'success'}
            >
              {inactiveCompanies} inativa(s)
            </MetaPill>
          </>
        }
      />

      <section className="companies-summary">
        <MetricCard
          label="Total"
          value={companies.length}
          detail="Empresas cadastradas"
          icon={Building2}
          tone="info"
        />

        <MetricCard
          label="Ativas"
          value={activeCompanies}
          detail="Disponíveis para operação"
          icon={CheckCircle2}
          tone="success"
        />

        <MetricCard
          label="Inativas"
          value={inactiveCompanies}
          detail="Fora da operação ativa"
          icon={Power}
          tone="neutral"
        />
      </section>

      {isFormOpen ? (
        <section className="company-form-panel">
          <div className="company-form-header">
            <div>
              <span>Empresa</span>
              <h2>{editingCompany ? 'Editar empresa' : 'Nova empresa'}</h2>
              <p>
                Informe os dados cadastrais, contato e localização do cliente.
              </p>
            </div>

            <ActionButton type="button" variant="ghost" onClick={closeForm}>
              Fechar
            </ActionButton>
          </div>

          <form className="company-form" onSubmit={handleSubmit}>
            <label>
              Nome *
              <input
                value={formData.name}
                onChange={(event) =>
                  updateFormField('name', event.target.value)
                }
                placeholder="Ex: Cliente Demo CryoMap"
              />
            </label>

            <label>
              CNPJ *
              <input
                value={formData.cnpj}
                onChange={(event) =>
                  updateFormField('cnpj', event.target.value)
                }
                placeholder="00.000.000/0000-00"
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={formData.email}
                onChange={(event) =>
                  updateFormField('email', event.target.value)
                }
                placeholder="contato@empresa.com"
              />
            </label>

            <label>
              Telefone
              <input
                value={formData.phone}
                onChange={(event) =>
                  updateFormField('phone', event.target.value)
                }
                placeholder="(00) 00000-0000"
              />
            </label>

            <label className="company-form-wide">
              Endereço
              <input
                value={formData.address}
                onChange={(event) =>
                  updateFormField('address', event.target.value)
                }
                placeholder="Rua, número, bairro"
              />
            </label>

            <label>
              Cidade
              <input
                value={formData.city}
                onChange={(event) =>
                  updateFormField('city', event.target.value)
                }
                placeholder="Cidade"
              />
            </label>

            <label>
              Estado
              <input
                value={formData.state}
                maxLength={2}
                onChange={(event) =>
                  updateFormField('state', event.target.value)
                }
                placeholder="SP"
              />
            </label>

            {formError ? (
              <strong className="company-form-error">{formError}</strong>
            ) : null}

            <div className="company-form-actions">
              <ActionButton
                type="button"
                variant="secondary"
                onClick={closeForm}
              >
                Cancelar
              </ActionButton>

              <ActionButton
                type="submit"
                variant="primary"
                disabled={isSaving}
              >
                {isSaving
                  ? 'Salvando...'
                  : editingCompany
                    ? 'Salvar alterações'
                    : 'Cadastrar empresa'}
              </ActionButton>
            </div>
          </form>
        </section>
      ) : null}

      <section className="companies-panel">
        <div className="companies-panel-header">
          <div>
            <span>Clientes cadastrados</span>
            <h2>Lista de empresas</h2>
            <p>
              {filteredCompanies.length} registro(s) exibido(s) de{' '}
              {companies.length} carregado(s)
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
          openDescription="Use a busca para localizar empresas por nome, CNPJ, contato ou localização."
          closedDescription={
            activeFilterCount > 0
              ? '1 filtro ativo.'
              : 'Nenhum filtro específico selecionado.'
          }
          openLabel="Ocultar filtros"
          closedLabel="Filtros"
          storageKey="cryomap.companies.filters-open"
          defaultOpen={false}
          defaultOpenOnMobile={false}
          count={activeFilterCount}
          className="companies-filters-disclosure"
          contentClassName="companies-filter-area"
          variant="toolbar"
        >
          <div className="companies-actions">
            <label className="companies-search-field">
              <span>
                <Search size={13} strokeWidth={2.1} aria-hidden="true" />
                Busca
              </span>

              <input
                type="search"
                placeholder="Buscar por nome, CNPJ, cidade..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <ActionButton
              type="button"
              icon={RotateCcw}
              variant="secondary"
              disabled={!search}
              onClick={() => setSearch('')}
            >
              Limpar busca
            </ActionButton>
          </div>
        </CollapsibleSection>

        {error ? (
          <InlineNotice
            tone="danger"
            icon={TriangleAlert}
            title={error}
            description="Tente atualizar novamente a lista de empresas."
            action={
              <ActionButton
                type="button"
                icon={RefreshCw}
                variant="danger"
                onClick={() => void handleRefresh()}
              >
                Tentar novamente
              </ActionButton>
            }
          />
        ) : null}

        {!error && filteredCompanies.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Nenhuma empresa encontrada"
            description="Cadastre uma empresa ou ajuste a busca para visualizar resultados."
          />
        ) : null}

        {!error && filteredCompanies.length > 0 ? (
          <>
            <div className="companies-mobile-list">
              {filteredCompanies.map((company) => (
                <CompanyMobileCard
                  key={company.id}
                  company={company}
                  onEdit={openEditForm}
                  onInactivate={handleInactivate}
                />
              ))}
            </div>

            <div className="companies-table-wrapper">
              <table className="companies-table">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Contato</th>
                    <th>Localização</th>
                    <th>Status</th>
                    <th>Cadastro</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCompanies.map((company) => (
                    <tr key={company.id}>
                      <td>
                        <div className="company-table-primary">
                          <strong>{company.name}</strong>
                          <span>{formatCnpj(company.cnpj)}</span>
                          <small>ID {shortId(company.id)}</small>
                        </div>
                      </td>

                      <td>
                        <div className="company-table-contact">
                          <span>
                            <Mail size={13} strokeWidth={2} />
                            {company.email || 'Email não informado'}
                          </span>

                          <span>
                            <Phone size={13} strokeWidth={2} />
                            {company.phone || 'Telefone não informado'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="company-table-location">
                          <MapPin size={13} strokeWidth={2} />

                          <div>
                            <strong>{formatCompanyLocation(company)}</strong>
                            <small>{company.address || 'Endereço não informado'}</small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <CompanyStatusBadge status={company.status} />
                      </td>

                      <td>
                        <div className="company-table-created">
                          <CalendarDays size={13} strokeWidth={2} />
                          <span>{formatDate(company.createdAt)}</span>
                        </div>
                      </td>

                      <td>
                        <div className="company-row-actions">
                          <button
                            type="button"
                            className="company-icon-action"
                            title="Editar empresa"
                            aria-label={`Editar empresa ${company.name}`}
                            onClick={() => openEditForm(company)}
                          >
                            <Pencil size={15} strokeWidth={2} />
                          </button>

                          <button
                            type="button"
                            className="company-icon-action company-icon-action--danger"
                            title="Inativar empresa"
                            aria-label={`Inativar empresa ${company.name}`}
                            disabled={company.status === 'INACTIVE'}
                            onClick={() => void handleInactivate(company)}
                          >
                            <Power size={15} strokeWidth={2} />
                          </button>
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

type CompanyMobileCardProps = {
  company: Company;
  onEdit: (company: Company) => void;
  onInactivate: (company: Company) => Promise<void>;
};

function CompanyMobileCard({
  company,
  onEdit,
  onInactivate,
}: CompanyMobileCardProps) {
  return (
    <article
      className={`company-mobile-card ${
        company.status === 'INACTIVE' ? 'is-inactive' : ''
      }`}
    >
      <div className="company-mobile-card-header">
        <div>
          <span>{formatCnpj(company.cnpj)}</span>
          <strong>{company.name}</strong>
          <small>ID {shortId(company.id)}</small>
        </div>

        <CompanyStatusBadge status={company.status} />
      </div>

      <div className="company-mobile-card-info">
        <div>
          <Mail size={14} strokeWidth={2} />
          <div>
            <span>Email</span>
            <strong>{company.email || 'Não informado'}</strong>
          </div>
        </div>

        <div>
          <Phone size={14} strokeWidth={2} />
          <div>
            <span>Telefone</span>
            <strong>{company.phone || 'Não informado'}</strong>
          </div>
        </div>

        <div>
          <MapPin size={14} strokeWidth={2} />
          <div>
            <span>Localização</span>
            <strong>{formatCompanyLocation(company)}</strong>
            <small>{company.address || 'Endereço não informado'}</small>
          </div>
        </div>

        <div>
          <CalendarDays size={14} strokeWidth={2} />
          <div>
            <span>Cadastrada em</span>
            <strong>{formatDate(company.createdAt)}</strong>
          </div>
        </div>
      </div>

      <div className="company-mobile-card-actions">
        <ActionButton
          type="button"
          icon={Pencil}
          variant="secondary"
          onClick={() => onEdit(company)}
        >
          Editar
        </ActionButton>

        <ActionButton
          type="button"
          icon={Power}
          variant="danger"
          disabled={company.status === 'INACTIVE'}
          onClick={() => void onInactivate(company)}
        >
          Inativar
        </ActionButton>
      </div>
    </article>
  );
}

type CompanyStatusBadgeProps = {
  status: Company['status'];
};

function CompanyStatusBadge({ status }: CompanyStatusBadgeProps) {
  return (
    <StatusBadge tone={status === 'ACTIVE' ? 'success' : 'neutral'}>
      {status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
    </StatusBadge>
  );
}

function formatCompanyLocation(company: Company) {
  const parts = [company.city, company.state].filter(Boolean);

  return parts.length > 0 ? parts.join(' / ') : 'Não informada';
}

function shortId(value: string) {
  return value.slice(0, 8).toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('pt-BR');
}

function formatCnpj(value?: string | null) {
  if (!value) {
    return '-';
  }

  const digits = value.replace(/\D/g, '');

  if (digits.length !== 14) {
    return value;
  }

  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5',
  );
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function optionalValue(value: string) {
  const normalized = value.trim();

  return normalized || undefined;
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

    if (
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof data.message === 'string'
    ) {
      return data.message;
    }
  }

  return 'Não foi possível salvar a empresa.';
}

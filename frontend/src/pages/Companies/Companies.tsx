import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createCompany,
  getCompanies,
  inactivateCompany,
  updateCompany,
  type CreateCompanyPayload,
} from '../../services/companies';
import type { Company } from '../../types/company';
import './Companies.css';
import { LoadingState } from '../../components/Feedback/LoadingState';
import { EmptyState } from '../../components/Feedback/EmptyState';

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
    title="Carregando empresas..."
    description="Buscando empresas cadastradas."
  />
);
  }

  return (
    <div className="companies-page">
      <header className="companies-header">
        <div>
          <span>Cadastros</span>
          <h1>Empresas</h1>
          <p>Gerencie os clientes cadastrados no CryoMap.</p>
        </div>

        <button type="button" onClick={openCreateForm}>
          Nova empresa
        </button>
      </header>

      <section className="companies-summary">
        <SummaryCard title="Total" value={companies.length} />
        <SummaryCard title="Ativas" value={activeCompanies} />
        <SummaryCard title="Inativas" value={inactiveCompanies} />
      </section>

      {isFormOpen ? (
        <section className="company-form-panel">
          <div className="company-form-header">
            <div>
              <span>Empresa</span>
              <h2>{editingCompany ? 'Editar empresa' : 'Nova empresa'}</h2>
            </div>

            <button type="button" onClick={closeForm}>
              Fechar
            </button>
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
              <button type="button" onClick={closeForm}>
                Cancelar
              </button>

              <button type="submit" disabled={isSaving}>
                {isSaving
                  ? 'Salvando...'
                  : editingCompany
                    ? 'Salvar alterações'
                    : 'Cadastrar empresa'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="companies-panel">
        <div className="companies-panel-header">
          <div>
            <h2>Lista de empresas</h2>
            <p>{filteredCompanies.length} registro(s) encontrado(s)</p>
          </div>

          <div className="companies-actions">
            <input
              type="search"
              placeholder="Buscar por nome, CNPJ, cidade..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <button type="button" onClick={handleRefresh}>
              Atualizar
            </button>
          </div>
        </div>

        {error ? (
          <div className="companies-error">
            <strong>{error}</strong>

            <button type="button" onClick={handleRefresh}>
              Tentar novamente
            </button>
          </div>
        ) : null}

        {!error && filteredCompanies.length === 0 ? (
          <EmptyState
  title="Nenhuma empresa encontrada."
  description="Cadastre uma empresa ou ajuste os filtros para visualizar resultados."
/>
        ) : null}

        {!error && filteredCompanies.length > 0 ? (
          <div className="companies-table-wrapper">
            <table className="companies-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>CNPJ</th>
                  <th>Contato</th>
                  <th>Localização</th>
                  <th>Status</th>
                  <th>Criada em</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {filteredCompanies.map((company) => (
                  <tr key={company.id}>
                    <td>
                      <strong>{company.name}</strong>
                      <small>{company.id}</small>
                    </td>

                    <td>{formatCnpj(company.cnpj)}</td>

                    <td>
                      <span>{company.email || '-'}</span>
                      <small>{company.phone || '-'}</small>
                    </td>

                    <td>
                      <span>{company.city || '-'}</span>
                      <small>{company.state || '-'}</small>
                    </td>

                    <td>
                      <StatusBadge status={company.status} />
                    </td>

                    <td>{formatDate(company.createdAt)}</td>

                    <td>
                      <div className="company-row-actions">
                        <button type="button" onClick={() => openEditForm(company)}>
                          Editar
                        </button>

                        <button
                          type="button"
                          disabled={company.status === 'INACTIVE'}
                          onClick={() => handleInactivate(company)}
                        >
                          Inativar
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
};

function SummaryCard({ title, value }: SummaryCardProps) {
  return (
    <article className="companies-summary-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}

type StatusBadgeProps = {
  status: Company['status'];
};

function StatusBadge({ status }: StatusBadgeProps) {
  const label = status === 'ACTIVE' ? 'Ativa' : 'Inativa';

  return (
    <span
      className={
        status === 'ACTIVE'
          ? 'companies-status active'
          : 'companies-status inactive'
      }
    >
      {label}
    </span>
  );
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

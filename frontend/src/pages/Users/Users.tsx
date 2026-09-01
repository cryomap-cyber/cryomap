import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { getCompanies } from '../../services/companies';
import {
  createUser,
  getUsers,
  inactivateUser,
  updateUser,
  type CreateUserPayload,
  type UpdateUserPayload,
} from '../../services/users';
import type { Company } from '../../types/company';
import type { User, UserRole, UserStatus } from '../../types/user';
import { useAuth } from '../../contexts/useAuth';
import './Users.css';
import { LoadingState } from '../../components/Feedback/LoadingState';

const userRoleOptions: { value: UserRole; label: string }[] = [
  {
    value: 'MASTER_ADMIN',
    label: 'Administrador master',
  },
  {
    value: 'SUPERVISOR',
    label: 'Supervisor',
  },
  {
    value: 'CLIENT_USER',
    label: 'Usuário cliente',
  },
  {
    value: 'TECHNICIAN',
    label: 'Técnico',
  },
];

const userStatusOptions: { value: UserStatus; label: string }[] = [
  {
    value: 'ACTIVE',
    label: 'Ativo',
  },
  {
    value: 'INACTIVE',
    label: 'Inativo',
  },
  {
    value: 'BLOCKED',
    label: 'Bloqueado',
  },
];

type UserFormData = {
  companyId: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  jobTitle: string;
  role: UserRole;
  status: UserStatus;
};

const emptyFormData: UserFormData = {
  companyId: '',
  name: '',
  email: '',
  password: '',
  phone: '',
  jobTitle: '',
  role: 'TECHNICIAN',
  status: 'ACTIVE',
};

export function Users() {
    const { user: currentUser } = useAuth();

  const isCurrentUserMasterAdmin = currentUser?.role === 'MASTER_ADMIN';

  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyFormData);

  async function handleRefresh() {
    setError('');
    setIsLoading(true);

    try {
      const [companiesData, usersData] = await Promise.all([
        getCompanies(),
        getUsers(),
      ]);

      setCompanies(companiesData);
      setUsers(usersData);
    } catch {
      setError('Não foi possível carregar os usuários.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    Promise.all([getCompanies(), getUsers()])
      .then(([companiesData, usersData]) => {
        if (!isMounted) {
          return;
        }

        setCompanies(companiesData);
        setUsers(usersData);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível carregar os usuários.');
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

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesCompany =
        !selectedCompanyId || user.companyId === selectedCompanyId;

      const matchesRole = !selectedRole || user.role === selectedRole;

      const matchesStatus = !selectedStatus || user.status === selectedStatus;

      const matchesSearch =
        !normalizedSearch ||
        [
          user.name,
          user.email,
          user.phone ?? '',
          user.jobTitle ?? '',
          user.role,
          user.status,
          user.company?.name ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesCompany && matchesRole && matchesStatus && matchesSearch;
    });
  }, [users, selectedCompanyId, selectedRole, selectedStatus, search]);

  const activeUsers = users.filter((user) => user.status === 'ACTIVE').length;

  const blockedUsers = users.filter((user) => user.status === 'BLOCKED').length;

  const technicians = users.filter((user) => user.role === 'TECHNICIAN').length;

  const clientUsers = users.filter((user) => user.role === 'CLIENT_USER').length;

  const usersWithoutCompany = users.filter((user) => !user.companyId).length;

    const availableRoleOptions = useMemo(() => {
    if (editingUser?.role === 'MASTER_ADMIN') {
      return userRoleOptions.filter((option) => option.value === 'MASTER_ADMIN');
    }

    return userRoleOptions.filter((option) => option.value !== 'MASTER_ADMIN');
  }, [editingUser?.role]);

  function openCreateForm() {
    setEditingUser(null);
    setFormData({
      ...emptyFormData,
      companyId: selectedCompanyId,
            role:
        selectedRole && selectedRole !== 'MASTER_ADMIN'
          ? (selectedRole as UserRole)
          : 'TECHNICIAN',
      status: selectedStatus ? (selectedStatus as UserStatus) : 'ACTIVE',
    });
    setFormError('');
    setIsFormOpen(true);
  }

  function openEditForm(user: User) {
        if (!canEditUser(user, currentUser?.id, isCurrentUserMasterAdmin)) {
      setError('Você não tem permissão para editar o administrador master.');
      return;
    }
    setEditingUser(user);
    setFormData({
      companyId: user.companyId ?? '',
      name: user.name,
      email: user.email,
      password: '',
      phone: user.phone ?? '',
      jobTitle: user.jobTitle ?? '',
      role: user.role,
      status: user.status,
    });
    setFormError('');
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setEditingUser(null);
    setFormData(emptyFormData);
    setFormError('');
  }

  function updateFormField<K extends keyof UserFormData>(
    field: K,
    value: UserFormData[K],
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError('');

    if (formData.name.trim().length < 2) {
      setFormError('Informe um nome com pelo menos 2 caracteres.');
      return;
    }

    if (!formData.email.trim()) {
      setFormError('Informe o e-mail.');
      return;
    }

    if (!editingUser && formData.password.length < 8) {
      setFormError('Informe uma senha com pelo menos 8 caracteres.');
      return;
    }

    if (editingUser && formData.password && formData.password.length < 8) {
      setFormError('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }
        if (!editingUser && formData.role === 'MASTER_ADMIN') {
      setFormError('Não é permitido criar outro administrador master.');
      return;
    }

    if (
      editingUser &&
      editingUser.role !== 'MASTER_ADMIN' &&
      formData.role === 'MASTER_ADMIN'
    ) {
      setFormError('Não é permitido promover outro usuário para administrador master.');
      return;
    }

    if (
      editingUser?.role === 'MASTER_ADMIN' &&
      formData.role !== 'MASTER_ADMIN'
    ) {
      setFormError('O administrador master principal não pode perder o perfil master.');
      return;
    }

    if (
      editingUser?.role === 'MASTER_ADMIN' &&
      !isCurrentUserMasterAdmin
    ) {
      setFormError('Somente o administrador master pode editar o próprio cadastro master.');
      return;
    }
    setIsSaving(true);

    try {
      if (editingUser) {
        const payload: UpdateUserPayload = {
          companyId: formData.companyId || null,
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: optionalValue(formData.password),
          phone: nullableValue(formData.phone),
          jobTitle: nullableValue(formData.jobTitle),
          role: formData.role,
          status: formData.status,
        };

        await updateUser(editingUser.id, payload);
      } else {
        const payload: CreateUserPayload = {
          companyId: optionalValue(formData.companyId),
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          phone: optionalValue(formData.phone),
          jobTitle: optionalValue(formData.jobTitle),
          role: formData.role,
          status: formData.status,
        };

        await createUser(payload);
      }

      closeForm();
      await handleRefresh();
    } catch (requestError) {
      setFormError(getRequestErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleInactivate(user: User) {
        if (!canInactivateUser(user, currentUser?.id)) {
      setError(
        user.id === currentUser?.id
          ? 'Você não pode inativar o próprio usuário logado.'
          : 'O administrador master não pode ser inativado.',
      );
      return;
    }
    const confirmed = window.confirm(
      `Deseja realmente inativar o usuário "${user.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    setError('');

    try {
      await inactivateUser(user.id);
      await handleRefresh();
    } catch {
      setError('Não foi possível inativar o usuário.');
    }
  }

  if (isLoading) {
    return (
  <LoadingState
    title="Carregando usuários..."
    description="Buscando usuários e permissões cadastradas."
  />
);
  }

  return (
    <div className="users-page">
      <header className="users-header">
        <div>
          <span>Acessos</span>
          <h1>Usuários</h1>
          <p>
            Gerencie administradores, supervisores, usuários de empresas e
            técnicos operacionais do CryoMap.
          </p>
        </div>

        <button type="button" onClick={openCreateForm}>
          Novo usuário
        </button>
      </header>

      <section className="users-summary">
        <SummaryCard title="Total" value={users.length} />
        <SummaryCard title="Ativos" value={activeUsers} />
        <SummaryCard title="Bloqueados" value={blockedUsers} danger={blockedUsers > 0} />
        <SummaryCard title="Técnicos" value={technicians} />
        <SummaryCard title="Clientes" value={clientUsers} />
        <SummaryCard title="Sem empresa" value={usersWithoutCompany} />
      </section>

      {isFormOpen ? (
        <section className="user-form-panel">
          <div className="user-form-header">
            <div>
              <span>Usuário</span>
              <h2>{editingUser ? 'Editar usuário' : 'Novo usuário'}</h2>
            </div>

            <button type="button" onClick={closeForm}>
              Fechar
            </button>
          </div>

          <form className="user-form" onSubmit={handleSubmit}>
            <label>
              Empresa
              <select
                value={formData.companyId}
                onChange={(event) =>
                  updateFormField('companyId', event.target.value)
                }
              >
                <option value="">Sem empresa / usuário interno</option>

                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Nome *
              <input
                type="text"
                value={formData.name}
                onChange={(event) =>
                  updateFormField('name', event.target.value)
                }
                placeholder="Nome completo"
              />
            </label>

            <label>
              E-mail *
              <input
                type="email"
                value={formData.email}
                onChange={(event) =>
                  updateFormField('email', event.target.value)
                }
                placeholder="usuario@empresa.com"
              />
            </label>

            <label>
              {editingUser ? 'Nova senha' : 'Senha *'}
              <input
                type="password"
                value={formData.password}
                onChange={(event) =>
                  updateFormField('password', event.target.value)
                }
                placeholder={
                  editingUser
                    ? 'Deixe em branco para manter a senha atual'
                    : 'Mínimo 8 caracteres'
                }
              />
            </label>

            <label>
              Telefone
              <input
                type="text"
                value={formData.phone}
                onChange={(event) =>
                  updateFormField('phone', event.target.value)
                }
                placeholder="Telefone ou WhatsApp"
              />
            </label>

            <label>
              Cargo
              <input
                type="text"
                value={formData.jobTitle}
                onChange={(event) =>
                  updateFormField('jobTitle', event.target.value)
                }
                placeholder="Ex: Técnico de refrigeração"
              />
            </label>

            <label>
              Perfil *
              <select
                value={formData.role}
                onChange={(event) =>
                  updateFormField('role', event.target.value as UserRole)
                }
              >
                  {availableRoleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Status *
              <select
                value={formData.status}
                onChange={(event) =>
                  updateFormField('status', event.target.value as UserStatus)
                }
              >
                {userStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {formError ? (
              <strong className="user-form-error">{formError}</strong>
            ) : null}

            <div className="user-form-actions">
              <button type="button" onClick={closeForm}>
                Cancelar
              </button>

              <button type="submit" disabled={isSaving}>
                {isSaving
                  ? 'Salvando...'
                  : editingUser
                    ? 'Salvar alterações'
                    : 'Cadastrar usuário'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="users-panel">
        <div className="users-panel-header">
          <div>
            <h2>Lista de usuários</h2>
            <p>{filteredUsers.length} usuário(s) encontrado(s)</p>
          </div>

          <div className="users-actions">
            <select
              value={selectedCompanyId}
              onChange={(event) => setSelectedCompanyId(event.target.value)}
            >
              <option value="">Todas as empresas</option>

              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>

            <select
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value)}
            >
              <option value="">Todos os perfis</option>

              {userRoleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
            >
              <option value="">Todos os status</option>

              {userStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <input
              type="search"
              placeholder="Buscar por nome, e-mail, cargo..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <button type="button" onClick={handleRefresh}>
              Atualizar
            </button>
          </div>
        </div>

        {error ? (
          <div className="users-error">
            <strong>{error}</strong>

            <button type="button" onClick={handleRefresh}>
              Tentar novamente
            </button>
          </div>
        ) : null}

        {!error && filteredUsers.length === 0 ? (
          <p className="users-empty">
            Nenhum usuário encontrado para os filtros selecionados.
          </p>
        ) : null}

        {!error && filteredUsers.length > 0 ? (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Empresa</th>
                  <th>Contato</th>
                  <th>Cargo</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Último login</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </td>

                    <td>{user.company?.name ?? '-'}</td>

                    <td>{user.phone || '-'}</td>

                    <td>{user.jobTitle || '-'}</td>

                    <td>
                      <RoleBadge role={user.role} />
                    </td>

                    <td>
                      <StatusBadge status={user.status} />
                    </td>

                    <td>{formatDateTime(user.lastLoginAt)}</td>

                    <td>{formatDateTime(user.createdAt)}</td>

                    <td>
                      <div className="user-row-actions">
                      {canEditUser(user, currentUser?.id, isCurrentUserMasterAdmin) ? (
                       <button type="button" onClick={() => openEditForm(user)}>
                             Editar
                       </button>
                      ) : null}

                    {canInactivateUser(user, currentUser?.id) ? (
                       <button
                          type="button"
                          onClick={() => void handleInactivate(user)}
                        >
                          Inativar
                        </button>
                      ) : null}

                      {!canEditUser(user, currentUser?.id, isCurrentUserMasterAdmin) &&
                      !canInactivateUser(user, currentUser?.id) ? (
                        <span className="user-protected-badge">Protegido</span>
                      ) : null}
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
      className={danger ? 'users-summary-card danger' : 'users-summary-card'}
    >
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}

type RoleBadgeProps = {
  role: UserRole;
};

function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span className={`user-role-badge ${role.toLowerCase()}`}>
      {formatRole(role)}
    </span>
  );
}

type StatusBadgeProps = {
  status: UserStatus;
};

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`user-status-badge ${status.toLowerCase()}`}>
      {formatStatus(status)}
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

function formatRole(value: UserRole) {
  const labels: Record<UserRole, string> = {
    MASTER_ADMIN: 'Master admin',
    SUPERVISOR: 'Supervisor',
    CLIENT_USER: 'Cliente',
    TECHNICIAN: 'Técnico',
  };

  return labels[value];
}

function formatStatus(value: UserStatus) {
  const labels: Record<UserStatus, string> = {
    ACTIVE: 'Ativo',
    INACTIVE: 'Inativo',
    BLOCKED: 'Bloqueado',
  };

  return labels[value];
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

  return 'Não foi possível salvar o usuário.';
}

function canEditUser(
  targetUser: User,
  currentUserId: string | undefined,
  isCurrentUserMasterAdmin: boolean,
) {
  if (targetUser.role !== 'MASTER_ADMIN') {
    return true;
  }

  return isCurrentUserMasterAdmin && targetUser.id === currentUserId;
}

function canInactivateUser(
  targetUser: User,
  currentUserId: string | undefined,
) {
  if (targetUser.role === 'MASTER_ADMIN') {
    return false;
  }

  if (targetUser.id === currentUserId) {
    return false;
  }

  return true;
}
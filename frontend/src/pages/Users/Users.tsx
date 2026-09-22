import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleOff,
  Clock3,
  LockKeyhole,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  TriangleAlert,
  UserCog,
  UsersRound,
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
import './Users.css';

const userRoleOptions: { value: UserRole; label: string }[] = [
  { value: 'MASTER_ADMIN', label: 'Administrador master' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'CLIENT_USER', label: 'Usuário cliente' },
  { value: 'TECHNICIAN', label: 'Técnico' },
];

const userStatusOptions: { value: UserStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'INACTIVE', label: 'Inativo' },
  { value: 'BLOCKED', label: 'Bloqueado' },
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
  const clientUsers = users.filter(
    (user) => user.role === 'CLIENT_USER',
  ).length;
  const usersWithoutCompany = users.filter((user) => !user.companyId).length;

  const activeFilterCount = [
    selectedCompanyId,
    selectedRole,
    selectedStatus,
    search.trim(),
  ].filter(Boolean).length;

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

  function clearFilters() {
    setSelectedCompanyId('');
    setSelectedRole('');
    setSelectedStatus('');
    setSearch('');
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
      setFormError(
        'Não é permitido promover outro usuário para administrador master.',
      );
      return;
    }

    if (
      editingUser?.role === 'MASTER_ADMIN' &&
      formData.role !== 'MASTER_ADMIN'
    ) {
      setFormError(
        'O administrador master principal não pode perder o perfil master.',
      );
      return;
    }

    if (editingUser?.role === 'MASTER_ADMIN' && !isCurrentUserMasterAdmin) {
      setFormError(
        'Somente o administrador master pode editar o próprio cadastro master.',
      );
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
        title="Carregando usuários"
        description="Buscando usuários e permissões cadastradas."
      />
    );
  }

  return (
    <div className="users-page">
      <PageHeader
        eyebrow="Acessos"
        title="Usuários"
        description="Gerencie administradores, supervisores, usuários de empresas e técnicos operacionais do CryoMap."
        icon={UsersRound}
        actions={
          <ActionButton
            type="button"
            icon={Plus}
            variant="primary"
            onClick={openCreateForm}
          >
            Novo usuário
          </ActionButton>
        }
        meta={
          <>
            <MetaPill icon={UsersRound}>{users.length} usuário(s)</MetaPill>
            <MetaPill icon={CheckCircle2} tone="success">
              {activeUsers} ativo(s)
            </MetaPill>
            <MetaPill
              icon={LockKeyhole}
              tone={blockedUsers > 0 ? 'danger' : 'neutral'}
            >
              {blockedUsers} bloqueado(s)
            </MetaPill>
          </>
        }
      />

      <CollapsibleSection
        title="Resumo dos usuários"
        openDescription="Indicadores gerais de usuários e perfis estão visíveis."
        closedDescription="Indicadores gerais estão ocultos para liberar espaço na tela."
        openLabel="Ocultar resumo"
        closedLabel="Mostrar resumo"
        storageKey="cryomap.users.summary-open"
        defaultOpen
        defaultOpenOnMobile={false}
        className="users-summary-disclosure"
        contentClassName="users-summary"
        variant="section"
      >
        <MetricCard
          label="Total"
          value={users.length}
          detail="Usuários cadastrados"
          icon={UsersRound}
          tone="info"
        />
        <MetricCard
          label="Ativos"
          value={activeUsers}
          detail="Com acesso operacional"
          icon={CheckCircle2}
          tone="success"
        />
        <MetricCard
          label="Bloqueados"
          value={blockedUsers}
          detail="Acesso bloqueado"
          icon={LockKeyhole}
          tone={blockedUsers > 0 ? 'danger' : 'success'}
        />
        <MetricCard
          label="Técnicos"
          value={technicians}
          detail="Perfis de campo"
          icon={Wrench}
          tone="warning"
        />
        <MetricCard
          label="Clientes"
          value={clientUsers}
          detail="Usuários de empresas"
          icon={Building2}
          tone="success"
        />
        <MetricCard
          label="Sem empresa"
          value={usersWithoutCompany}
          detail="Usuários internos"
          icon={UserCog}
          tone="neutral"
        />
      </CollapsibleSection>

      {isFormOpen ? (
        <section className="user-form-panel">
          <div className="user-form-header">
            <div>
              <span>Usuário</span>
              <h2>{editingUser ? 'Editar usuário' : 'Novo usuário'}</h2>
              <p>
                Configure identificação, vínculo com empresa, perfil de acesso e
                status do usuário.
              </p>
            </div>

            <ActionButton type="button" variant="ghost" onClick={closeForm}>
              Fechar
            </ActionButton>
          </div>

          {editingUser?.role === 'MASTER_ADMIN' ? (
            <InlineNotice
              tone="info"
              icon={ShieldCheck}
              title="Administrador master protegido"
              description="O perfil master principal não pode ser removido, rebaixado ou inativado."
            />
          ) : null}

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
                  : editingUser
                    ? 'Salvar alterações'
                    : 'Cadastrar usuário'}
              </ActionButton>
            </div>
          </form>
        </section>
      ) : null}

      <section className="users-panel">
        <div className="users-panel-header">
          <div>
            <span>Controle de acesso</span>
            <h2>Lista de usuários</h2>
            <p>
              {filteredUsers.length} usuário(s) exibido(s) de {users.length}{' '}
              carregado(s)
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
          openDescription="Refine a lista por empresa, perfil, status ou busca textual."
          closedDescription={
            activeFilterCount > 0
              ? `${activeFilterCount} filtro(s) ativo(s).`
              : 'Nenhum filtro específico selecionado.'
          }
          openLabel="Ocultar filtros"
          closedLabel="Filtros"
          storageKey="cryomap.users.filters-open"
          defaultOpen={false}
          defaultOpenOnMobile={false}
          count={activeFilterCount}
          className="users-filters-disclosure"
          contentClassName="users-filter-area"
          variant="toolbar"
        >
          <div className="users-actions">
            <label className="users-filter-field">
              <span>Empresa</span>
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
            </label>

            <label className="users-filter-field">
              <span>Perfil</span>
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
            </label>

            <label className="users-filter-field">
              <span>Status</span>
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
            </label>

            <label className="users-filter-field users-search-field">
              <span>
                <Search size={13} strokeWidth={2.1} aria-hidden="true" />
                Busca
              </span>
              <input
                type="search"
                placeholder="Buscar por nome, e-mail, cargo..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <div className="users-filter-actions">
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
            description="Tente atualizar os usuários ou reveja os filtros selecionados."
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

        {!error && filteredUsers.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="Nenhum usuário encontrado"
            description="Cadastre um usuário ou ajuste os filtros para visualizar resultados."
          />
        ) : null}

        {!error && filteredUsers.length > 0 ? (
          <>
            <div className="users-mobile-list">
              {filteredUsers.map((user) => (
                <UserMobileCard
                  key={user.id}
                  user={user}
                  currentUserId={currentUser?.id}
                  isCurrentUserMasterAdmin={isCurrentUserMasterAdmin}
                  onEdit={openEditForm}
                  onInactivate={handleInactivate}
                />
              ))}
            </div>

            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Empresa</th>
                    <th>Perfil / status</th>
                    <th>Contato / cargo</th>
                    <th>Atividade</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user) => {
                    const canEdit = canEditUser(
                      user,
                      currentUser?.id,
                      isCurrentUserMasterAdmin,
                    );
                    const canInactivate = canInactivateUser(
                      user,
                      currentUser?.id,
                    );

                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="user-table-primary">
                            <strong>{user.name}</strong>
                            <span>{user.email}</span>
                            {user.id === currentUser?.id ? (
                              <small>Usuário atual</small>
                            ) : null}
                          </div>
                        </td>

                        <td>
                          <div className="user-table-company">
                            <Building2 size={13} strokeWidth={2} />
                            <span>
                              {user.company?.name ?? 'Usuário interno'}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="user-table-access">
                            <UserRoleBadge role={user.role} />
                            <UserStatusBadge status={user.status} />
                          </div>
                        </td>

                        <td>
                          <div className="user-table-contact">
                            <span>
                              <Phone size={13} strokeWidth={2} />
                              {user.phone || 'Telefone não informado'}
                            </span>
                            <span>
                              <UserRound size={13} strokeWidth={2} />
                              {user.jobTitle || 'Cargo não informado'}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="user-table-activity">
                            <span>
                              <Clock3 size={13} strokeWidth={2} />
                              <span>
                                Último login
                                <strong>
                                  {formatDateTime(user.lastLoginAt)}
                                </strong>
                              </span>
                            </span>

                            <span>
                              <CalendarDays size={13} strokeWidth={2} />
                              <span>
                                Criado em
                                <strong>{formatDateTime(user.createdAt)}</strong>
                              </span>
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="user-row-actions">
                            {canEdit ? (
                              <button
                                type="button"
                                className="user-icon-action"
                                title="Editar usuário"
                                aria-label={`Editar usuário ${user.name}`}
                                onClick={() => openEditForm(user)}
                              >
                                <Pencil size={15} strokeWidth={2} />
                              </button>
                            ) : null}

                            {canInactivate ? (
                              <button
                                type="button"
                                className="user-icon-action user-icon-action--danger"
                                title="Inativar usuário"
                                aria-label={`Inativar usuário ${user.name}`}
                                onClick={() => void handleInactivate(user)}
                              >
                                <CircleOff size={15} strokeWidth={2} />
                              </button>
                            ) : null}

                            {!canEdit && !canInactivate ? (
                              <StatusBadge tone="neutral">Protegido</StatusBadge>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

type UserMobileCardProps = {
  user: User;
  currentUserId?: string;
  isCurrentUserMasterAdmin: boolean;
  onEdit: (user: User) => void;
  onInactivate: (user: User) => Promise<void>;
};

function UserMobileCard({
  user,
  currentUserId,
  isCurrentUserMasterAdmin,
  onEdit,
  onInactivate,
}: UserMobileCardProps) {
  const canEdit = canEditUser(
    user,
    currentUserId,
    isCurrentUserMasterAdmin,
  );
  const canInactivate = canInactivateUser(user, currentUserId);

  return (
    <article
      className={`user-mobile-card user-mobile-card--${user.status.toLowerCase()}`}
    >
      <div className="user-mobile-card-header">
        <div>
          <span>{user.company?.name ?? 'Usuário interno'}</span>
          <strong>{user.name}</strong>
          <small>{user.email}</small>
        </div>

        <UserStatusBadge status={user.status} />
      </div>

      <div className="user-mobile-card-access">
        <UserRoleBadge role={user.role} />

        {user.id === currentUserId ? (
          <StatusBadge tone="info">Usuário atual</StatusBadge>
        ) : null}

        {!canEdit && !canInactivate ? (
          <StatusBadge tone="neutral">Protegido</StatusBadge>
        ) : null}
      </div>

      <div className="user-mobile-card-info">
        <div>
          <Phone size={14} strokeWidth={2} />
          <div>
            <span>Telefone</span>
            <strong>{user.phone || 'Não informado'}</strong>
          </div>
        </div>

        <div>
          <UserRound size={14} strokeWidth={2} />
          <div>
            <span>Cargo</span>
            <strong>{user.jobTitle || 'Não informado'}</strong>
          </div>
        </div>

        <div>
          <Clock3 size={14} strokeWidth={2} />
          <div>
            <span>Último login</span>
            <strong>{formatDateTime(user.lastLoginAt)}</strong>
          </div>
        </div>

        <div>
          <CalendarDays size={14} strokeWidth={2} />
          <div>
            <span>Criado em</span>
            <strong>{formatDateTime(user.createdAt)}</strong>
          </div>
        </div>
      </div>

      {canEdit || canInactivate ? (
        <div className="user-mobile-card-actions">
          {canEdit ? (
            <ActionButton
              type="button"
              icon={Pencil}
              variant="secondary"
              onClick={() => onEdit(user)}
            >
              Editar
            </ActionButton>
          ) : null}

          {canInactivate ? (
            <ActionButton
              type="button"
              icon={CircleOff}
              variant="danger"
              onClick={() => void onInactivate(user)}
            >
              Inativar
            </ActionButton>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

type UserRoleBadgeProps = {
  role: UserRole;
};

function UserRoleBadge({ role }: UserRoleBadgeProps) {
  return (
    <StatusBadge tone={getUserRoleTone(role)}>{formatRole(role)}</StatusBadge>
  );
}

function getUserRoleTone(role: UserRole): UiTone {
  if (role === 'MASTER_ADMIN' || role === 'SUPERVISOR') {
    return 'info';
  }

  if (role === 'CLIENT_USER') {
    return 'success';
  }

  if (role === 'TECHNICIAN') {
    return 'warning';
  }

  return 'neutral';
}

type UserStatusBadgeProps = {
  status: UserStatus;
};

function UserStatusBadge({ status }: UserStatusBadgeProps) {
  return (
    <StatusBadge tone={getUserStatusTone(status)}>
      {formatStatus(status)}
    </StatusBadge>
  );
}

function getUserStatusTone(status: UserStatus): UiTone {
  if (status === 'ACTIVE') {
    return 'success';
  }

  if (status === 'BLOCKED') {
    return 'danger';
  }

  return 'neutral';
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

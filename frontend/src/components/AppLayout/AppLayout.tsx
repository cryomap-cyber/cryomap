import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Activity,
  Bell,
  Building2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  DoorOpen,
  FileText,
  Gauge,
  Home,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MoreHorizontal,
  Paperclip,
  Plus,
  Settings,
  Snowflake,
  Thermometer,
  UsersRound,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  NavLink,
  Outlet,
  useLocation,
} from 'react-router-dom';

import cryomapLogo from '../../assets/cryomap-logo.png';
import { useAuth } from '../../contexts/useAuth';
import {
  getAllowedNavigationItems,
  type NavigationItem,
} from '../../permissions/role-permissions';
import './AppLayout.css';

type NavigationGroup = {
  label: string;
  paths: string[];
};

const navigationGroups: NavigationGroup[] = [
  {
    label: 'Visão geral',
    paths: ['/dashboard'],
  },
  {
    label: 'Operação',
    paths: [
      '/tasks',
      '/service-records',
      '/temperature-readings',
      '/thermal-alerts',
      '/equipment-temperature-readings',
    ],
  },
  {
    label: 'Estrutura',
    paths: [
      '/companies',
      '/rooms',
      '/equipments',
      '/sensors',
    ],
  },
  {
    label: 'Gestão',
    paths: [
      '/users',
      '/service-problem-suggestions',
      '/attachments',
      '/reports',
    ],
  },
];

const navigationIcons: Record<string, LucideIcon> = {
  '/dashboard': LayoutDashboard,
  '/companies': Building2,
  '/users': UsersRound,
  '/rooms': DoorOpen,
  '/equipments': Snowflake,
  '/sensors': Gauge,
  '/temperature-readings': Thermometer,
  '/thermal-alerts': Bell,
  '/equipment-temperature-readings': Activity,
  '/tasks': ClipboardList,
  '/service-records': Wrench,
  '/service-problem-suggestions': Lightbulb,
  '/attachments': Paperclip,
  '/reports': FileText,
};

const mobilePrimaryPaths = new Set([
  '/dashboard',
  '/tasks',
  '/thermal-alerts',
]);

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const allowedNavigationItems = useMemo(
    () =>
      getAllowedNavigationItems(user?.role).map((item) => ({
        ...item,
        label:
          user?.role === 'TECHNICIAN' && item.to === '/tasks'
            ? 'Tarefas'
            : item.label,
      })),
    [user?.role],
  );

  const groupedNavigation = useMemo(
    () =>
      navigationGroups
        .map((group) => ({
          ...group,
          items: group.paths
            .map((path) =>
              allowedNavigationItems.find(
                (item) => item.to === path,
              ),
            )
            .filter(
              (item): item is NavigationItem =>
                item !== undefined,
            ),
        }))
        .filter((group) => group.items.length > 0),
    [allowedNavigationItems],
  );

  const moreNavigationItems = useMemo(
    () =>
      allowedNavigationItems.filter(
        (item) => !mobilePrimaryPaths.has(item.to),
      ),
    [allowedNavigationItems],
  );

  const dashboardItem = allowedNavigationItems.find(
    (item) => item.to === '/dashboard',
  );
  const tasksItem = allowedNavigationItems.find(
    (item) => item.to === '/tasks',
  );
  const alertsItem = allowedNavigationItems.find(
    (item) => item.to === '/thermal-alerts',
  );

  const userInitials = getUserInitials(user?.name);

  useEffect(() => {
    setIsMoreOpen(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }

      setIsMoreOpen(false);
      setIsProfileOpen(false);
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function closeOverlays() {
    setIsMoreOpen(false);
    setIsProfileOpen(false);
  }

  function toggleMore() {
    setIsProfileOpen(false);
    setIsMoreOpen((current) => !current);
  }

  function toggleProfile() {
    setIsMoreOpen(false);
    setIsProfileOpen((current) => !current);
  }

  function handleLogout() {
    closeOverlays();
    logout();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />

        <nav
          className="sidebar-navigation"
          aria-label="Navegação principal"
        >
          {groupedNavigation.map((group) => (
            <div
              key={group.label}
              className="sidebar-navigation-group"
            >
              <span className="sidebar-navigation-label">
                {group.label}
              </span>

              <div className="sidebar-nav">
                {group.items.map((item) => (
                  <NavigationLink
                    key={item.to}
                    item={item}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-user">
          <UserAvatar
            initials={userInitials}
            name={user?.name}
          />

          <div className="sidebar-user-copy">
            <span>{user?.name ?? 'Usuário CryoMap'}</span>
            <small>{user?.email}</small>
            <small>{formatRole(user?.role)}</small>
          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={logout}
          >
            <LogOut size={17} strokeWidth={2.2} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <header className="mobile-topbar">
        <Brand compact />

        <div className="mobile-topbar-actions">
          {alertsItem ? (
            <NavLink
              to={alertsItem.to}
              className="mobile-topbar-action"
              aria-label="Abrir alertas"
            >
              <Bell size={20} strokeWidth={2.2} />
            </NavLink>
          ) : (
            <button
              type="button"
              className="mobile-topbar-action"
              aria-label="Alertas indisponíveis"
              disabled
            >
              <Bell size={20} strokeWidth={2.2} />
            </button>
          )}

          <button
            type="button"
            className={
              isProfileOpen
                ? 'mobile-profile-trigger is-open'
                : 'mobile-profile-trigger'
            }
            aria-label="Abrir menu do usuário"
            aria-expanded={isProfileOpen}
            onClick={toggleProfile}
          >
            <UserAvatar
              initials={userInitials}
              name={user?.name}
              compact
            />
          </button>
        </div>
      </header>

      {isProfileOpen ? (
        <>
          <button
            type="button"
            className="mobile-overlay-backdrop mobile-overlay-backdrop--profile"
            aria-label="Fechar menu do usuário"
            onClick={() => setIsProfileOpen(false)}
          />

          <section
            className="mobile-profile-menu"
            aria-label="Menu do usuário"
          >
            <div className="mobile-profile-menu-header">
              <UserAvatar
                initials={userInitials}
                name={user?.name}
              />

              <div>
                <strong>{user?.name ?? 'Usuário CryoMap'}</strong>
                <span>{user?.email}</span>
                <small>{formatRole(user?.role)}</small>
              </div>
            </div>

            <button
              type="button"
              className="mobile-profile-option"
              disabled
              title="Configurações serão habilitadas na próxima etapa."
            >
              <Settings size={18} strokeWidth={2.1} />

              <span>
                <strong>Configurações</strong>
                <small>Em breve</small>
              </span>
            </button>

            <button
              type="button"
              className="mobile-profile-option danger"
              onClick={handleLogout}
            >
              <LogOut size={18} strokeWidth={2.1} />

              <span>
                <strong>Sair</strong>
                <small>Encerrar sessão</small>
              </span>
            </button>
          </section>
        </>
      ) : null}

      {isMoreOpen ? (
        <div className="mobile-more-layer">
          <button
            type="button"
            className="mobile-overlay-backdrop"
            aria-label="Fechar menu Mais"
            onClick={() => setIsMoreOpen(false)}
          />

          <section
            className="mobile-more-sheet"
            aria-label="Mais opções"
          >
            <div className="mobile-more-handle" />

            <div className="mobile-more-header">
              <div>
                <span>Navegação</span>
                <strong>Mais opções</strong>
              </div>

              <button
                type="button"
                className="mobile-more-close"
                aria-label="Fechar"
                onClick={() => setIsMoreOpen(false)}
              >
                <X size={19} strokeWidth={2.3} />
              </button>
            </div>

            <nav
              className="mobile-more-navigation"
              aria-label="Navegação complementar"
            >
              {moreNavigationItems.map((item) => (
                <NavigationLink
                  key={item.to}
                  item={item}
                  mobileMore
                />
              ))}
            </nav>

            <div className="mobile-more-user">
              <UserAvatar
                initials={userInitials}
                name={user?.name}
              />

              <div className="mobile-more-user-copy">
                <strong>{user?.name ?? 'Usuário CryoMap'}</strong>
                <span>{formatRole(user?.role)}</span>
              </div>

              <button
                type="button"
                className="mobile-more-logout"
                aria-label="Sair"
                onClick={handleLogout}
              >
                <LogOut size={18} strokeWidth={2.2} />
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <main className="main-content">
        <Outlet />
      </main>

      <nav
        className="mobile-dock"
        aria-label="Navegação principal mobile"
      >
        {dashboardItem ? (
          <MobileDockLink
            item={dashboardItem}
            label="Início"
            icon={Home}
          />
        ) : (
          <span className="mobile-dock-spacer" />
        )}

        {tasksItem ? (
          <MobileDockLink
            item={tasksItem}
            label="Tarefas"
            icon={ClipboardCheck}
          />
        ) : (
          <span className="mobile-dock-spacer" />
        )}

        {tasksItem ? (
          <NavLink
            to={tasksItem.to}
            className="mobile-dock-create"
            aria-label="Ir para tarefas para criar um novo registro"
            title="Novo"
          >
            <Plus size={25} strokeWidth={2.5} />
          </NavLink>
        ) : (
          <button
            type="button"
            className="mobile-dock-create"
            aria-label="Nova tarefa indisponível"
            disabled
          >
            <Plus size={25} strokeWidth={2.5} />
          </button>
        )}

        {alertsItem ? (
          <MobileDockLink
            item={alertsItem}
            label="Alertas"
            icon={Bell}
          />
        ) : (
          <span className="mobile-dock-spacer" />
        )}

        <button
          type="button"
          className={
            isMoreOpen
              ? 'mobile-dock-item is-active'
              : 'mobile-dock-item'
          }
          aria-label="Abrir mais opções"
          aria-expanded={isMoreOpen}
          onClick={toggleMore}
        >
          <MoreHorizontal size={21} strokeWidth={2.2} />
          <span>Mais</span>
        </button>
      </nav>
    </div>
  );
}

type NavigationLinkProps = {
  item: NavigationItem;
  mobileMore?: boolean;
};

function NavigationLink({
  item,
  mobileMore = false,
}: NavigationLinkProps) {
  const Icon = navigationIcons[item.to] ?? ChevronRight;

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) => {
        const baseClassName = mobileMore
          ? 'mobile-more-link'
          : 'sidebar-nav-link';

        return isActive
          ? `${baseClassName} active`
          : baseClassName;
      }}
    >
      <span className="navigation-item-icon">
        <Icon size={18} strokeWidth={2.1} />
      </span>

      <span>{item.label}</span>

      {mobileMore ? (
        <ChevronRight
          className="mobile-more-link-chevron"
          size={17}
          strokeWidth={2}
        />
      ) : null}
    </NavLink>
  );
}

type MobileDockLinkProps = {
  item: NavigationItem;
  label: string;
  icon: LucideIcon;
};

function MobileDockLink({
  item,
  label,
  icon: Icon,
}: MobileDockLinkProps) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        isActive
          ? 'mobile-dock-item active'
          : 'mobile-dock-item'
      }
    >
      <Icon size={21} strokeWidth={2.2} />
      <span>{label}</span>
    </NavLink>
  );
}

type BrandProps = {
  compact?: boolean;
};

function Brand({ compact = false }: BrandProps) {
  return (
    <div
      className={
        compact
          ? 'sidebar-brand compact'
          : 'sidebar-brand'
      }
    >
      <div className="sidebar-logo">
        <img src={cryomapLogo} alt="CryoMap" />
      </div>

      <div className="sidebar-brand-copy">
        <strong>CryoMap</strong>

        {!compact ? (
          <span>PCM & Monitoramento Térmico</span>
        ) : null}
      </div>
    </div>
  );
}

type UserAvatarProps = {
  initials: string;
  name?: string | null;
  compact?: boolean;
};

function UserAvatar({
  initials,
  name,
  compact = false,
}: UserAvatarProps) {
  return (
    <span
      className={
        compact
          ? 'user-avatar user-avatar--compact'
          : 'user-avatar'
      }
      aria-label={name ?? 'Usuário CryoMap'}
      title={name ?? 'Usuário CryoMap'}
    >
      {initials}
    </span>
  );
}

function getUserInitials(name?: string | null) {
  if (!name?.trim()) {
    return 'CM';
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatRole(role?: string) {
  const labels: Record<string, string> = {
    MASTER_ADMIN: 'Administrador master',
    SUPERVISOR: 'Supervisor',
    CLIENT_USER: 'Usuário cliente',
    TECHNICIAN: 'Técnico',
  };

  if (!role) {
    return 'Perfil não identificado';
  }

  return labels[role] ?? role;
}

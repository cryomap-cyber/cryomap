import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import cryomapLogo from '../../assets/cryomap-logo.png';
import { useAuth } from '../../contexts/useAuth';
import './AppLayout.css';

const navigationItems = [
  {
    label: 'Dashboard',
    to: '/dashboard',
  },
  {
    label: 'Empresas',
    to: '/companies',
  },
  {
    label: 'Salas',
    to: '/rooms',
  },
  {
    label: 'Equipamentos',
    to: '/equipments',
  },
  {
    label: 'Sensores',
    to: '/sensors',
  },
  {
  label: 'Tarefas',
  to: '/tasks',
  },
];

const disabledItems = ['Relatórios'];

export function AppLayout() {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  function handleLogout() {
    closeMobileMenu();
    logout();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />

        <nav className="sidebar-nav">
          {navigationItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}

          {disabledItems.map((item) => (
            <span key={item} className="sidebar-disabled">
              {item}
            </span>
          ))}
        </nav>

        <div className="sidebar-user">
          <span>{user?.name ?? 'Usuário CryoMap'}</span>
          <small>{user?.email}</small>

          <button type="button" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>

      <header className="mobile-topbar">
        <Brand compact />

        <button
          type="button"
          className={
            isMobileMenuOpen
              ? 'mobile-menu-button open'
              : 'mobile-menu-button'
          }
          aria-label="Abrir menu"
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {isMobileMenuOpen ? (
        <div className="mobile-menu-backdrop" onClick={closeMobileMenu}>
          <nav
            className="mobile-menu"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-menu-header">
              <strong>Menu</strong>

              <button type="button" onClick={closeMobileMenu}>
                Fechar
              </button>
            </div>

            {navigationItems.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={closeMobileMenu}>
                {item.label}
              </NavLink>
            ))}

            {disabledItems.map((item) => (
              <span key={item} className="mobile-menu-disabled">
                {item}
              </span>
            ))}

            <div className="mobile-menu-user">
              <span>{user?.name ?? 'Usuário CryoMap'}</span>
              <small>{user?.email}</small>

              <button type="button" onClick={handleLogout}>
                Sair
              </button>
            </div>
          </nav>
        </div>
      ) : null}

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

type BrandProps = {
  compact?: boolean;
};

function Brand({ compact = false }: BrandProps) {
  return (
    <div className={compact ? 'sidebar-brand compact' : 'sidebar-brand'}>
      <div className="sidebar-logo">
        <img src={cryomapLogo} alt="CryoMap" />
      </div>

      <div>
        <strong>CryoMap</strong>
        {!compact ? <span>Monitoramento térmico</span> : null}
      </div>
    </div>
  );
}
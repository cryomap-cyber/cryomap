import { NavLink, Outlet } from 'react-router-dom';
import cryomapLogo from '../../assets/cryomap-logo.png';
import { useAuth } from '../../contexts/useAuth';
import './AppLayout.css';

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <img src={cryomapLogo} alt="CryoMap" />
          </div>

          <div>
            <strong>CryoMap</strong>
            <span>Monitoramento térmico</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <span className="sidebar-disabled">Empresas</span>
          <span className="sidebar-disabled">Salas</span>
          <span className="sidebar-disabled">Equipamentos</span>
          <span className="sidebar-disabled">Sensores</span>
          <span className="sidebar-disabled">Tarefas</span>
          <span className="sidebar-disabled">Relatórios</span>
        </nav>

        <div className="sidebar-user">
          <span>{user?.name}</span>
          <small>{user?.role}</small>

          <button type="button" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
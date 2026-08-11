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
          <NavLink to="/companies">Empresas</NavLink>
          <NavLink to="/rooms">Salas</NavLink>
          <NavLink to="/equipments">Equipamentos</NavLink>
          <NavLink to="/sensors">Sensores</NavLink>
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
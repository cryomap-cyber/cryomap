import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import './Dashboard.css';

type DashboardOverview = {
  generatedAt: string;
  companies: {
    total: number;
    active: number;
    inactive: number;
  };
  rooms: {
    total: number;
    normal: number;
    warning: number;
    critical: number;
    offline: number;
  };
  sensors: {
    total: number;
    active: number;
    offline: number;
    maintenance: number;
    inactive: number;
  };
  equipments: {
    total: number;
    active: number;
    running: number;
    stopped: number;
    maintenance: number;
    offline: number;
    inactive: number;
  };
  tasks: {
    total: number;
    open: number;
    inProgress: number;
    done: number;
    canceled: number;
    overdue: number;
    criticalPriority: number;
  };
  thermalAlerts?: {
    total: number;
    active: number;
    open: number;
    acknowledged: number;
    resolved: number;
    dismissed: number;
    critical: number;
    warning: number;
  };
  activeThermalAlertRooms?: {
    total: number;
    rooms: Array<{
      id: string;
      severity: string;
      status: string;
      temperature: number | null;
      message: string;
      triggeredAt: string;
      room: {
        id: string;
        name: string;
        currentTemperature: number | null;
        thermalStatus: string;
      };
    }>;
  };
  recentThermalAlerts?: Array<{
    id: string;
    severity: string;
    status: string;
    temperature: number | null;
    message: string;
    triggeredAt: string;
    room?: {
      name: string;
    } | null;
  }>;
};

export function Dashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function handleRefresh() {
    setError('');
    setIsLoading(true);

    try {
      const response = await api.get<DashboardOverview>('/dashboard/overview');
      setOverview(response.data);
    } catch {
      setError('Não foi possível carregar o dashboard.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    api
      .get<DashboardOverview>('/dashboard/overview')
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setOverview(response.data);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível carregar o dashboard.');
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

  if (isLoading) {
    return <p>Carregando dashboard...</p>;
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <strong>{error}</strong>

        <button type="button" onClick={handleRefresh}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!overview) {
    return null;
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <span>Visão geral</span>
          <h1>Dashboard operacional</h1>

          <p>
            Última atualização:{' '}
            {new Date(overview.generatedAt).toLocaleString('pt-BR')}
          </p>
        </div>

        <button type="button" onClick={handleRefresh}>
          Atualizar
        </button>
      </header>

      <section className="metric-grid">
        <MetricCard
          title="Empresas"
          value={overview.companies.total}
          detail={`${overview.companies.active} ativas`}
        />

        <MetricCard
          title="Salas"
          value={overview.rooms.total}
          detail={`${overview.rooms.critical} críticas`}
          danger={overview.rooms.critical > 0}
        />

        <MetricCard
          title="Sensores"
          value={overview.sensors.total}
          detail={`${overview.sensors.active} ativos`}
        />

        <MetricCard
          title="Equipamentos"
          value={overview.equipments.total}
          detail={`${overview.equipments.maintenance} em manutenção`}
        />

        <MetricCard
          title="Tarefas abertas"
          value={overview.tasks.open}
          detail={`${overview.tasks.criticalPriority} críticas`}
          danger={overview.tasks.criticalPriority > 0}
        />

        <MetricCard
          title="Alertas ativos"
          value={overview.thermalAlerts?.active ?? 0}
          detail={`${overview.thermalAlerts?.critical ?? 0} críticos`}
          danger={(overview.thermalAlerts?.active ?? 0) > 0}
        />
      </section>

      <section className="dashboard-panels">
        <article className="dashboard-panel">
          <h2>Salas com alerta ativo</h2>

          {overview.activeThermalAlertRooms?.rooms.length ? (
            <div className="alert-list">
              {overview.activeThermalAlertRooms.rooms.map((alert) => (
                <div className="alert-item" key={alert.id}>
                  <strong>{alert.room.name}</strong>
                  <span>{alert.message}</span>
                  <small>
                    {alert.status} · {alert.severity} ·{' '}
                    {new Date(alert.triggeredAt).toLocaleString('pt-BR')}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">Nenhuma sala com alerta ativo.</p>
          )}
        </article>

        <article className="dashboard-panel">
          <h2>Últimos alertas térmicos</h2>

          {overview.recentThermalAlerts?.length ? (
            <div className="alert-list">
              {overview.recentThermalAlerts.map((alert) => (
                <div className="alert-item" key={alert.id}>
                  <strong>{alert.room?.name ?? 'Sala não informada'}</strong>
                  <span>{alert.message}</span>
                  <small>
                    {alert.status} · {alert.severity} ·{' '}
                    {new Date(alert.triggeredAt).toLocaleString('pt-BR')}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">Nenhum alerta térmico recente.</p>
          )}
        </article>
      </section>
    </div>
  );
}

type MetricCardProps = {
  title: string;
  value: number;
  detail: string;
  danger?: boolean;
};

function MetricCard({ title, value, detail, danger = false }: MetricCardProps) {
  return (
    <article className={danger ? 'metric-card danger' : 'metric-card'}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

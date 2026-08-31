import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../contexts/useAuth';
import { getDashboardOverview } from '../../services/dashboard';
import type {
  ActiveThermalAlertRoom,
  DashboardOverview,
  LatestRoomTemperatureReading,
  RecentServiceRecord,
  RecentThermalAlert,
} from '../../types/dashboard';
import './Dashboard.css';

type HealthTone = 'stable' | 'attention' | 'critical';

export function Dashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function handleRefresh() {
    setError('');
    setIsLoading(true);

    try {
      const data = await getDashboardOverview();
      setOverview(data);
    } catch {
      setError('Não foi possível carregar o dashboard.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    getDashboardOverview()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setOverview(data);
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

  const health = useMemo(() => {
    if (!overview) {
      return getOperationalHealth(null);
    }

    return getOperationalHealth(overview);
  }, [overview]);

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <span />
        <strong>Carregando dashboard...</strong>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div>
          <strong>{error}</strong>
          <p>Verifique se o backend está rodando e tente novamente.</p>
        </div>

        <button type="button" onClick={handleRefresh}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!overview) {
    return null;
  }

  const activeAlerts = overview.thermalAlerts?.active ?? 0;
  const criticalAlerts = overview.thermalAlerts?.critical ?? 0;
  const activeAlertRooms = overview.activeThermalAlertRooms?.rooms ?? [];
  const recentAlerts = overview.recentThermalAlerts ?? [];
  const recentServiceRecords = overview.recentServiceRecords ?? [];
  const latestReadings = overview.latestRoomTemperatureReadings ?? [];

  return (
    <div className="dashboard-page">
      <header className={`dashboard-hero ${health.tone}`}>
        <div className="dashboard-hero-content">
          <span>Visão geral</span>

          <h1>Dashboard operacional</h1>

          <p>
            {getDashboardDescription(user?.role)} Última atualização:{' '}
            <strong>{formatDateTime(overview.generatedAt)}</strong>.
          </p>

          <div className="dashboard-hero-tags">
            <small>{formatRole(user?.role)}</small>
            <small>{overview.filters?.companyId ? 'Empresa filtrada' : 'Visão geral'}</small>
            <small>{overview.companies.total} empresa(s)</small>
          </div>
        </div>

        <div className="dashboard-hero-status">
          <span>Status atual</span>
          <strong>{health.title}</strong>
          <p>{health.description}</p>

          <button type="button" onClick={handleRefresh}>
            Atualizar agora
          </button>
        </div>
      </header>

      <section className="dashboard-kpi-grid">
        <MetricCard
          title="Salas monitoradas"
          value={overview.rooms.total}
          detail={`${overview.rooms.normal} normais · ${overview.rooms.critical} críticas`}
          tone={overview.rooms.critical > 0 ? 'critical' : 'stable'}
        />

        <MetricCard
          title="Alertas ativos"
          value={activeAlerts}
          detail={`${criticalAlerts} críticos · ${overview.thermalAlerts?.warning ?? 0} em atenção`}
          tone={activeAlerts > 0 ? 'critical' : 'stable'}
        />

        <MetricCard
          title="Sensores"
          value={overview.sensors.total}
          detail={`${overview.sensors.active} ativos · ${overview.sensors.offline} offline`}
          tone={overview.sensors.offline > 0 ? 'attention' : 'stable'}
        />

        <MetricCard
          title="Equipamentos"
          value={overview.equipments.total}
          detail={`${overview.equipments.running} rodando · ${overview.equipments.maintenance} manutenção`}
          tone={overview.equipments.maintenance > 0 ? 'attention' : 'stable'}
        />

        <MetricCard
          title="Chamados abertos"
          value={overview.tasks.open}
          detail={`${overview.tasks.inProgress} em andamento · ${overview.tasks.overdue} atrasados`}
          tone={overview.tasks.overdue > 0 ? 'attention' : 'stable'}
        />

        <MetricCard
          title="Prioridade crítica"
          value={overview.tasks.criticalPriority}
          detail={`${overview.tasks.done} tarefas concluídas`}
          tone={overview.tasks.criticalPriority > 0 ? 'critical' : 'stable'}
        />
      </section>

      <section className="dashboard-main-grid">
        <ActiveAlertRoomsPanel rooms={activeAlertRooms} />

        <LatestReadingsPanel readings={latestReadings} />
      </section>

      <section className="dashboard-secondary-grid">
        <RecentAlertsPanel alerts={recentAlerts} />

        <RecentServiceRecordsPanel records={recentServiceRecords} />
      </section>
    </div>
  );
}

type MetricCardProps = {
  title: string;
  value: number;
  detail: string;
  tone?: HealthTone;
};

function MetricCard({
  title,
  value,
  detail,
  tone = 'stable',
}: MetricCardProps) {
  return (
    <article className={`dashboard-kpi-card ${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

type ActiveAlertRoomsPanelProps = {
  rooms: ActiveThermalAlertRoom[];
};

function ActiveAlertRoomsPanel({ rooms }: ActiveAlertRoomsPanelProps) {
  return (
    <article className="dashboard-panel highlight">
      <div className="dashboard-panel-header">
        <div>
          <span>Risco térmico</span>
          <h2>Salas com alerta ativo</h2>
        </div>

        <strong>{rooms.length}</strong>
      </div>

      {rooms.length > 0 ? (
        <div className="dashboard-alert-room-list">
          {rooms.map((alert) => (
            <div className="dashboard-alert-room" key={alert.id}>
              <div>
                <strong>{alert.room.name}</strong>
                <span>{alert.message || 'Alerta térmico ativo'}</span>
              </div>

              <div className="dashboard-alert-room-meta">
                <StatusPill value={alert.severity} />
                <strong>{formatTemperature(alert.temperature)}</strong>
                <small>{formatDateTime(alert.triggeredAt)}</small>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="Nenhuma sala com alerta ativo no momento." />
      )}
    </article>
  );
}

type LatestReadingsPanelProps = {
  readings: LatestRoomTemperatureReading[];
};

function LatestReadingsPanel({ readings }: LatestReadingsPanelProps) {
  return (
    <article className="dashboard-panel">
      <div className="dashboard-panel-header">
        <div>
          <span>Tempo real</span>
          <h2>Últimas leituras</h2>
        </div>

        <strong>{readings.length}</strong>
      </div>

      {readings.length > 0 ? (
        <div className="dashboard-reading-list">
          {readings.slice(0, 8).map((reading) => (
            <div className="dashboard-reading-item" key={reading.id}>
              <div>
                <strong>{reading.room?.name ?? 'Sala não informada'}</strong>
                <small>
                  {reading.sensor?.code
                    ? `Sensor ${reading.sensor.code}`
                    : 'Leitura manual'}
                </small>
              </div>

              <div className="dashboard-reading-values">
                <strong>{formatTemperature(reading.temperature)}</strong>
                <span>{formatHumidity(reading.humidity)}</span>
                <small>{formatDateTime(reading.readAt)}</small>
              </div>

              <StatusPill value={reading.room?.thermalStatus ?? 'NORMAL'} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="Nenhuma leitura recente encontrada." />
      )}
    </article>
  );
}

type RecentAlertsPanelProps = {
  alerts: RecentThermalAlert[];
};

function RecentAlertsPanel({ alerts }: RecentAlertsPanelProps) {
  return (
    <article className="dashboard-panel">
      <div className="dashboard-panel-header">
        <div>
          <span>Histórico</span>
          <h2>Últimos alertas</h2>
        </div>
      </div>

      {alerts.length > 0 ? (
        <div className="dashboard-compact-list">
          {alerts.slice(0, 5).map((alert) => (
            <div className="dashboard-compact-item" key={alert.id}>
              <div>
                <strong>{alert.room?.name ?? 'Sala não informada'}</strong>
                <span>{alert.message || 'Alerta térmico registrado'}</span>
              </div>

              <div>
                <StatusPill value={alert.status} />
                <small>{formatDateTime(alert.triggeredAt)}</small>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="Nenhum alerta térmico recente." />
      )}
    </article>
  );
}

type RecentServiceRecordsPanelProps = {
  records: RecentServiceRecord[];
};

function RecentServiceRecordsPanel({ records }: RecentServiceRecordsPanelProps) {
  return (
    <article className="dashboard-panel">
      <div className="dashboard-panel-header">
        <div>
          <span>Operação</span>
          <h2>Últimos atendimentos</h2>
        </div>
      </div>

      {records.length > 0 ? (
        <div className="dashboard-compact-list">
          {records.slice(0, 5).map((record) => (
            <div className="dashboard-compact-item" key={record.id}>
              <div>
                <strong>{record.task?.title ?? `Atendimento ${shortId(record.id)}`}</strong>
                <span>
                  {record.equipment?.name ??
                    record.room?.name ??
                    'Sem equipamento informado'}
                </span>
              </div>

              <div>
                <StatusPill
                  value={record.finishedAt ? 'FINALIZADO' : 'EM_ANDAMENTO'}
                />
                <small>
                  {formatMinutes(record.downtimeMinutes)} ·{' '}
                  {formatDateTime(record.startedAt)}
                </small>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="Nenhum atendimento recente." />
      )}
    </article>
  );
}

type StatusPillProps = {
  value: string;
};

function StatusPill({ value }: StatusPillProps) {
  const normalized = value.toLowerCase();

  return (
    <span className={`dashboard-status-pill ${normalized}`}>
      {formatStatus(value)}
    </span>
  );
}

type EmptyStateProps = {
  message: string;
};

function EmptyState({ message }: EmptyStateProps) {
  return <p className="dashboard-empty-state">{message}</p>;
}

function getOperationalHealth(overview: DashboardOverview | null): {
  tone: HealthTone;
  title: string;
  description: string;
} {
  if (!overview) {
    return {
      tone: 'stable',
      title: 'Carregando',
      description: 'Buscando dados operacionais.',
    };
  }

  const activeAlerts = overview.thermalAlerts?.active ?? 0;
  const criticalAlerts = overview.thermalAlerts?.critical ?? 0;

  if (overview.rooms.critical > 0 || criticalAlerts > 0) {
    return {
      tone: 'critical',
      title: 'Atenção crítica',
      description: 'Existem salas ou alertas críticos que precisam de ação.',
    };
  }

  if (
    activeAlerts > 0 ||
    overview.sensors.offline > 0 ||
    overview.tasks.overdue > 0
  ) {
    return {
      tone: 'attention',
      title: 'Monitorar operação',
      description: 'Existem pontos em atenção, mas sem criticidade máxima.',
    };
  }

  return {
    tone: 'stable',
    title: 'Operação estável',
    description: 'Nenhuma condição crítica ativa no momento.',
  };
}

function getDashboardDescription(role?: string) {
  if (role === 'CLIENT_USER') {
    return 'Resumo dos ambientes, alertas e atendimentos da sua empresa.';
  }

  if (role === 'TECHNICIAN') {
    return 'Resumo operacional das salas, chamados e alertas da sua empresa.';
  }

  return 'Resumo consolidado de empresas, salas, sensores, alertas e operação.';
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

function formatStatus(value: string) {
  const labels: Record<string, string> = {
    NORMAL: 'Normal',
    WARNING: 'Atenção',
    CRITICAL: 'Crítico',
    OFFLINE: 'Offline',
    OPEN: 'Aberto',
    ACKNOWLEDGED: 'Reconhecido',
    RESOLVED: 'Resolvido',
    DISMISSED: 'Dispensado',
    FINALIZADO: 'Finalizado',
    EM_ANDAMENTO: 'Em andamento',
  };

  return labels[value] ?? value;
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

function formatTemperature(value?: number | null) {
  if (value === null || value === undefined) {
    return '-';
  }

  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)} °C`;
}

function formatHumidity(value?: number | null) {
  if (value === null || value === undefined) {
    return 'Umidade não informada';
  }

  return `${new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 1,
  }).format(value)}% UR`;
}

function formatMinutes(value?: number | null) {
  if (value === null || value === undefined) {
    return 'sem tempo parado';
  }

  if (value < 60) {
    return `${value} min`;
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}min`;
}

function shortId(value: string) {
  return value.slice(0, 8).toUpperCase();
}

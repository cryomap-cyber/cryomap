import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BellRing,
  Building2,
  CheckCircle2,
  CircleGauge,
  Clock3,
  DoorOpen,
  Droplets,
  LayoutDashboard,
  RefreshCw,
  Radio,
  Snowflake,
  Thermometer,
  TriangleAlert,
  Wrench,
} from 'lucide-react';

import {
  ActionButton,
  EmptyState,
  InlineNotice,
  LoadingState,
  MetaPill,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusBadge,
  type UiTone,
} from '../../components/ui/CryoUi';
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
      <LoadingState
        title="Carregando dashboard"
        description="Buscando indicadores operacionais e térmicos."
      />
    );
  }

  if (error) {
    return (
      <InlineNotice
        tone="danger"
        icon={TriangleAlert}
        title={error}
        description="Verifique se o backend está rodando e tente novamente."
        action={
          <ActionButton
            type="button"
            icon={RefreshCw}
            variant="danger"
            onClick={handleRefresh}
          >
            Tentar novamente
          </ActionButton>
        }
      />
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
      <PageHeader
        eyebrow="Operação"
        title="Visão geral"
        description={getDashboardDescription(user?.role)}
        icon={LayoutDashboard}
        actions={
          <ActionButton
            type="button"
            icon={RefreshCw}
            onClick={handleRefresh}
          >
            Atualizar dados
          </ActionButton>
        }
        meta={
          <>
            <MetaPill icon={CircleGauge}>{formatRole(user?.role)}</MetaPill>

            <MetaPill icon={Building2}>
              {overview.filters?.companyId ? 'Empresa filtrada' : 'Visão geral'}
            </MetaPill>

            <MetaPill icon={Clock3}>
              Atualizado {formatDateTime(overview.generatedAt)}
            </MetaPill>
          </>
        }
      />

      <OperationalHealthCard
        health={health}
        generatedAt={overview.generatedAt}
      />

      <section
        className="dashboard-kpi-grid"
        aria-label="Indicadores operacionais"
      >
        <MetricCard
          label="Salas monitoradas"
          value={overview.rooms.total}
          detail={`${overview.rooms.normal} normais · ${overview.rooms.critical} críticas`}
          icon={DoorOpen}
          tone={overview.rooms.critical > 0 ? 'danger' : 'success'}
        />

        <MetricCard
          label="Alertas ativos"
          value={activeAlerts}
          detail={`${criticalAlerts} críticos · ${overview.thermalAlerts?.warning ?? 0} em atenção`}
          icon={BellRing}
          tone={activeAlerts > 0 ? 'danger' : 'success'}
        />

        <MetricCard
          label="Sensores"
          value={overview.sensors.total}
          detail={`${overview.sensors.active} ativos · ${overview.sensors.offline} offline`}
          icon={Radio}
          tone={overview.sensors.offline > 0 ? 'warning' : 'success'}
        />

        <MetricCard
          label="Equipamentos"
          value={overview.equipments.total}
          detail={`${overview.equipments.running} rodando · ${overview.equipments.maintenance} manutenção`}
          icon={Snowflake}
          tone={overview.equipments.maintenance > 0 ? 'warning' : 'info'}
        />

        <MetricCard
          label="Chamados abertos"
          value={overview.tasks.open}
          detail={`${overview.tasks.inProgress} em andamento · ${overview.tasks.overdue} atrasados`}
          icon={Wrench}
          tone={overview.tasks.overdue > 0 ? 'warning' : 'info'}
        />

        <MetricCard
          label="Prioridade crítica"
          value={overview.tasks.criticalPriority}
          detail={`${overview.tasks.done} tarefas concluídas`}
          icon={TriangleAlert}
          tone={overview.tasks.criticalPriority > 0 ? 'danger' : 'success'}
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

type OperationalHealthCardProps = {
  health: {
    tone: HealthTone;
    title: string;
    description: string;
  };
  generatedAt?: string | null;
};

function OperationalHealthCard({
  health,
  generatedAt,
}: OperationalHealthCardProps) {
  const tone = healthToneToUiTone(health.tone);
  const HealthIcon =
    health.tone === 'critical'
      ? TriangleAlert
      : health.tone === 'attention'
        ? Activity
        : CheckCircle2;

  return (
    <section className={`dashboard-health dashboard-health--${health.tone}`}>
      <div className="dashboard-health__icon" aria-hidden="true">
        <HealthIcon size={24} strokeWidth={2.15} />
      </div>

      <div className="dashboard-health__copy">
        <span>Saúde operacional</span>
        <strong>{health.title}</strong>
        <p>{health.description}</p>
      </div>

      <div className="dashboard-health__meta">
        <StatusBadge tone={tone}>{formatHealthTone(health.tone)}</StatusBadge>

        <small>
          <Clock3 size={13} strokeWidth={2} />
          {formatDateTime(generatedAt)}
        </small>
      </div>
    </section>
  );
}

type ActiveAlertRoomsPanelProps = {
  rooms: ActiveThermalAlertRoom[];
};

function ActiveAlertRoomsPanel({ rooms }: ActiveAlertRoomsPanelProps) {
  return (
    <SectionCard
      eyebrow="Risco térmico"
      title="Salas com alerta ativo"
      description="Ambientes que exigem atenção operacional."
      icon={TriangleAlert}
      tone={rooms.length > 0 ? 'danger' : 'success'}
      action={
        <StatusBadge tone={rooms.length > 0 ? 'danger' : 'success'}>
          {rooms.length} {rooms.length === 1 ? 'sala' : 'salas'}
        </StatusBadge>
      }
    >
      {rooms.length > 0 ? (
        <div className="dashboard-list">
          {rooms.map((alert) => (
            <div className="dashboard-list-item" key={alert.id}>
              <div className="dashboard-list-item__icon dashboard-list-item__icon--danger">
                <TriangleAlert size={17} strokeWidth={2.15} />
              </div>

              <div className="dashboard-list-item__copy">
                <strong>{alert.room.name}</strong>
                <span>{alert.message || 'Alerta térmico ativo'}</span>
              </div>

              <div className="dashboard-list-item__metrics">
                <strong>{formatTemperature(alert.temperature)}</strong>
                <small>{formatDateTime(alert.triggeredAt)}</small>
              </div>

              <StatusPill value={alert.severity} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CheckCircle2}
          title="Nenhuma sala em alerta"
          description="Os ambientes monitorados estão sem alertas térmicos ativos."
        />
      )}
    </SectionCard>
  );
}

type LatestReadingsPanelProps = {
  readings: LatestRoomTemperatureReading[];
};

function LatestReadingsPanel({ readings }: LatestReadingsPanelProps) {
  return (
    <SectionCard
      eyebrow="Tempo real"
      title="Últimas leituras"
      description="Temperatura e umidade recebidas mais recentemente."
      icon={Thermometer}
      tone="info"
      action={
        <StatusBadge tone="info">
          {readings.length} {readings.length === 1 ? 'leitura' : 'leituras'}
        </StatusBadge>
      }
    >
      {readings.length > 0 ? (
        <div className="dashboard-list">
          {readings.slice(0, 8).map((reading) => (
            <div className="dashboard-list-item" key={reading.id}>
              <div className="dashboard-list-item__icon">
                <Thermometer size={17} strokeWidth={2.15} />
              </div>

              <div className="dashboard-list-item__copy">
                <strong>{reading.room?.name ?? 'Sala não informada'}</strong>
                <span>
                  {reading.sensor?.code
                    ? `Sensor ${reading.sensor.code}`
                    : 'Leitura manual'}
                </span>
              </div>

              <div className="dashboard-reading-stack">
                <span className="dashboard-reading-stack__temperature">
                  {formatTemperature(reading.temperature)}
                </span>

                <span className="dashboard-reading-stack__humidity">
                  <Droplets size={13} strokeWidth={2} />
                  {formatHumidity(reading.humidity)}
                </span>

                <small>{formatDateTime(reading.readAt)}</small>
              </div>

              <StatusPill value={reading.room?.thermalStatus ?? 'NORMAL'} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Thermometer}
          title="Nenhuma leitura recente"
          description="As leituras mais recentes aparecerão aqui quando forem recebidas."
        />
      )}
    </SectionCard>
  );
}

type RecentAlertsPanelProps = {
  alerts: RecentThermalAlert[];
};

function RecentAlertsPanel({ alerts }: RecentAlertsPanelProps) {
  return (
    <SectionCard
      eyebrow="Histórico"
      title="Últimos alertas"
      description="Eventos térmicos registrados recentemente."
      icon={BellRing}
      tone="warning"
    >
      {alerts.length > 0 ? (
        <div className="dashboard-list dashboard-list--compact">
          {alerts.slice(0, 5).map((alert) => (
            <div className="dashboard-list-item" key={alert.id}>
              <div className="dashboard-list-item__icon dashboard-list-item__icon--warning">
                <BellRing size={16} strokeWidth={2.15} />
              </div>

              <div className="dashboard-list-item__copy">
                <strong>{alert.room?.name ?? 'Sala não informada'}</strong>
                <span>{alert.message || 'Alerta térmico registrado'}</span>
              </div>

              <div className="dashboard-list-item__side">
                <StatusPill value={alert.status} />
                <small>{formatDateTime(alert.triggeredAt)}</small>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BellRing}
          title="Nenhum alerta recente"
          description="Não há eventos térmicos recentes para exibir."
        />
      )}
    </SectionCard>
  );
}

type RecentServiceRecordsPanelProps = {
  records: RecentServiceRecord[];
};

function RecentServiceRecordsPanel({ records }: RecentServiceRecordsPanelProps) {
  return (
    <SectionCard
      eyebrow="Operação"
      title="Últimos atendimentos"
      description="Atividades técnicas registradas mais recentemente."
      icon={Wrench}
      tone="info"
    >
      {records.length > 0 ? (
        <div className="dashboard-list dashboard-list--compact">
          {records.slice(0, 5).map((record) => (
            <div className="dashboard-list-item" key={record.id}>
              <div className="dashboard-list-item__icon">
                <Wrench size={16} strokeWidth={2.15} />
              </div>

              <div className="dashboard-list-item__copy">
                <strong>
                  {record.task?.title ??
                    `Atendimento ${shortId(record.id)}`}
                </strong>
                <span>
                  {record.equipment?.name ??
                    record.room?.name ??
                    'Sem equipamento informado'}
                </span>
              </div>

              <div className="dashboard-list-item__side">
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
        <EmptyState
          icon={Wrench}
          title="Nenhum atendimento recente"
          description="Os atendimentos técnicos mais recentes aparecerão aqui."
        />
      )}
    </SectionCard>
  );
}

type StatusPillProps = {
  value: string;
};

function StatusPill({ value }: StatusPillProps) {
  return (
    <StatusBadge tone={getStatusTone(value)}>
      {formatStatus(value)}
    </StatusBadge>
  );
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

function healthToneToUiTone(tone: HealthTone): UiTone {
  if (tone === 'critical') {
    return 'danger';
  }

  if (tone === 'attention') {
    return 'warning';
  }

  return 'success';
}

function getStatusTone(value: string): UiTone {
  const normalized = value.toUpperCase();

  if (
    [
      'NORMAL',
      'RESOLVED',
      'FINALIZADO',
      'DONE',
      'ACTIVE',
    ].includes(normalized)
  ) {
    return 'success';
  }

  if (
    [
      'WARNING',
      'OPEN',
      'ACKNOWLEDGED',
      'EM_ANDAMENTO',
      'IN_PROGRESS',
      'OVERDUE',
    ].includes(normalized)
  ) {
    return 'warning';
  }

  if (
    [
      'CRITICAL',
      'OFFLINE',
      'DISMISSED',
      'BLOCKED',
      'INACTIVE',
    ].includes(normalized)
  ) {
    return 'danger';
  }

  return 'info';
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

function formatHealthTone(tone: HealthTone) {
  const labels: Record<HealthTone, string> = {
    stable: 'Estável',
    attention: 'Atenção',
    critical: 'Crítico',
  };

  return labels[tone];
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
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

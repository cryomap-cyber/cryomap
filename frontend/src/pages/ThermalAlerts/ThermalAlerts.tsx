import { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  Building2,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  DoorOpen,
  Eye,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Snowflake,
  Thermometer,
  Trash2,
  TriangleAlert,
  UserRound,
  X,
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
import { getRooms } from '../../services/rooms';
import { getSensors } from '../../services/sensors';
import {
  acknowledgeThermalAlert,
  dismissThermalAlert,
  getThermalAlerts,
  removeThermalAlert,
  resolveThermalAlert,
} from '../../services/thermal-alerts';
import type { Company } from '../../types/company';
import type { Room } from '../../types/room';
import type { Sensor } from '../../types/sensor';
import type {
  ThermalAlert,
  ThermalAlertSeverity,
  ThermalAlertStatus,
  ThermalAlertType,
} from '../../types/thermal-alert';
import './ThermalAlerts.css';

type LoadDataOptions = {
  companyId?: string;
  roomId?: string;
  sensorId?: string;
  type?: string;
  severity?: string;
  status?: string;
  startDateValue?: string;
  endDateValue?: string;
};

type ActiveFilter = {
  label: string;
  value: string;
};

const alertTypeOptions: { value: ThermalAlertType; label: string }[] = [
  {
    value: 'HIGH_TEMPERATURE',
    label: 'Temperatura alta',
  },
  {
    value: 'LOW_TEMPERATURE',
    label: 'Temperatura baixa',
  },
];

const alertSeverityOptions: {
  value: ThermalAlertSeverity;
  label: string;
}[] = [
  {
    value: 'WARNING',
    label: 'Atenção',
  },
  {
    value: 'CRITICAL',
    label: 'Crítico',
  },
];

const alertStatusOptions: {
  value: ThermalAlertStatus;
  label: string;
}[] = [
  {
    value: 'OPEN',
    label: 'Aberto',
  },
  {
    value: 'ACKNOWLEDGED',
    label: 'Reconhecido',
  },
  {
    value: 'RESOLVED',
    label: 'Resolvido',
  },
  {
    value: 'DISMISSED',
    label: 'Dispensado',
  },
];

export function ThermalAlerts() {
  const { user } = useAuth();

  const canManageThermalAlerts =
    user?.role === 'MASTER_ADMIN' ||
    user?.role === 'SUPERVISOR' ||
    user?.role === 'TECHNICIAN';

  const [alerts, setAlerts] = useState<ThermalAlert[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedSensorId, setSelectedSensorId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(defaultEndDate());
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [actionAlertId, setActionAlertId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadData(options?: LoadDataOptions) {
    setError('');
    setIsLoading(true);

    const nextCompanyId = options?.companyId ?? selectedCompanyId;
    const nextRoomId = options?.roomId ?? selectedRoomId;
    const nextSensorId = options?.sensorId ?? selectedSensorId;
    const nextType = options?.type ?? selectedType;
    const nextSeverity = options?.severity ?? selectedSeverity;
    const nextStatus = options?.status ?? selectedStatus;
    const nextStartDate = options?.startDateValue ?? startDate;
    const nextEndDate = options?.endDateValue ?? endDate;

    try {
      const [companiesData, roomsData, sensorsData, alertsData] =
        await Promise.all([
          getCompanies(),
          getRooms(nextCompanyId || undefined),
          getSensors({
            companyId: nextCompanyId || undefined,
            roomId: nextRoomId || undefined,
          }),
          getThermalAlerts({
            companyId: nextCompanyId || undefined,
            roomId: nextRoomId || undefined,
            sensorId: nextSensorId || undefined,
            type: nextType ? (nextType as ThermalAlertType) : undefined,
            severity: nextSeverity
              ? (nextSeverity as ThermalAlertSeverity)
              : undefined,
            status: nextStatus
              ? (nextStatus as ThermalAlertStatus)
              : undefined,
            startDate: optionalStartIsoDate(nextStartDate),
            endDate: optionalEndIsoDate(nextEndDate),
          }),
        ]);

      setCompanies(companiesData);
      setRooms(roomsData);
      setSensors(sensorsData);
      setAlerts(alertsData);
    } catch {
      setError('Não foi possível carregar os alertas térmicos.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefresh() {
    await loadData();
  }

  async function handleClearFilters() {
    const nextStartDate = defaultStartDate();
    const nextEndDate = defaultEndDate();

    setSelectedCompanyId('');
    setSelectedRoomId('');
    setSelectedSensorId('');
    setSelectedType('');
    setSelectedSeverity('');
    setSelectedStatus('');
    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
    setSearch('');
    setError('');

    await loadData({
      companyId: '',
      roomId: '',
      sensorId: '',
      type: '',
      severity: '',
      status: '',
      startDateValue: nextStartDate,
      endDateValue: nextEndDate,
    });
  }

  useEffect(() => {
    let isMounted = true;

    const initialParams = {
      startDate: optionalStartIsoDate(defaultStartDate()),
      endDate: optionalEndIsoDate(defaultEndDate()),
    };

    Promise.all([
      getCompanies(),
      getRooms(),
      getSensors(),
      getThermalAlerts(initialParams),
    ])
      .then(([companiesData, roomsData, sensorsData, alertsData]) => {
        if (!isMounted) {
          return;
        }

        setCompanies(companiesData);
        setRooms(roomsData);
        setSensors(sensorsData);
        setAlerts(alertsData);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível carregar os alertas térmicos.');
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

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getRooms(selectedCompanyId || undefined),
      getSensors({
        companyId: selectedCompanyId || undefined,
        roomId: selectedRoomId || undefined,
      }),
    ])
      .then(([roomsData, sensorsData]) => {
        if (!isMounted) {
          return;
        }

        setRooms(roomsData);
        setSensors(sensorsData);

        if (
          selectedRoomId &&
          !roomsData.some((room) => room.id === selectedRoomId)
        ) {
          setSelectedRoomId('');
        }

        if (
          selectedSensorId &&
          !sensorsData.some((sensor) => sensor.id === selectedSensorId)
        ) {
          setSelectedSensorId('');
        }
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível carregar filtros de alertas.');
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCompanyId, selectedRoomId, selectedSensorId]);

  const filteredAlerts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return alerts;
    }

    return alerts.filter((alert) => {
      return [
        alert.company?.name ?? '',
        alert.room?.name ?? '',
        alert.sensor?.code ?? '',
        alert.type ?? '',
        formatAlertType(alert.type),
        alert.severity ?? '',
        formatSeverity(alert.severity),
        alert.status ?? '',
        formatStatus(alert.status),
        alert.message ?? '',
        alert.acknowledgedByUser?.name ?? '',
        String(alert.temperature),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [alerts, search]);

  const activeFilters = useMemo(() => {
    const filters: ActiveFilter[] = [];

    const selectedCompany = companies.find(
      (company) => company.id === selectedCompanyId,
    );
    const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
    const selectedSensor = sensors.find(
      (sensor) => sensor.id === selectedSensorId,
    );

    if (selectedCompany) {
      filters.push({
        label: 'Empresa',
        value: selectedCompany.name,
      });
    }

    if (selectedRoom) {
      filters.push({
        label: 'Sala',
        value: selectedRoom.name,
      });
    }

    if (selectedSensor) {
      filters.push({
        label: 'Sensor',
        value: selectedSensor.code,
      });
    }

    if (selectedType) {
      filters.push({
        label: 'Tipo',
        value: formatAlertType(selectedType),
      });
    }

    if (selectedSeverity) {
      filters.push({
        label: 'Severidade',
        value: formatSeverity(selectedSeverity),
      });
    }

    if (selectedStatus) {
      filters.push({
        label: 'Status',
        value: formatStatus(selectedStatus),
      });
    }

    if (startDate !== defaultStartDate() || endDate !== defaultEndDate()) {
      filters.push({
        label: 'Período',
        value: `${formatDate(startDate)} até ${formatDate(endDate)}`,
      });
    }

    if (search.trim()) {
      filters.push({
        label: 'Busca',
        value: search.trim(),
      });
    }

    return filters;
  }, [
    companies,
    endDate,
    rooms,
    search,
    selectedCompanyId,
    selectedRoomId,
    selectedSensorId,
    selectedSeverity,
    selectedStatus,
    selectedType,
    sensors,
    startDate,
  ]);

  const openAlerts = alerts.filter((alert) => alert.status === 'OPEN').length;

  const acknowledgedAlerts = alerts.filter(
    (alert) => alert.status === 'ACKNOWLEDGED',
  ).length;

  const activeAlerts = alerts.filter((alert) =>
    ['OPEN', 'ACKNOWLEDGED'].includes(alert.status),
  ).length;

  const criticalAlerts = alerts.filter(
    (alert) => alert.severity === 'CRITICAL',
  ).length;

  const resolvedAlerts = alerts.filter(
    (alert) => alert.status === 'RESOLVED',
  ).length;

  const periodLabel = `${formatDate(startDate)} até ${formatDate(endDate)}`;

  async function handleAcknowledge(alert: ThermalAlert) {
    if (!canManageThermalAlerts) {
      return;
    }

    const confirmed = window.confirm(
      `Deseja reconhecer o alerta da sala "${alert.room?.name ?? alert.roomId}"?`,
    );

    if (!confirmed) {
      return;
    }

    setActionAlertId(alert.id);
    setError('');

    try {
      await acknowledgeThermalAlert(alert.id);
      await handleRefresh();
    } catch {
      setError('Não foi possível reconhecer o alerta.');
    } finally {
      setActionAlertId(null);
    }
  }

  async function handleResolve(alert: ThermalAlert) {
    if (!canManageThermalAlerts) {
      return;
    }

    const confirmed = window.confirm(
      `Deseja resolver o alerta da sala "${alert.room?.name ?? alert.roomId}"?`,
    );

    if (!confirmed) {
      return;
    }

    setActionAlertId(alert.id);
    setError('');

    try {
      await resolveThermalAlert(alert.id);
      await handleRefresh();
    } catch {
      setError('Não foi possível resolver o alerta.');
    } finally {
      setActionAlertId(null);
    }
  }

  async function handleDismiss(alert: ThermalAlert) {
    if (!canManageThermalAlerts) {
      return;
    }

    const confirmed = window.confirm(
      `Deseja dispensar o alerta da sala "${alert.room?.name ?? alert.roomId}"?`,
    );

    if (!confirmed) {
      return;
    }

    setActionAlertId(alert.id);
    setError('');

    try {
      await dismissThermalAlert(alert.id);
      await handleRefresh();
    } catch {
      setError('Não foi possível dispensar o alerta.');
    } finally {
      setActionAlertId(null);
    }
  }

  async function handleRemove(alert: ThermalAlert) {
    if (!canManageThermalAlerts) {
      return;
    }

    const confirmed = window.confirm(
      `Deseja realmente remover o alerta da sala "${alert.room?.name ?? alert.roomId}"?`,
    );

    if (!confirmed) {
      return;
    }

    setActionAlertId(alert.id);
    setError('');

    try {
      await removeThermalAlert(alert.id);
      await handleRefresh();
    } catch {
      setError('Não foi possível remover o alerta.');
    } finally {
      setActionAlertId(null);
    }
  }

  if (isLoading) {
    return (
      <LoadingState
        title="Carregando alertas térmicos"
        description="Buscando ocorrências de temperatura fora dos limites."
      />
    );
  }

  return (
    <div className="thermal-alerts-page">
      <PageHeader
        eyebrow="Monitoramento"
        title="Alertas térmicos"
        description="Acompanhe ocorrências fora da faixa térmica, identifique criticidade e registre o tratamento operacional."
        icon={BellRing}
        actions={
          <ActionButton
            type="button"
            icon={RefreshCw}
            variant="primary"
            onClick={() => void handleRefresh()}
          >
            Atualizar alertas
          </ActionButton>
        }
        meta={
          <>
            <MetaPill icon={Clock3}>{periodLabel}</MetaPill>

            <MetaPill
              icon={activeAlerts > 0 ? TriangleAlert : CheckCircle2}
              tone={activeAlerts > 0 ? 'danger' : 'success'}
            >
              {activeAlerts > 0
                ? `${activeAlerts} alerta(s) ativo(s)`
                : 'Sem alertas ativos'}
            </MetaPill>

            <MetaPill icon={ShieldCheck}>
              {canManageThermalAlerts ? 'Acesso operacional' : 'Somente consulta'}
            </MetaPill>
          </>
        }
      />

      {!canManageThermalAlerts ? (
        <InlineNotice
          tone="info"
          icon={Eye}
          title="Modo de consulta"
          description="Reconhecer, resolver, dispensar e remover alertas é restrito à equipe técnica e administrativa."
        />
      ) : null}

      <CollapsibleSection
        title="Resumo dos alertas"
        openDescription="Indicadores dos alertas térmicos do período estão visíveis."
        closedDescription="Indicadores dos alertas estão ocultos para liberar espaço na tela."
        openLabel="Ocultar resumo"
        closedLabel="Mostrar resumo"
        storageKey="cryomap.thermal-alerts.summary-open"
        defaultOpen
        defaultOpenOnMobile={false}
        className="thermal-alerts-summary-disclosure"
        contentClassName="thermal-alerts-summary"
        variant="section"
      >
        <MetricCard
          label="Total"
          value={alerts.length}
          detail="Ocorrências carregadas"
          icon={BellRing}
          tone="info"
        />

        <MetricCard
          label="Ativos"
          value={activeAlerts}
          detail="Abertos ou reconhecidos"
          icon={TriangleAlert}
          tone={activeAlerts > 0 ? 'danger' : 'success'}
        />

        <MetricCard
          label="Abertos"
          value={openAlerts}
          detail="Ainda não reconhecidos"
          icon={CircleAlert}
          tone={openAlerts > 0 ? 'danger' : 'neutral'}
        />

        <MetricCard
          label="Reconhecidos"
          value={acknowledgedAlerts}
          detail="Em acompanhamento"
          icon={Eye}
          tone={acknowledgedAlerts > 0 ? 'warning' : 'neutral'}
        />

        <MetricCard
          label="Críticos"
          value={criticalAlerts}
          detail="Severidade crítica"
          icon={Thermometer}
          tone={criticalAlerts > 0 ? 'danger' : 'success'}
        />

        <MetricCard
          label="Resolvidos"
          value={resolvedAlerts}
          detail="Ocorrências encerradas"
          icon={CheckCircle2}
          tone="success"
        />
      </CollapsibleSection>

      <section className="thermal-alerts-panel">
        <div className="thermal-alerts-panel-header">
          <div>
            <span>Histórico operacional</span>
            <h2>Ocorrências térmicas</h2>
            <p>
              {filteredAlerts.length} alerta(s) exibido(s) de {alerts.length}{' '}
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
          openDescription="Ajuste empresa, sala, sensor, tipo, severidade, status, período e busca."
          closedDescription={
            activeFilters.length > 0
              ? `${activeFilters.length} filtro(s) ativo(s).`
              : 'Nenhum filtro específico selecionado.'
          }
          openLabel="Ocultar filtros"
          closedLabel="Filtros"
          storageKey="cryomap.thermal-alerts.filters-open"
          defaultOpen={false}
          defaultOpenOnMobile={false}
          count={activeFilters.length}
          className="thermal-alerts-filters-disclosure"
          contentClassName="thermal-alerts-filter-area"
          variant="toolbar"
        >
          <div className="thermal-alerts-actions">
            <label className="thermal-alerts-filter-field">
              <span>Empresa</span>
              <select
                value={selectedCompanyId}
                onChange={(event) => {
                  setSelectedCompanyId(event.target.value);
                  setSelectedRoomId('');
                  setSelectedSensorId('');
                }}
              >
                <option value="">Todas as empresas</option>

                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="thermal-alerts-filter-field">
              <span>Sala</span>
              <select
                value={selectedRoomId}
                onChange={(event) => {
                  setSelectedRoomId(event.target.value);
                  setSelectedSensorId('');
                }}
              >
                <option value="">Todas as salas</option>

                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="thermal-alerts-filter-field">
              <span>Sensor</span>
              <select
                value={selectedSensorId}
                onChange={(event) => setSelectedSensorId(event.target.value)}
              >
                <option value="">Todos os sensores</option>

                {sensors.map((sensor) => (
                  <option key={sensor.id} value={sensor.id}>
                    {sensor.code}
                  </option>
                ))}
              </select>
            </label>

            <label className="thermal-alerts-filter-field">
              <span>Tipo</span>
              <select
                value={selectedType}
                onChange={(event) => setSelectedType(event.target.value)}
              >
                <option value="">Todos os tipos</option>

                {alertTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="thermal-alerts-filter-field">
              <span>Severidade</span>
              <select
                value={selectedSeverity}
                onChange={(event) => setSelectedSeverity(event.target.value)}
              >
                <option value="">Todas as severidades</option>

                {alertSeverityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="thermal-alerts-filter-field">
              <span>Status</span>
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
              >
                <option value="">Todos os status</option>

                {alertStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="thermal-alerts-filter-field">
              <span>Início</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>

            <label className="thermal-alerts-filter-field">
              <span>Fim</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>

            <label className="thermal-alerts-filter-field thermal-alerts-search-field">
              <span>
                <Search size={13} strokeWidth={2.1} aria-hidden="true" />
                Busca
              </span>

              <input
                type="search"
                placeholder="Buscar por sala, sensor, mensagem..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <div className="thermal-alerts-action-buttons">
              <ActionButton
                type="button"
                icon={RefreshCw}
                variant="primary"
                onClick={() => void handleRefresh()}
              >
                Aplicar filtros
              </ActionButton>

              <ActionButton
                type="button"
                icon={RotateCcw}
                variant="secondary"
                onClick={() => void handleClearFilters()}
              >
                Limpar filtros
              </ActionButton>
            </div>
          </div>
        </CollapsibleSection>

        <div className="thermal-alerts-filter-status">
          <div>
            <strong>Filtros selecionados</strong>
            <span>
              Período carregado: {periodLabel}. A busca textual filtra os
              alertas já carregados.
            </span>
          </div>

          <div className="thermal-alerts-filter-chips">
            {activeFilters.length > 0 ? (
              activeFilters.map((filter) => (
                <span key={`${filter.label}-${filter.value}`}>
                  {filter.label}: <strong>{filter.value}</strong>
                </span>
              ))
            ) : (
              <span>Sem filtros específicos</span>
            )}
          </div>
        </div>

        {error ? (
          <InlineNotice
            tone="danger"
            icon={TriangleAlert}
            title={error}
            description="Tente recarregar os alertas do período selecionado."
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

        {!error && filteredAlerts.length === 0 ? (
          <EmptyState
            icon={BellRing}
            title="Nenhum alerta térmico encontrado"
            description="Não há alertas para os filtros selecionados no momento."
          />
        ) : null}

        {!error && filteredAlerts.length > 0 ? (
          <>
            <div className="thermal-alerts-mobile-list">
              {filteredAlerts.map((alert) => (
                <ThermalAlertMobileCard
                  key={alert.id}
                  alert={alert}
                  canManage={canManageThermalAlerts}
                  isBusy={actionAlertId === alert.id}
                  onAcknowledge={handleAcknowledge}
                  onResolve={handleResolve}
                  onDismiss={handleDismiss}
                  onRemove={handleRemove}
                />
              ))}
            </div>

            <div className="thermal-alerts-table-wrapper">
              <table className="thermal-alerts-table">
                <thead>
                  <tr>
                    <th>Alerta</th>
                    <th>Local</th>
                    <th>Sensor</th>
                    <th>Severidade / status</th>
                    <th>Medição</th>
                    <th>Mensagem</th>
                    <th>Reconhecimento</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAlerts.map((alert) => (
                    <tr key={alert.id}>
                      <td>
                        <div className="thermal-alert-table-primary">
                          <strong>{formatAlertType(alert.type)}</strong>
                          <span>{formatDateTime(alert.triggeredAt)}</span>
                          <small>{shortId(alert.id)}</small>
                        </div>
                      </td>

                      <td>
                        <div className="thermal-alert-table-location">
                          <strong>{alert.room?.name ?? alert.roomId}</strong>

                          <span>
                            <Building2 size={13} strokeWidth={2} />
                            {alert.company?.name ?? alert.companyId}
                          </span>

                          {alert.room?.thermalStatus ? (
                            <small>
                              Sala: {formatThermalStatus(alert.room.thermalStatus)}
                            </small>
                          ) : null}
                        </div>
                      </td>

                      <td>
                        <div className="thermal-alert-table-sensor">
                          <span>
                            <Radio size={13} strokeWidth={2} />
                            {alert.sensor?.code ?? 'Sem sensor'}
                          </span>

                          {alert.sensor?.lastSeenAt ? (
                            <small>
                              Última comunicação:{' '}
                              {formatDateTime(alert.sensor.lastSeenAt)}
                            </small>
                          ) : null}
                        </div>
                      </td>

                      <td>
                        <div className="thermal-alert-table-badges">
                          <AlertSeverityBadge severity={alert.severity} />
                          <AlertStatusBadge status={alert.status} />
                        </div>
                      </td>

                      <td>
                        <AlertMeasurement alert={alert} />
                      </td>

                      <td>
                        <span className="thermal-alert-message">
                          {alert.message || 'Sem mensagem adicional'}
                        </span>
                      </td>

                      <td>
                        <div className="thermal-alert-table-acknowledgement">
                          <span>
                            <UserRound size={13} strokeWidth={2} />
                            {alert.acknowledgedByUser?.name ?? 'Não reconhecido'}
                          </span>

                          {alert.acknowledgedAt ? (
                            <small>{formatDateTime(alert.acknowledgedAt)}</small>
                          ) : null}
                        </div>
                      </td>

                      <td>
                        {canManageThermalAlerts ? (
                          <AlertRowActions
                            alert={alert}
                            isBusy={actionAlertId === alert.id}
                            onAcknowledge={handleAcknowledge}
                            onResolve={handleResolve}
                            onDismiss={handleDismiss}
                            onRemove={handleRemove}
                          />
                        ) : (
                          <StatusBadge tone="neutral">Somente consulta</StatusBadge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

type ThermalAlertMobileCardProps = {
  alert: ThermalAlert;
  canManage: boolean;
  isBusy: boolean;
  onAcknowledge: (alert: ThermalAlert) => Promise<void>;
  onResolve: (alert: ThermalAlert) => Promise<void>;
  onDismiss: (alert: ThermalAlert) => Promise<void>;
  onRemove: (alert: ThermalAlert) => Promise<void>;
};

function ThermalAlertMobileCard({
  alert,
  canManage,
  isBusy,
  onAcknowledge,
  onResolve,
  onDismiss,
  onRemove,
}: ThermalAlertMobileCardProps) {
  return (
    <article
      className={`thermal-alert-mobile-card ${
        alert.severity === 'CRITICAL' ? 'is-critical' : 'is-warning'
      }`}
    >
      <div className="thermal-alert-mobile-card-header">
        <div className="thermal-alert-mobile-card-title">
          <span>{formatAlertType(alert.type)}</span>
          <strong>{alert.room?.name ?? 'Sala não informada'}</strong>
          <small>{alert.company?.name ?? alert.companyId}</small>
        </div>

        <AlertStatusBadge status={alert.status} />
      </div>

      <div className="thermal-alert-mobile-card-measurement">
        <div>
          <span>Temperatura</span>
          <strong>{formatTemperature(alert.temperature)}</strong>
        </div>

        <div>
          <span>Limites</span>
          <strong>
            {formatTemperature(alert.minTemperature)} até{' '}
            {formatTemperature(alert.maxTemperature)}
          </strong>
        </div>
      </div>

      <div className="thermal-alert-mobile-card-meta">
        <AlertSeverityBadge severity={alert.severity} />

        <span>
          <Radio size={14} strokeWidth={2} />
          {alert.sensor?.code ?? 'Sem sensor'}
        </span>

        <span>
          <Clock3 size={14} strokeWidth={2} />
          {formatDateTime(alert.triggeredAt)}
        </span>

        <span>
          <DoorOpen size={14} strokeWidth={2} />
          {alert.room?.thermalStatus
            ? formatThermalStatus(alert.room.thermalStatus)
            : 'Status da sala indisponível'}
        </span>
      </div>

      {alert.message ? (
        <p className="thermal-alert-mobile-card-message">{alert.message}</p>
      ) : null}

      {alert.acknowledgedByUser?.name || alert.acknowledgedAt ? (
        <div className="thermal-alert-mobile-card-acknowledgement">
          <UserRound size={14} strokeWidth={2} />

          <div>
            <span>Reconhecimento</span>
            <strong>
              {alert.acknowledgedByUser?.name ?? 'Usuário não informado'}
            </strong>
            {alert.acknowledgedAt ? (
              <small>{formatDateTime(alert.acknowledgedAt)}</small>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="thermal-alert-mobile-card-actions">
        {canManage ? (
          <>
            {alert.status === 'OPEN' ? (
              <ActionButton
                type="button"
                icon={Eye}
                variant="secondary"
                disabled={isBusy}
                onClick={() => void onAcknowledge(alert)}
              >
                Reconhecer
              </ActionButton>
            ) : null}

            {['OPEN', 'ACKNOWLEDGED'].includes(alert.status) ? (
              <>
                <ActionButton
                  type="button"
                  icon={Check}
                  variant="primary"
                  disabled={isBusy}
                  onClick={() => void onResolve(alert)}
                >
                  Resolver
                </ActionButton>

                <ActionButton
                  type="button"
                  icon={X}
                  variant="secondary"
                  disabled={isBusy}
                  onClick={() => void onDismiss(alert)}
                >
                  Dispensar
                </ActionButton>
              </>
            ) : null}

            <ActionButton
              type="button"
              icon={Trash2}
              variant="danger"
              disabled={isBusy}
              onClick={() => void onRemove(alert)}
            >
              Remover
            </ActionButton>
          </>
        ) : (
          <StatusBadge tone="neutral">Somente consulta</StatusBadge>
        )}
      </div>
    </article>
  );
}

type AlertRowActionsProps = {
  alert: ThermalAlert;
  isBusy: boolean;
  onAcknowledge: (alert: ThermalAlert) => Promise<void>;
  onResolve: (alert: ThermalAlert) => Promise<void>;
  onDismiss: (alert: ThermalAlert) => Promise<void>;
  onRemove: (alert: ThermalAlert) => Promise<void>;
};

function AlertRowActions({
  alert,
  isBusy,
  onAcknowledge,
  onResolve,
  onDismiss,
  onRemove,
}: AlertRowActionsProps) {
  return (
    <div className="thermal-alert-row-actions">
      {alert.status === 'OPEN' ? (
        <button
          type="button"
          className="thermal-alert-icon-action thermal-alert-icon-action--acknowledge"
          title="Reconhecer alerta"
          aria-label="Reconhecer alerta"
          disabled={isBusy}
          onClick={() => void onAcknowledge(alert)}
        >
          <Eye size={15} strokeWidth={2} />
        </button>
      ) : null}

      {['OPEN', 'ACKNOWLEDGED'].includes(alert.status) ? (
        <>
          <button
            type="button"
            className="thermal-alert-icon-action thermal-alert-icon-action--resolve"
            title="Resolver alerta"
            aria-label="Resolver alerta"
            disabled={isBusy}
            onClick={() => void onResolve(alert)}
          >
            <Check size={15} strokeWidth={2} />
          </button>

          <button
            type="button"
            className="thermal-alert-icon-action thermal-alert-icon-action--dismiss"
            title="Dispensar alerta"
            aria-label="Dispensar alerta"
            disabled={isBusy}
            onClick={() => void onDismiss(alert)}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </>
      ) : null}

      <button
        type="button"
        className="thermal-alert-icon-action thermal-alert-icon-action--remove"
        title="Remover alerta"
        aria-label="Remover alerta"
        disabled={isBusy}
        onClick={() => void onRemove(alert)}
      >
        <Trash2 size={15} strokeWidth={2} />
      </button>
    </div>
  );
}

type AlertMeasurementProps = {
  alert: ThermalAlert;
};

function AlertMeasurement({ alert }: AlertMeasurementProps) {
  const isLow = alert.type === 'LOW_TEMPERATURE';

  return (
    <div
      className={`thermal-alert-measurement ${
        alert.severity === 'CRITICAL' ? 'is-critical' : 'is-warning'
      }`}
    >
      {isLow ? (
        <Snowflake size={16} strokeWidth={2.1} />
      ) : (
        <Thermometer size={16} strokeWidth={2.1} />
      )}

      <div>
        <strong>{formatTemperature(alert.temperature)}</strong>
        <small>
          {formatTemperature(alert.minTemperature)} até{' '}
          {formatTemperature(alert.maxTemperature)}
        </small>
      </div>
    </div>
  );
}

type AlertSeverityBadgeProps = {
  severity: string;
};

function AlertSeverityBadge({ severity }: AlertSeverityBadgeProps) {
  return (
    <StatusBadge tone={getSeverityTone(severity)}>
      {formatSeverity(severity)}
    </StatusBadge>
  );
}

type AlertStatusBadgeProps = {
  status: string;
};

function AlertStatusBadge({ status }: AlertStatusBadgeProps) {
  return (
    <StatusBadge tone={getStatusTone(status)}>
      {formatStatus(status)}
    </StatusBadge>
  );
}

function getSeverityTone(severity: string): UiTone {
  return severity === 'CRITICAL' ? 'danger' : 'warning';
}

function getStatusTone(status: string): UiTone {
  if (status === 'OPEN') {
    return 'danger';
  }

  if (status === 'ACKNOWLEDGED') {
    return 'warning';
  }

  if (status === 'RESOLVED') {
    return 'success';
  }

  return 'neutral';
}

function formatAlertType(value: string) {
  const labels: Record<string, string> = {
    HIGH_TEMPERATURE: 'Temperatura alta',
    LOW_TEMPERATURE: 'Temperatura baixa',
  };

  return labels[value] ?? value;
}

function formatSeverity(value: string) {
  const labels: Record<string, string> = {
    WARNING: 'Atenção',
    CRITICAL: 'Crítico',
  };

  return labels[value] ?? value;
}

function formatStatus(value: string) {
  const labels: Record<string, string> = {
    OPEN: 'Aberto',
    ACKNOWLEDGED: 'Reconhecido',
    RESOLVED: 'Resolvido',
    DISMISSED: 'Dispensado',
  };

  return labels[value] ?? value;
}

function formatThermalStatus(value: string) {
  const labels: Record<string, string> = {
    NORMAL: 'Normal',
    WARNING: 'Atenção',
    ALERT: 'Alerta',
    CRITICAL: 'Crítico',
    OFFLINE: 'Offline',
  };

  return labels[value] ?? value;
}

function defaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 30);

  return toDateInputValue(date);
}

function defaultEndDate() {
  return toDateInputValue(new Date());
}

function toDateInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 10);
}

function optionalStartIsoDate(value: string) {
  if (!value) {
    return undefined;
  }

  return new Date(`${value}T00:00:00`).toISOString();
}

function optionalEndIsoDate(value: string) {
  if (!value) {
    return undefined;
  }

  return new Date(`${value}T23:59:59`).toISOString();
}

function shortId(value: string) {
  return value.slice(0, 8).toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
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

function formatTemperature(value?: number | null) {
  if (value === null || value === undefined) {
    return '-';
  }

  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)} °C`;
}

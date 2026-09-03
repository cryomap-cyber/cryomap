import { useEffect, useMemo, useState } from 'react';

import { EmptyState } from '../../components/Feedback/EmptyState';
import { LoadingState } from '../../components/Feedback/LoadingState';
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

    if (
      startDate !== defaultStartDate() ||
      endDate !== defaultEndDate()
    ) {
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
        title="Carregando alertas térmicos..."
        description="Buscando ocorrências de temperatura fora dos limites."
      />
    );
  }

  return (
    <div className="thermal-alerts-page">
      <header className="thermal-alerts-header">
        <div>
          <span>Monitoramento</span>
          <h1>Alertas térmicos</h1>
          <p>
            Acompanhe ocorrências de temperatura fora dos limites das salas,
            reconheça alertas e marque resoluções operacionais.
          </p>

          {!canManageThermalAlerts ? (
            <p>
              Seu acesso é somente consulta. Ações de alerta ficam restritas à
              equipe técnica e administrativa.
            </p>
          ) : null}
        </div>

        <button type="button" onClick={() => void handleRefresh()}>
          Atualizar alertas
        </button>
      </header>

      <section className="thermal-alerts-summary">
        <SummaryCard title="Total" value={alerts.length} />
        <SummaryCard
          title="Ativos"
          value={activeAlerts}
          danger={activeAlerts > 0}
        />
        <SummaryCard
          title="Abertos"
          value={openAlerts}
          danger={openAlerts > 0}
        />
        <SummaryCard title="Reconhecidos" value={acknowledgedAlerts} />
        <SummaryCard
          title="Críticos"
          value={criticalAlerts}
          danger={criticalAlerts > 0}
        />
        <SummaryCard title="Resolvidos" value={resolvedAlerts} />
      </section>

      <section className="thermal-alerts-panel">
        <div className="thermal-alerts-panel-header">
          <div>
            <h2>Histórico de alertas</h2>
            <p>
              {filteredAlerts.length} alerta(s) exibido(s) de {alerts.length}{' '}
              carregado(s)
            </p>
          </div>

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
              <span>Busca</span>
              <input
                type="search"
                placeholder="Buscar por sala, sensor, mensagem..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <div className="thermal-alerts-action-buttons">
              <button type="button" onClick={() => void handleRefresh()}>
                Aplicar filtros
              </button>

              <button
                type="button"
                className="thermal-alerts-secondary-action"
                onClick={() => void handleClearFilters()}
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </div>

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
          <div className="thermal-alerts-error">
            <strong>{error}</strong>

            <button type="button" onClick={() => void handleRefresh()}>
              Tentar novamente
            </button>
          </div>
        ) : null}

        {!error && filteredAlerts.length === 0 ? (
          <EmptyState
            title="Nenhum alerta térmico encontrado."
            description="Não há alertas para os filtros selecionados no momento."
          />
        ) : null}

        {!error && filteredAlerts.length > 0 ? (
          <div className="thermal-alerts-table-wrapper">
            <table className="thermal-alerts-table">
              <thead>
                <tr>
                  <th>Disparado em</th>
                  <th>Empresa</th>
                  <th>Sala</th>
                  <th>Sensor</th>
                  <th>Tipo</th>
                  <th>Severidade</th>
                  <th>Status</th>
                  <th>Temperatura</th>
                  <th>Limites</th>
                  <th>Mensagem</th>
                  <th>Reconhecido por</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {filteredAlerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      <strong>{formatDateTime(alert.triggeredAt)}</strong>
                      <small>{shortId(alert.id)}</small>
                    </td>

                    <td>{alert.company?.name ?? alert.companyId}</td>

                    <td>
                      <strong>{alert.room?.name ?? alert.roomId}</strong>

                      {alert.room?.thermalStatus ? (
                        <small>
                          {formatThermalStatus(alert.room.thermalStatus)}
                        </small>
                      ) : null}
                    </td>

                    <td>
                      <span>{alert.sensor?.code ?? '-'}</span>

                      {alert.sensor?.lastSeenAt ? (
                        <small>
                          Última comunicação:{' '}
                          {formatDateTime(alert.sensor.lastSeenAt)}
                        </small>
                      ) : null}
                    </td>

                    <td>{formatAlertType(alert.type)}</td>

                    <td>
                      <SeverityBadge severity={alert.severity as ThermalAlertSeverity} />
                    </td>

                    <td>
                      <StatusBadge status={alert.status as ThermalAlertStatus} />
                    </td>

                    <td>
                      <span className="thermal-alert-temperature">
                        {formatTemperature(alert.temperature)}
                      </span>
                    </td>

                    <td>
                      <span>
                        Mín: {formatTemperature(alert.minTemperature)}
                      </span>
                      <small>
                        Máx: {formatTemperature(alert.maxTemperature)}
                      </small>
                    </td>

                    <td>{alert.message || '-'}</td>

                    <td>
                      <span>{alert.acknowledgedByUser?.name ?? '-'}</span>

                      {alert.acknowledgedAt ? (
                        <small>{formatDateTime(alert.acknowledgedAt)}</small>
                      ) : null}
                    </td>

                    <td>
                      {canManageThermalAlerts ? (
                        <div className="thermal-alert-row-actions">
                          {alert.status === 'OPEN' ? (
                            <button
                              type="button"
                              className="thermal-alert-row-action acknowledge"
                              disabled={actionAlertId === alert.id}
                              onClick={() => void handleAcknowledge(alert)}
                            >
                              Reconhecer
                            </button>
                          ) : null}

                          {['OPEN', 'ACKNOWLEDGED'].includes(alert.status) ? (
                            <>
                              <button
                                type="button"
                                className="thermal-alert-row-action resolve"
                                disabled={actionAlertId === alert.id}
                                onClick={() => void handleResolve(alert)}
                              >
                                Resolver
                              </button>

                              <button
                                type="button"
                                className="thermal-alert-row-action dismiss"
                                disabled={actionAlertId === alert.id}
                                onClick={() => void handleDismiss(alert)}
                              >
                                Dispensar
                              </button>
                            </>
                          ) : null}

                          <button
                            type="button"
                            className="thermal-alert-row-action remove"
                            disabled={actionAlertId === alert.id}
                            onClick={() => void handleRemove(alert)}
                          >
                            Remover
                          </button>
                        </div>
                      ) : (
                        <span className="thermal-alert-readonly-badge">
                          Somente consulta
                        </span>
                      )}
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
      className={
        danger
          ? 'thermal-alerts-summary-card danger'
          : 'thermal-alerts-summary-card'
      }
    >
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}

type SeverityBadgeProps = {
  severity: ThermalAlertSeverity;
};

function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span className={`thermal-alert-severity ${severity.toLowerCase()}`}>
      {formatSeverity(severity)}
    </span>
  );
}

type StatusBadgeProps = {
  status: ThermalAlertStatus;
};

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`thermal-alert-status ${status.toLowerCase()}`}>
      {formatStatus(status)}
    </span>
  );
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

  return new Date(value).toLocaleString('pt-BR');
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

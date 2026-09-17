import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Building2,
  Clock3,
  Droplets,
  Gauge,
  MapPin,
  Pencil,
  Plus,
  Power,
  Radio,
  RefreshCw,
  Search,
  Thermometer,
  TriangleAlert,
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
import { getCompanies } from '../../services/companies';
import { getRooms } from '../../services/rooms';
import {
  createSensor,
  getSensors,
  inactivateSensor,
  updateSensor,
  type CreateSensorPayload,
} from '../../services/sensors';
import type { Company } from '../../types/company';
import type { Room } from '../../types/room';
import type { Sensor, SensorStatus, SensorType } from '../../types/sensor';
import './Sensors.css';

type SensorFormData = {
  companyId: string;
  roomId: string;
  code: string;
  type: SensorType;
  location: string;
  status: SensorStatus;
};

const emptyFormData: SensorFormData = {
  companyId: '',
  roomId: '',
  code: '',
  type: 'TEMPERATURE_HUMIDITY',
  location: '',
  status: 'ACTIVE',
};

export function Sensors() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);
  const [formData, setFormData] = useState<SensorFormData>(emptyFormData);

  async function handleRefresh() {
    setError('');
    setIsLoading(true);

    try {
      const [companiesData, roomsData, sensorsData] = await Promise.all([
        getCompanies(),
        getRooms(selectedCompanyId || undefined),
        getSensors({
          companyId: selectedCompanyId || undefined,
          roomId: selectedRoomId || undefined,
        }),
      ]);

      setCompanies(companiesData);
      setRooms(roomsData);
      setSensors(sensorsData);
    } catch {
      setError('Não foi possível carregar os sensores.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    Promise.all([getCompanies(), getRooms(), getSensors()])
      .then(([companiesData, roomsData, sensorsData]) => {
        if (!isMounted) {
          return;
        }

        setCompanies(companiesData);
        setRooms(roomsData);
        setSensors(sensorsData);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível carregar os sensores.');
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

    getRooms(selectedCompanyId || undefined)
      .then((roomsData) => {
        if (!isMounted) {
          return;
        }

        setRooms(roomsData);

        if (
          selectedRoomId &&
          !roomsData.some((room) => room.id === selectedRoomId)
        ) {
          setSelectedRoomId('');
        }
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível carregar as salas do filtro.');
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCompanyId, selectedRoomId]);

  useEffect(() => {
    let isMounted = true;

    getSensors({
      companyId: selectedCompanyId || undefined,
      roomId: selectedRoomId || undefined,
    })
      .then((sensorsData) => {
        if (!isMounted) {
          return;
        }

        setError('');
        setSensors(sensorsData);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível filtrar os sensores.');
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCompanyId, selectedRoomId]);

  const filteredSensors = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return sensors;
    }

    return sensors.filter((sensor) => {
      return [
        sensor.code,
        sensor.type,
        sensor.location ?? '',
        sensor.company?.name ?? '',
        sensor.room?.name ?? '',
        sensor.status,
        String(sensor.lastTemperature ?? ''),
        String(sensor.lastHumidity ?? ''),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [sensors, search]);

  const formRooms = useMemo(() => {
    if (!formData.companyId) {
      return rooms;
    }

    return rooms.filter((room) => room.companyId === formData.companyId);
  }, [rooms, formData.companyId]);

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (selectedCompanyId) {
      count += 1;
    }

    if (selectedRoomId) {
      count += 1;
    }

    if (search.trim()) {
      count += 1;
    }

    return count;
  }, [search, selectedCompanyId, selectedRoomId]);

  const activeSensors = sensors.filter(
    (sensor) => sensor.status === 'ACTIVE',
  ).length;

  const offlineSensors = sensors.filter(
    (sensor) => sensor.status === 'OFFLINE',
  ).length;

  const maintenanceSensors = sensors.filter(
    (sensor) => sensor.status === 'MAINTENANCE',
  ).length;

  const inactiveSensors = sensors.filter(
    (sensor) => sensor.status === 'INACTIVE',
  ).length;

  const sensorsWithTelemetry = sensors.filter(
    (sensor) =>
      sensor.lastTemperature !== null ||
      sensor.lastHumidity !== null ||
      Boolean(sensor.lastSeenAt),
  ).length;

  function openCreateForm() {
    setEditingSensor(null);
    setFormData({
      ...emptyFormData,
      companyId: selectedCompanyId,
      roomId: selectedRoomId,
    });
    setFormError('');
    setIsFormOpen(true);
  }

  function openEditForm(sensor: Sensor) {
    setEditingSensor(sensor);
    setFormData({
      companyId: sensor.companyId,
      roomId: sensor.roomId,
      code: sensor.code,
      type: sensor.type,
      location: sensor.location ?? '',
      status: sensor.status,
    });
    setFormError('');
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setEditingSensor(null);
    setFormData(emptyFormData);
    setFormError('');
  }

  function updateFormField(field: keyof SensorFormData, value: string) {
    setFormData((current) => {
      const nextFormData = {
        ...current,
        [field]: value,
      } as SensorFormData;

      if (field === 'companyId') {
        nextFormData.roomId = '';
      }

      return nextFormData;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError('');

    if (!formData.companyId) {
      setFormError('Selecione a empresa do sensor.');
      return;
    }

    if (!formData.roomId) {
      setFormError('Selecione a sala do sensor.');
      return;
    }

    if (!formData.code.trim()) {
      setFormError('Informe o código do sensor.');
      return;
    }

    const payload: CreateSensorPayload = {
      companyId: formData.companyId,
      roomId: formData.roomId,
      code: formData.code.trim().toUpperCase(),
      type: formData.type,
      location: optionalValue(formData.location),
    };

    setIsSaving(true);

    try {
      if (editingSensor) {
        await updateSensor(editingSensor.id, {
          ...payload,
          status: formData.status,
        });
      } else {
        await createSensor(payload);
      }

      closeForm();
      await handleRefresh();
    } catch (requestError) {
      setFormError(getRequestErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleInactivate(sensor: Sensor) {
    const confirmed = window.confirm(
      `Deseja realmente inativar o sensor "${sensor.code}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await inactivateSensor(sensor.id);
      await handleRefresh();
    } catch {
      setError('Não foi possível inativar o sensor.');
    }
  }

  if (isLoading) {
    return (
      <LoadingState
        title="Carregando sensores"
        description="Buscando sensores vinculados às salas."
      />
    );
  }

  return (
    <div className="sensors-page">
      <PageHeader
        eyebrow="Cadastros"
        title="Sensores"
        description="Gerencie os sensores ambientais instalados nas salas e acompanhe a última telemetria recebida. Sensores não são vinculados diretamente aos equipamentos."
        icon={Radio}
        actions={
          <ActionButton
            type="button"
            icon={Plus}
            variant="primary"
            onClick={openCreateForm}
          >
            Novo sensor
          </ActionButton>
        }
        meta={
          <>
            <MetaPill icon={Radio}>{sensors.length} sensor(es)</MetaPill>

            <MetaPill
              icon={offlineSensors > 0 ? TriangleAlert : Activity}
              tone={offlineSensors > 0 ? 'warning' : 'success'}
            >
              {offlineSensors > 0
                ? `${offlineSensors} offline`
                : 'Sem sensores offline'}
            </MetaPill>

            <MetaPill icon={Gauge}>
              {sensorsWithTelemetry} com telemetria
            </MetaPill>
          </>
        }
      />

      <CollapsibleSection
        title="Resumo dos sensores"
        openDescription="Indicadores gerais dos sensores estão visíveis."
        closedDescription="Indicadores gerais estão ocultos para liberar espaço na tela."
        openLabel="Ocultar resumo"
        closedLabel="Mostrar resumo"
        storageKey="cryomap.sensors.summary-open"
        defaultOpen
        defaultOpenOnMobile={false}
        className="sensors-summary-disclosure"
        contentClassName="sensors-summary"
        variant="section"
      >
        <MetricCard
          label="Total"
          value={sensors.length}
          detail="Sensores carregados"
          icon={Radio}
          tone="info"
        />

        <MetricCard
          label="Ativos"
          value={activeSensors}
          detail="Disponíveis para operação"
          icon={Activity}
          tone="success"
        />

        <MetricCard
          label="Offline"
          value={offlineSensors}
          detail="Sem operação disponível"
          icon={Power}
          tone={offlineSensors > 0 ? 'danger' : 'success'}
        />

        <MetricCard
          label="Manutenção"
          value={maintenanceSensors}
          detail="Em intervenção"
          icon={Wrench}
          tone={maintenanceSensors > 0 ? 'warning' : 'neutral'}
        />

        <MetricCard
          label="Inativos"
          value={inactiveSensors}
          detail="Fora do cadastro ativo"
          icon={Power}
          tone="neutral"
        />

        <MetricCard
          label="Com telemetria"
          value={sensorsWithTelemetry}
          detail="Com leitura ou comunicação registrada"
          icon={Gauge}
          tone="info"
        />
      </CollapsibleSection>

      {isFormOpen ? (
        <section className="sensor-form-panel">
          <div className="sensor-form-header">
            <div>
              <span>Sensor</span>
              <h2>{editingSensor ? 'Editar sensor' : 'Novo sensor'}</h2>
              <p>
                Vincule o sensor à empresa e à sala correta e configure seu tipo
                de medição.
              </p>
            </div>

            <ActionButton type="button" variant="ghost" onClick={closeForm}>
              Fechar
            </ActionButton>
          </div>

          <InlineNotice
            tone="info"
            icon={MapPin}
            title="Vínculo ambiental"
            description="Todo sensor pertence a uma sala. Equipamentos não recebem vínculo direto com sensores."
          />

          <form className="sensor-form" onSubmit={handleSubmit}>
            <label>
              Empresa *
              <select
                value={formData.companyId}
                onChange={(event) =>
                  updateFormField('companyId', event.target.value)
                }
              >
                <option value="">Selecione uma empresa</option>

                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Sala *
              <select
                value={formData.roomId}
                onChange={(event) =>
                  updateFormField('roomId', event.target.value)
                }
              >
                <option value="">Selecione uma sala</option>

                {formRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Código *
              <input
                value={formData.code}
                onChange={(event) =>
                  updateFormField('code', event.target.value)
                }
                placeholder="Ex: SENSOR-001"
              />
            </label>

            <label>
              Tipo
              <select
                value={formData.type}
                onChange={(event) =>
                  updateFormField('type', event.target.value as SensorType)
                }
              >
                <option value="TEMPERATURE_HUMIDITY">
                  Temperatura e umidade
                </option>
                <option value="TEMPERATURE">Somente temperatura</option>
                <option value="HUMIDITY">Somente umidade</option>
              </select>
            </label>

            <label className="sensor-form-wide">
              Localização
              <input
                value={formData.location}
                onChange={(event) =>
                  updateFormField('location', event.target.value)
                }
                placeholder="Ex: Câmara Fria 01 - parede esquerda"
              />
            </label>

            {editingSensor ? (
              <label>
                Status
                <select
                  value={formData.status}
                  onChange={(event) =>
                    updateFormField(
                      'status',
                      event.target.value as SensorStatus,
                    )
                  }
                >
                  <option value="ACTIVE">Ativo</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="MAINTENANCE">Manutenção</option>
                  <option value="INACTIVE">Inativo</option>
                </select>
              </label>
            ) : null}

            {formError ? (
              <strong className="sensor-form-error">{formError}</strong>
            ) : null}

            <div className="sensor-form-actions">
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
                  : editingSensor
                    ? 'Salvar alterações'
                    : 'Cadastrar sensor'}
              </ActionButton>
            </div>
          </form>
        </section>
      ) : null}

      <section className="sensors-panel">
        <div className="sensors-panel-header">
          <div>
            <span>Monitoramento ambiental</span>
            <h2>Lista de sensores</h2>
            <p>
              {filteredSensors.length} registro(s) exibido(s) de {sensors.length}{' '}
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
          openDescription="Refine a lista por empresa, sala ou busca textual."
          closedDescription={
            activeFilterCount > 0
              ? `${activeFilterCount} filtro(s) ativo(s).`
              : 'Nenhum filtro específico selecionado.'
          }
          openLabel="Ocultar filtros"
          closedLabel="Filtros"
          storageKey="cryomap.sensors.filters-open"
          defaultOpen={false}
          defaultOpenOnMobile={false}
          count={activeFilterCount}
          className="sensors-filters-disclosure"
          contentClassName="sensors-filter-area"
          variant="toolbar"
        >
          <div className="sensors-actions">
            <label className="sensors-filter-field">
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

            <label className="sensors-filter-field">
              <span>Sala</span>
              <select
                value={selectedRoomId}
                onChange={(event) => setSelectedRoomId(event.target.value)}
              >
                <option value="">Todas as salas</option>

                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="sensors-filter-field sensors-search-field">
              <span>
                <Search size={13} strokeWidth={2.1} aria-hidden="true" />
                Busca
              </span>
              <input
                type="search"
                placeholder="Buscar por código, localização, sala..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
        </CollapsibleSection>

        {error ? (
          <InlineNotice
            tone="danger"
            icon={TriangleAlert}
            title={error}
            description="Tente atualizar os sensores ou reveja os filtros selecionados."
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

        {!error && filteredSensors.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="Nenhum sensor encontrado"
            description="Cadastre um sensor ou ajuste os filtros para visualizar resultados."
          />
        ) : null}

        {!error && filteredSensors.length > 0 ? (
          <>
            <div className="sensors-mobile-list">
              {filteredSensors.map((sensor) => (
                <SensorMobileCard
                  key={sensor.id}
                  sensor={sensor}
                  onEdit={openEditForm}
                  onInactivate={handleInactivate}
                />
              ))}
            </div>

            <div className="sensors-table-wrapper">
              <table className="sensors-table">
                <thead>
                  <tr>
                    <th>Sensor</th>
                    <th>Local</th>
                    <th>Tipo</th>
                    <th>Telemetria</th>
                    <th>Comunicação</th>
                    <th>Status</th>
                    <th>Cadastro</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSensors.map((sensor) => (
                    <tr key={sensor.id}>
                      <td>
                        <div className="sensor-table-primary">
                          <strong>{sensor.code}</strong>
                          <span>{sensor.location || 'Local não informado'}</span>
                        </div>
                      </td>

                      <td>
                        <div className="sensor-table-location">
                          <span>
                            <Building2 size={13} strokeWidth={2} />
                            {sensor.company?.name ?? sensor.companyId}
                          </span>

                          <span>
                            <MapPin size={13} strokeWidth={2} />
                            {sensor.room?.name ?? sensor.roomId}
                          </span>
                        </div>
                      </td>

                      <td>
                        <SensorTypeBadge type={sensor.type} />
                      </td>

                      <td>
                        <SensorTelemetry sensor={sensor} />
                      </td>

                      <td>
                        <div className="sensor-table-communication">
                          <Clock3 size={13} strokeWidth={2} />

                          <div>
                            <strong>{formatDateTime(sensor.lastSeenAt)}</strong>
                            <small>Última comunicação</small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <SensorStatusBadge status={sensor.status} />
                      </td>

                      <td>
                        <div className="sensor-table-created">
                          <span>{formatDate(sensor.createdAt)}</span>
                        </div>
                      </td>

                      <td>
                        <div className="sensor-row-actions">
                          <button
                            type="button"
                            className="sensor-icon-action"
                            title="Editar sensor"
                            aria-label={`Editar sensor ${sensor.code}`}
                            onClick={() => openEditForm(sensor)}
                          >
                            <Pencil size={15} strokeWidth={2} />
                          </button>

                          <button
                            type="button"
                            className="sensor-icon-action sensor-icon-action--danger"
                            title="Inativar sensor"
                            aria-label={`Inativar sensor ${sensor.code}`}
                            disabled={sensor.status === 'INACTIVE'}
                            onClick={() => void handleInactivate(sensor)}
                          >
                            <Power size={15} strokeWidth={2} />
                          </button>
                        </div>
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

type SensorMobileCardProps = {
  sensor: Sensor;
  onEdit: (sensor: Sensor) => void;
  onInactivate: (sensor: Sensor) => Promise<void>;
};

function SensorMobileCard({
  sensor,
  onEdit,
  onInactivate,
}: SensorMobileCardProps) {
  return (
    <article
      className={`sensor-mobile-card sensor-mobile-card--${sensor.status.toLowerCase()}`}
    >
      <div className="sensor-mobile-card-header">
        <div>
          <span>{formatSensorType(sensor.type)}</span>
          <strong>{sensor.code}</strong>
          <small>{sensor.location || 'Local não informado'}</small>
        </div>

        <SensorStatusBadge status={sensor.status} />
      </div>

      <div className="sensor-mobile-card-telemetry">
        <div>
          <span>Temperatura</span>
          <strong>{formatTemperature(sensor.lastTemperature)}</strong>
        </div>

        <div>
          <span>Umidade</span>
          <strong>{formatHumidity(sensor.lastHumidity)}</strong>
        </div>
      </div>

      <div className="sensor-mobile-card-meta">
        <div>
          <span>Empresa</span>
          <strong>{sensor.company?.name ?? sensor.companyId}</strong>
        </div>

        <div>
          <span>Sala</span>
          <strong>{sensor.room?.name ?? sensor.roomId}</strong>
        </div>

        <div>
          <span>Última comunicação</span>
          <strong>{formatDateTime(sensor.lastSeenAt)}</strong>
        </div>

        <div>
          <span>Criado em</span>
          <strong>{formatDate(sensor.createdAt)}</strong>
        </div>
      </div>

      <div className="sensor-mobile-card-actions">
        <ActionButton
          type="button"
          icon={Pencil}
          variant="secondary"
          onClick={() => onEdit(sensor)}
        >
          Editar
        </ActionButton>

        <ActionButton
          type="button"
          icon={Power}
          variant="danger"
          disabled={sensor.status === 'INACTIVE'}
          onClick={() => void onInactivate(sensor)}
        >
          Inativar
        </ActionButton>
      </div>
    </article>
  );
}

type SensorTelemetryProps = {
  sensor: Sensor;
};

function SensorTelemetry({ sensor }: SensorTelemetryProps) {
  return (
    <div className="sensor-telemetry">
      <div>
        <Thermometer size={14} strokeWidth={2.1} />
        <span>{formatTemperature(sensor.lastTemperature)}</span>
      </div>

      <div>
        <Droplets size={14} strokeWidth={2.1} />
        <span>{formatHumidity(sensor.lastHumidity)}</span>
      </div>
    </div>
  );
}

type SensorStatusBadgeProps = {
  status: SensorStatus;
};

function SensorStatusBadge({ status }: SensorStatusBadgeProps) {
  const labels: Record<SensorStatus, string> = {
    ACTIVE: 'Ativo',
    OFFLINE: 'Offline',
    MAINTENANCE: 'Manutenção',
    INACTIVE: 'Inativo',
  };

  return (
    <StatusBadge tone={getSensorStatusTone(status)}>
      {labels[status]}
    </StatusBadge>
  );
}

function getSensorStatusTone(status: SensorStatus): UiTone {
  if (status === 'ACTIVE') {
    return 'success';
  }

  if (status === 'OFFLINE') {
    return 'danger';
  }

  if (status === 'MAINTENANCE') {
    return 'warning';
  }

  return 'neutral';
}

type SensorTypeBadgeProps = {
  type: SensorType;
};

function SensorTypeBadge({ type }: SensorTypeBadgeProps) {
  return (
    <StatusBadge tone="info">
      {formatSensorType(type)}
    </StatusBadge>
  );
}

function formatSensorType(value: SensorType) {
  const labels: Record<SensorType, string> = {
    TEMPERATURE: 'Temperatura',
    HUMIDITY: 'Umidade',
    TEMPERATURE_HUMIDITY: 'Temperatura e umidade',
  };

  return labels[value] ?? value;
}

function formatTemperature(value?: number | null) {
  if (value === null || value === undefined) {
    return '-';
  }

  return `${Number(value).toFixed(1)} °C`;
}

function formatHumidity(value?: number | null) {
  if (value === null || value === undefined) {
    return '-';
  }

  return `${Number(value).toFixed(1)} %`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('pt-BR');
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

function optionalValue(value: string) {
  const normalized = value.trim();

  return normalized || undefined;
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

    if (
      typeof data === 'object' &&
      data !== null &&
      'message' in data
    ) {
      const message = data.message;

      if (typeof message === 'string') {
        return message;
      }

      if (Array.isArray(message)) {
        return message.join(' | ');
      }
    }
  }

  return 'Não foi possível salvar o sensor.';
}

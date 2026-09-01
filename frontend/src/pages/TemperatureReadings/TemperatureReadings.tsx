import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { getCompanies } from '../../services/companies';
import { getRooms } from '../../services/rooms';
import { getSensors } from '../../services/sensors';
import {
  createTemperatureReading,
  getTemperatureReadings,
  type CreateTemperatureReadingPayload,
} from '../../services/temperature-readings';
import type { Company } from '../../types/company';
import type { Room } from '../../types/room';
import type { Sensor } from '../../types/sensor';
import type { TemperatureReading } from '../../types/temperature-reading';
import './TemperatureReadings.css';
import { LoadingState } from '../../components/Feedback/LoadingState';
import { EmptyState } from '../../components/Feedback/EmptyState';

type TemperatureReadingFormData = {
  companyId: string;
  roomId: string;
  sensorId: string;
  temperature: string;
  humidity: string;
  readAt: string;
  source: string;
};

const emptyFormData: TemperatureReadingFormData = {
  companyId: '',
  roomId: '',
  sensorId: '',
  temperature: '',
  humidity: '',
  readAt: '',
  source: 'MANUAL',
};

export function TemperatureReadings() {
  const [temperatureReadings, setTemperatureReadings] = useState<
    TemperatureReading[]
  >([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [formRooms, setFormRooms] = useState<Room[]>([]);
  const [formSensors, setFormSensors] = useState<Sensor[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedSensorId, setSelectedSensorId] = useState('');
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(defaultEndDate());
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] =
    useState<TemperatureReadingFormData>(emptyFormData);

  async function handleRefresh() {
    setError('');
    setIsLoading(true);

    try {
      const [companiesData, roomsData, sensorsData, readingsData] =
        await Promise.all([
          getCompanies(),
          getRooms(selectedCompanyId || undefined),
          getSensors({
            companyId: selectedCompanyId || undefined,
            roomId: selectedRoomId || undefined,
          }),
          getTemperatureReadings({
            companyId: selectedCompanyId || undefined,
            roomId: selectedRoomId || undefined,
            sensorId: selectedSensorId || undefined,
            startDate: optionalStartIsoDate(startDate),
            endDate: optionalEndIsoDate(endDate),
          }),
        ]);

      setCompanies(companiesData);
      setRooms(roomsData);
      setSensors(sensorsData);
      setTemperatureReadings(readingsData);
    } catch {
      setError('Não foi possível carregar as leituras de temperatura.');
    } finally {
      setIsLoading(false);
    }
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
      getTemperatureReadings(initialParams),
    ])
      .then(([companiesData, roomsData, sensorsData, readingsData]) => {
        if (!isMounted) {
          return;
        }

        setCompanies(companiesData);
        setRooms(roomsData);
        setSensors(sensorsData);
        setFormRooms(roomsData);
        setFormSensors(sensorsData);
        setTemperatureReadings(readingsData);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível carregar as leituras de temperatura.');
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

        setError('Não foi possível carregar os filtros de leitura.');
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCompanyId, selectedRoomId, selectedSensorId]);

  useEffect(() => {
    if (!isFormOpen) {
      return;
    }

    let isMounted = true;

    Promise.all([
      getRooms(formData.companyId || undefined),
      getSensors({
        companyId: formData.companyId || undefined,
        roomId: formData.roomId || undefined,
      }),
    ])
      .then(([roomsData, sensorsData]) => {
        if (!isMounted) {
          return;
        }

        setFormRooms(roomsData);
        setFormSensors(sensorsData);

        if (
          formData.roomId &&
          !roomsData.some((room) => room.id === formData.roomId)
        ) {
          updateFormField('roomId', '');
        }

        if (
          formData.sensorId &&
          !sensorsData.some((sensor) => sensor.id === formData.sensorId)
        ) {
          updateFormField('sensorId', '');
        }
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setFormError('Não foi possível carregar salas e sensores do formulário.');
      });

    return () => {
      isMounted = false;
    };
  }, [isFormOpen, formData.companyId, formData.roomId, formData.sensorId]);

  const filteredReadings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return temperatureReadings;
    }

    return temperatureReadings.filter((reading) => {
      return [
        reading.company?.name ?? '',
        reading.room?.name ?? '',
        reading.sensor?.code ?? '',
        reading.source ?? '',
        reading.notes ?? '',
        String(reading.temperature),
        String(reading.humidity ?? ''),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [temperatureReadings, search]);

  const averageTemperature = getAverage(
    temperatureReadings.map((reading) => reading.temperature),
  );

  const minimumTemperature = getMinimum(
    temperatureReadings.map((reading) => reading.temperature),
  );

  const maximumTemperature = getMaximum(
    temperatureReadings.map((reading) => reading.temperature),
  );

  const readingsWithHumidity = temperatureReadings.filter(
    (reading) => reading.humidity !== null && reading.humidity !== undefined,
  );

  const averageHumidity = getAverage(
    readingsWithHumidity.map((reading) => reading.humidity ?? 0),
  );

  function openCreateForm() {
    setFormData({
      ...emptyFormData,
      companyId: selectedCompanyId,
      roomId: selectedRoomId,
      sensorId: selectedSensorId,
      readAt: currentDateTimeInput(),
    });
    setFormError('');
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setFormData(emptyFormData);
    setFormError('');
  }

  function updateFormField(
    field: keyof TemperatureReadingFormData,
    value: string,
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError('');

    if (!formData.companyId) {
      setFormError('Selecione a empresa.');
      return;
    }

    if (!formData.roomId) {
      setFormError('Selecione a sala.');
      return;
    }

    const temperature = Number(formData.temperature.replace(',', '.'));

    if (Number.isNaN(temperature)) {
      setFormError('Informe uma temperatura válida.');
      return;
    }

    const humidity =
      formData.humidity.trim() === ''
        ? undefined
        : Number(formData.humidity.replace(',', '.'));

    if (humidity !== undefined && Number.isNaN(humidity)) {
      setFormError('Informe uma umidade válida.');
      return;
    }

    if (humidity !== undefined && (humidity < 0 || humidity > 100)) {
      setFormError('A umidade deve estar entre 0% e 100%.');
      return;
    }

    setIsSaving(true);

    try {
      const payload: CreateTemperatureReadingPayload = {
  companyId: formData.companyId,
  roomId: formData.roomId,
  sensorId: optionalValue(formData.sensorId),
  temperature,
  humidity,
  readAt: optionalIsoDateTime(formData.readAt),
  source: optionalValue(formData.source),
        };

      await createTemperatureReading(payload);

      closeForm();
      await handleRefresh();
    } catch (requestError) {
      setFormError(getRequestErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
  <LoadingState
    title="Carregando leituras de temperatura..."
    description="Buscando histórico térmico das salas."
  />
);
  }

  return (
    <div className="temperature-readings-page">
      <header className="temperature-readings-header">
        <div>
          <span>Monitoramento</span>
          <h1>Leituras de temperatura</h1>
          <p>
            Consulte o histórico de temperatura e umidade das salas monitoradas
            por sensores ou registros manuais.
          </p>
        </div>

        <button type="button" onClick={openCreateForm}>
          Nova leitura manual
        </button>
      </header>

      <section className="temperature-readings-summary">
        <SummaryCard title="Total" value={temperatureReadings.length} />
        <SummaryCard
          title="Temperatura média"
          value={formatTemperature(averageTemperature)}
        />
        <SummaryCard
          title="Mínima"
          value={formatTemperature(minimumTemperature)}
        />
        <SummaryCard
          title="Máxima"
          value={formatTemperature(maximumTemperature)}
          danger={
            maximumTemperature !== null &&
            temperatureReadings.some(
              (reading) =>
                reading.room?.maxTemperature !== null &&
                reading.room?.maxTemperature !== undefined &&
                reading.temperature > reading.room.maxTemperature,
            )
          }
        />
        <SummaryCard
          title="Umidade média"
          value={formatHumidity(averageHumidity)}
        />
      </section>

      {isFormOpen ? (
        <section className="temperature-reading-form-panel">
          <div className="temperature-reading-form-header">
            <div>
              <span>Leitura manual</span>
              <h2>Nova leitura de temperatura</h2>
            </div>

            <button type="button" onClick={closeForm}>
              Fechar
            </button>
          </div>

          <form className="temperature-reading-form" onSubmit={handleSubmit}>
            <label>
              Empresa *
              <select
                value={formData.companyId}
                onChange={(event) => {
                  updateFormField('companyId', event.target.value);
                  updateFormField('roomId', '');
                  updateFormField('sensorId', '');
                }}
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
                onChange={(event) => {
                  updateFormField('roomId', event.target.value);
                  updateFormField('sensorId', '');
                }}
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
              Sensor
              <select
                value={formData.sensorId}
                onChange={(event) =>
                  updateFormField('sensorId', event.target.value)
                }
              >
                <option value="">Sem sensor / leitura manual</option>

                {formSensors.map((sensor) => (
                  <option key={sensor.id} value={sensor.id}>
                    {sensor.code}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Temperatura °C *
              <input
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(event) =>
                  updateFormField('temperature', event.target.value)
                }
                placeholder="Ex: 22.5"
              />
            </label>

            <label>
              Umidade %
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.humidity}
                onChange={(event) =>
                  updateFormField('humidity', event.target.value)
                }
                placeholder="Ex: 55"
              />
            </label>

            <label>
              Data/hora da leitura
              <input
                type="datetime-local"
                value={formData.readAt}
                onChange={(event) =>
                  updateFormField('readAt', event.target.value)
                }
              />
            </label>

            <label>
              Origem
              <input
                type="text"
                value={formData.source}
                onChange={(event) =>
                  updateFormField('source', event.target.value)
                }
                placeholder="MANUAL, GOVEE, MQTT..."
              />
            </label>
            
            {formError ? (
              <strong className="temperature-reading-form-error">
                {formError}
              </strong>
            ) : null}

            <div className="temperature-reading-form-actions">
              <button type="button" onClick={closeForm}>
                Cancelar
              </button>

              <button type="submit" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Cadastrar leitura'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="temperature-readings-panel">
        <div className="temperature-readings-panel-header">
          <div>
            <h2>Histórico de leituras</h2>
            <p>{filteredReadings.length} leitura(s) encontrada(s)</p>
          </div>

          <div className="temperature-readings-actions">
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

            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              title="Data inicial"
            />

            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              title="Data final"
            />

            <input
              type="search"
              placeholder="Buscar por sala, sensor, origem..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <button type="button" onClick={handleRefresh}>
              Atualizar
            </button>
          </div>
        </div>

        {error ? (
          <div className="temperature-readings-error">
            <strong>{error}</strong>

            <button type="button" onClick={handleRefresh}>
              Tentar novamente
            </button>
          </div>
        ) : null}

        {!error && filteredReadings.length === 0 ? (
         <EmptyState
  title="Nenhuma leitura encontrada."
  description="Ajuste os filtros ou registre uma nova leitura de temperatura."
/>
        ) : null}

        {!error && filteredReadings.length > 0 ? (
          <div className="temperature-readings-table-wrapper">
            <table className="temperature-readings-table">
              <thead>
                <tr>
                  <th>Data da leitura</th>
                  <th>Empresa</th>
                  <th>Sala</th>
                  <th>Sensor</th>
                  <th>Temperatura</th>
                  <th>Umidade</th>
                  <th>Status térmico</th>
                  <th>Origem</th>
                  <th>Observações</th>
                </tr>
              </thead>

              <tbody>
                {filteredReadings.map((reading) => (
                  <tr key={reading.id}>
                    <td>
                      <strong>{formatDateTime(reading.readAt)}</strong>
                      <small>{shortId(reading.id)}</small>
                    </td>

                    <td>{reading.company?.name ?? reading.companyId}</td>

                    <td>
                      <strong>{reading.room?.name ?? reading.roomId}</strong>
                      {reading.room?.minTemperature !== undefined ||
                      reading.room?.maxTemperature !== undefined ? (
                        <small>
                          Limite: {formatTemperature(reading.room?.minTemperature)}{' '}
                          até {formatTemperature(reading.room?.maxTemperature)}
                        </small>
                      ) : null}
                    </td>

                    <td>
                      <span>{reading.sensor?.code ?? '-'}</span>
                      {reading.sensor?.location ? (
                        <small>{reading.sensor.location}</small>
                      ) : null}
                    </td>

                    <td>
                      <TemperatureBadge
                        temperature={reading.temperature}
                        minTemperature={reading.room?.minTemperature}
                        maxTemperature={reading.room?.maxTemperature}
                      />
                    </td>

                    <td>{formatHumidity(reading.humidity)}</td>

                    <td>
                      <ThermalStatusBadge
                        status={reading.room?.thermalStatus ?? null}
                      />
                    </td>

                    <td>{reading.source || '-'}</td>

                    <td>{reading.notes || '-'}</td>
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
          ? 'temperature-readings-summary-card danger'
          : 'temperature-readings-summary-card'
      }
    >
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}

type TemperatureBadgeProps = {
  temperature: number;
  minTemperature?: number | null;
  maxTemperature?: number | null;
};

function TemperatureBadge({
  temperature,
  minTemperature,
  maxTemperature,
}: TemperatureBadgeProps) {
  const isCritical =
    (minTemperature !== null &&
      minTemperature !== undefined &&
      temperature < minTemperature) ||
    (maxTemperature !== null &&
      maxTemperature !== undefined &&
      temperature > maxTemperature);

  return (
    <span
      className={
        isCritical
          ? 'temperature-reading-badge critical'
          : 'temperature-reading-badge normal'
      }
    >
      {formatTemperature(temperature)}
    </span>
  );
}

type ThermalStatusBadgeProps = {
  status?: string | null;
};

function ThermalStatusBadge({ status }: ThermalStatusBadgeProps) {
  const normalizedStatus = status ?? 'OFFLINE';

  const labels: Record<string, string> = {
    NORMAL: 'Normal',
    WARNING: 'Atenção',
    CRITICAL: 'Crítico',
    OFFLINE: 'Offline',
  };

  return (
    <span
      className={`temperature-reading-status ${normalizedStatus.toLowerCase()}`}
    >
      {labels[normalizedStatus] ?? normalizedStatus}
    </span>
  );
}

function optionalValue(value: string) {
  const normalized = value.trim();

  return normalized || undefined;
}

function optionalIsoDateTime(value: string) {
  if (!value) {
    return undefined;
  }

  return new Date(value).toISOString();
}

function currentDateTimeInput() {
  return formatDateTimeInput(new Date().toISOString());
}

function formatDateTimeInput(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);

  return localDate.toISOString().slice(0, 16);
}

function getAverage(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);

  return total / values.length;
}

function getMinimum(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return Math.min(...values);
}

function getMaximum(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return Math.max(...values);
}

function defaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 7);

  return date.toISOString().slice(0, 10);
}

function defaultEndDate() {
  return new Date().toISOString().slice(0, 10);
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

function formatHumidity(value?: number | null) {
  if (value === null || value === undefined) {
    return '-';
  }

  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)}%`;
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

    if (typeof data === 'object' && data !== null && 'message' in data) {
      const message = data.message;

      if (typeof message === 'string') {
        return message;
      }

      if (Array.isArray(message)) {
        return message.join(' | ');
      }
    }
  }

  return 'Não foi possível cadastrar a leitura.';
}

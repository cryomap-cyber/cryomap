import { type FormEvent, useEffect, useMemo, useState } from 'react';
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
    return <p>Carregando sensores...</p>;
  }

  return (
    <div className="sensors-page">
      <header className="sensors-header">
        <div>
          <span>Cadastros</span>
          <h1>Sensores</h1>
          <p>
            Visualize sensores vinculados às salas. Sensores não são vinculados
            diretamente aos equipamentos.
          </p>
        </div>

        <button type="button" onClick={openCreateForm}>
          Novo sensor
        </button>
      </header>

      <section className="sensors-summary">
        <SummaryCard title="Total" value={sensors.length} />
        <SummaryCard title="Ativos" value={activeSensors} />
        <SummaryCard title="Offline" value={offlineSensors} danger />
        <SummaryCard title="Manutenção" value={maintenanceSensors} />
        <SummaryCard title="Inativos" value={inactiveSensors} />
      </section>

      {isFormOpen ? (
        <section className="sensor-form-panel">
          <div className="sensor-form-header">
            <div>
              <span>Sensor</span>
              <h2>{editingSensor ? 'Editar sensor' : 'Novo sensor'}</h2>
            </div>

            <button type="button" onClick={closeForm}>
              Fechar
            </button>
          </div>

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
              <button type="button" onClick={closeForm}>
                Cancelar
              </button>

              <button type="submit" disabled={isSaving}>
                {isSaving
                  ? 'Salvando...'
                  : editingSensor
                    ? 'Salvar alterações'
                    : 'Cadastrar sensor'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="sensors-panel">
        <div className="sensors-panel-header">
          <div>
            <h2>Lista de sensores</h2>
            <p>{filteredSensors.length} registro(s) encontrado(s)</p>
          </div>

          <div className="sensors-actions">
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

            <input
              type="search"
              placeholder="Buscar por código, localização, sala..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <button type="button" onClick={handleRefresh}>
              Atualizar
            </button>
          </div>
        </div>

        {error ? (
          <div className="sensors-error">
            <strong>{error}</strong>

            <button type="button" onClick={handleRefresh}>
              Tentar novamente
            </button>
          </div>
        ) : null}

        {!error && filteredSensors.length === 0 ? (
          <p className="sensors-empty">Nenhum sensor encontrado.</p>
        ) : null}

        {!error && filteredSensors.length > 0 ? (
          <div className="sensors-table-wrapper">
            <table className="sensors-table">
              <thead>
                <tr>
                  <th>Sensor</th>
                  <th>Código</th>
                  <th>Empresa</th>
                  <th>Sala</th>
                  <th>Tipo</th>
                  <th>Última temperatura</th>
                  <th>Última umidade</th>
                  <th>Última comunicação</th>
                  <th>Status</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {filteredSensors.map((sensor) => (
                  <tr key={sensor.id}>
                    <td>
                      <strong>{sensor.code}</strong>
                      <small>{sensor.location || sensor.id}</small>
                    </td>

                    <td>{sensor.code}</td>

                    <td>{sensor.company?.name ?? sensor.companyId}</td>

                    <td>{sensor.room?.name ?? sensor.roomId}</td>

                    <td>{formatSensorType(sensor.type)}</td>

                    <td>
                      <strong>
                        {formatTemperature(sensor.lastTemperature)}
                      </strong>
                    </td>

                    <td>
                      <strong>{formatHumidity(sensor.lastHumidity)}</strong>
                    </td>

                    <td>{formatDateTime(sensor.lastSeenAt)}</td>

                    <td>
                      <SensorStatusBadge status={sensor.status} />
                    </td>

                    <td>{formatDate(sensor.createdAt)}</td>

                    <td>
                      <div className="sensor-row-actions">
                        <button
                          type="button"
                          onClick={() => openEditForm(sensor)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          disabled={sensor.status === 'INACTIVE'}
                          onClick={() => handleInactivate(sensor)}
                        >
                          Inativar
                        </button>
                      </div>
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
  value: number;
  danger?: boolean;
};

function SummaryCard({ title, value, danger = false }: SummaryCardProps) {
  return (
    <article
      className={
        danger ? 'sensors-summary-card danger' : 'sensors-summary-card'
      }
    >
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
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
    <span className={`sensor-status ${status.toLowerCase()}`}>
      {labels[status]}
    </span>
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

  return new Date(value).toLocaleString('pt-BR');
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
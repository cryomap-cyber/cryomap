import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { getCompanies } from '../../services/companies';
import { getEquipments } from '../../services/equipments';
import {
  createEquipmentTemperatureReading,
  getEquipmentTemperatureReadings,
  type CreateEquipmentTemperatureReadingPayload,
} from '../../services/equipment-temperature-readings';
import { getRooms } from '../../services/rooms';
import { getUsers } from '../../services/users';
import type { Company } from '../../types/company';
import type { Equipment } from '../../types/equipment';
import type { EquipmentTemperatureReading } from '../../types/equipment-temperature-reading';
import type { Room } from '../../types/room';
import type { User } from '../../types/user';
import './EquipmentTemperatureReadings.css';

type EquipmentTemperatureReadingFormData = {
  companyId: string;
  equipmentId: string;
  temperature: string;
  source: 'MANUAL';
  notes: string;
  measuredAt: string;
};

const emptyFormData: EquipmentTemperatureReadingFormData = {
  companyId: '',
  equipmentId: '',
  temperature: '',
  source: 'MANUAL',
  notes: '',
  measuredAt: '',
};

export function EquipmentTemperatureReadings() {
  const [readings, setReadings] = useState<EquipmentTemperatureReading[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [formEquipments, setFormEquipments] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [selectedCreatedByUserId, setSelectedCreatedByUserId] = useState('');
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(defaultEndDate());
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] =
    useState<EquipmentTemperatureReadingFormData>(emptyFormData);

  async function handleRefresh() {
    setError('');
    setIsLoading(true);

    try {
      const [companiesData, roomsData, equipmentsData, usersData, readingsData] =
        await Promise.all([
          getCompanies(),
          getRooms(selectedCompanyId || undefined),
          getEquipments({
            companyId: selectedCompanyId || undefined,
            roomId: selectedRoomId || undefined,
          }),
          getUsers({
            companyId: selectedCompanyId || undefined,
          }),
          getEquipmentTemperatureReadings({
            companyId: selectedCompanyId || undefined,
            roomId: selectedRoomId || undefined,
            equipmentId: selectedEquipmentId || undefined,
            createdByUserId: selectedCreatedByUserId || undefined,
            startDate: optionalStartIsoDate(startDate),
            endDate: optionalEndIsoDate(endDate),
          }),
        ]);

      setCompanies(companiesData);
      setRooms(roomsData);
      setEquipments(equipmentsData);
      setFormEquipments(equipmentsData);
      setUsers(usersData);
      setReadings(readingsData);
    } catch {
      setError('Não foi possível carregar as leituras dos equipamentos.');
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
      getEquipments(),
      getUsers(),
      getEquipmentTemperatureReadings(initialParams),
    ])
      .then(
        ([
          companiesData,
          roomsData,
          equipmentsData,
          usersData,
          readingsData,
        ]) => {
          if (!isMounted) {
            return;
          }

          setCompanies(companiesData);
          setRooms(roomsData);
          setEquipments(equipmentsData);
          setFormEquipments(equipmentsData);
          setUsers(usersData);
          setReadings(readingsData);
        },
      )
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível carregar as leituras dos equipamentos.');
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
      getEquipments({
        companyId: selectedCompanyId || undefined,
        roomId: selectedRoomId || undefined,
      }),
      getUsers({
        companyId: selectedCompanyId || undefined,
      }),
    ])
      .then(([roomsData, equipmentsData, usersData]) => {
        if (!isMounted) {
          return;
        }

        setRooms(roomsData);
        setEquipments(equipmentsData);
        setUsers(usersData);

        if (
          selectedRoomId &&
          !roomsData.some((room) => room.id === selectedRoomId)
        ) {
          setSelectedRoomId('');
        }

        if (
          selectedEquipmentId &&
          !equipmentsData.some(
            (equipment) => equipment.id === selectedEquipmentId,
          )
        ) {
          setSelectedEquipmentId('');
        }

        if (
          selectedCreatedByUserId &&
          !usersData.some((user) => user.id === selectedCreatedByUserId)
        ) {
          setSelectedCreatedByUserId('');
        }
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível carregar filtros de equipamentos.');
      });

    return () => {
      isMounted = false;
    };
  }, [
    selectedCompanyId,
    selectedRoomId,
    selectedEquipmentId,
    selectedCreatedByUserId,
  ]);

  const filteredReadings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return readings;
    }

    return readings.filter((reading) => {
      return [
        reading.company?.name ?? '',
        reading.room?.name ?? '',
        reading.equipment?.name ?? '',
        reading.equipment?.code ?? '',
        reading.createdByUser?.name ?? '',
        reading.createdByUser?.email ?? '',
        reading.source ?? '',
        reading.notes ?? '',
        String(reading.temperature),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [readings, search]);

  const averageTemperature = getAverage(
    readings.map((reading) => reading.temperature),
  );

  const minimumTemperature = getMinimum(
    readings.map((reading) => reading.temperature),
  );

  const maximumTemperature = getMaximum(
    readings.map((reading) => reading.temperature),
  );

  const manualReadings = readings.filter(
    (reading) => reading.source === 'MANUAL',
  ).length;

  function openCreateForm() {
    const selectedEquipment = equipments.find(
      (equipment) => equipment.id === selectedEquipmentId,
    );

    setFormData({
      ...emptyFormData,
      companyId: selectedCompanyId || selectedEquipment?.companyId || '',
      equipmentId: selectedEquipmentId,
      measuredAt: currentDateTimeInput(),
    });
    setFormEquipments(equipments);
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
    field: keyof EquipmentTemperatureReadingFormData,
    value: string,
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleFormCompanyChange(companyId: string) {
    updateFormField('companyId', companyId);
    updateFormField('equipmentId', '');

    try {
      const equipmentsData = await getEquipments({
        companyId: companyId || undefined,
      });

      setFormEquipments(equipmentsData);
    } catch {
      setFormError('Não foi possível carregar equipamentos da empresa.');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError('');

    if (!formData.companyId) {
      setFormError('Selecione a empresa.');
      return;
    }

    if (!formData.equipmentId) {
      setFormError('Selecione o equipamento.');
      return;
    }

    const temperature = Number(formData.temperature.replace(',', '.'));

    if (Number.isNaN(temperature)) {
      setFormError('Informe uma temperatura válida.');
      return;
    }

    setIsSaving(true);

    try {
      const payload: CreateEquipmentTemperatureReadingPayload = {
        companyId: formData.companyId,
        equipmentId: formData.equipmentId,
        temperature,
        source: formData.source,
        notes: optionalValue(formData.notes),
        measuredAt: optionalIsoDateTime(formData.measuredAt),
      };

      await createEquipmentTemperatureReading(payload);

      closeForm();
      await handleRefresh();
    } catch (requestError) {
      setFormError(getRequestErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p>Carregando leituras de equipamentos...</p>;
  }

  return (
    <div className="equipment-temperature-readings-page">
      <header className="equipment-temperature-readings-header">
        <div>
          <span>Equipamentos</span>
          <h1>Temperaturas dos equipamentos</h1>
          <p>
            Registre e acompanhe medições manuais de temperatura dos
            equipamentos. Equipamentos não usam sensores no CryoMap.
          </p>
        </div>

        <button type="button" onClick={openCreateForm}>
          Nova leitura manual
        </button>
      </header>

      <section className="equipment-temperature-readings-summary">
        <SummaryCard title="Total" value={readings.length} />
        <SummaryCard title="Manuais" value={manualReadings} />
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
        />
      </section>

      {isFormOpen ? (
        <section className="equipment-temperature-reading-form-panel">
          <div className="equipment-temperature-reading-form-header">
            <div>
              <span>Leitura manual</span>
              <h2>Nova temperatura de equipamento</h2>
            </div>

            <button type="button" onClick={closeForm}>
              Fechar
            </button>
          </div>

          <form
            className="equipment-temperature-reading-form"
            onSubmit={handleSubmit}
          >
            <label>
              Empresa *
              <select
                value={formData.companyId}
                onChange={(event) =>
                  void handleFormCompanyChange(event.target.value)
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
              Equipamento *
              <select
                value={formData.equipmentId}
                onChange={(event) =>
                  updateFormField('equipmentId', event.target.value)
                }
              >
                <option value="">Selecione um equipamento</option>

                {formEquipments.map((equipment) => (
                  <option key={equipment.id} value={equipment.id}>
                    {equipment.name} — {equipment.code}
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
                placeholder="Ex: 7.5"
              />
            </label>

            <label>
              Origem
              <select
                value={formData.source}
                onChange={(event) =>
                  updateFormField(
                    'source',
                    event.target.value as EquipmentTemperatureReadingFormData['source'],
                  )
                }
              >
                <option value="MANUAL">Manual</option>
              </select>
            </label>

            <label>
              Data/hora da medição
              <input
                type="datetime-local"
                value={formData.measuredAt}
                onChange={(event) =>
                  updateFormField('measuredAt', event.target.value)
                }
              />
            </label>

            <label className="equipment-temperature-reading-form-wide">
              Observações
              <textarea
                value={formData.notes}
                onChange={(event) => updateFormField('notes', event.target.value)}
                placeholder="Observações sobre a medição..."
                rows={3}
              />
            </label>

            {formError ? (
              <strong className="equipment-temperature-reading-form-error">
                {formError}
              </strong>
            ) : null}

            <div className="equipment-temperature-reading-form-actions">
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

      <section className="equipment-temperature-readings-panel">
        <div className="equipment-temperature-readings-panel-header">
          <div>
            <h2>Histórico de medições</h2>
            <p>{filteredReadings.length} leitura(s) encontrada(s)</p>
          </div>

          <div className="equipment-temperature-readings-actions">
            <select
              value={selectedCompanyId}
              onChange={(event) => {
                setSelectedCompanyId(event.target.value);
                setSelectedRoomId('');
                setSelectedEquipmentId('');
                setSelectedCreatedByUserId('');
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
                setSelectedEquipmentId('');
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
              value={selectedEquipmentId}
              onChange={(event) => setSelectedEquipmentId(event.target.value)}
            >
              <option value="">Todos os equipamentos</option>

              {equipments.map((equipment) => (
                <option key={equipment.id} value={equipment.id}>
                  {equipment.name} — {equipment.code}
                </option>
              ))}
            </select>

            <select
              value={selectedCreatedByUserId}
              onChange={(event) =>
                setSelectedCreatedByUserId(event.target.value)
              }
            >
              <option value="">Todos os usuários</option>

              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
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
              placeholder="Buscar por equipamento, usuário, observação..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <button type="button" onClick={handleRefresh}>
              Atualizar
            </button>
          </div>
        </div>

        {error ? (
          <div className="equipment-temperature-readings-error">
            <strong>{error}</strong>

            <button type="button" onClick={handleRefresh}>
              Tentar novamente
            </button>
          </div>
        ) : null}

        {!error && filteredReadings.length === 0 ? (
          <p className="equipment-temperature-readings-empty">
            Nenhuma leitura encontrada para os filtros selecionados.
          </p>
        ) : null}

        {!error && filteredReadings.length > 0 ? (
          <div className="equipment-temperature-readings-table-wrapper">
            <table className="equipment-temperature-readings-table">
              <thead>
                <tr>
                  <th>Data da medição</th>
                  <th>Empresa</th>
                  <th>Sala</th>
                  <th>Equipamento</th>
                  <th>Temperatura</th>
                  <th>Origem</th>
                  <th>Registrado por</th>
                  <th>Observações</th>
                </tr>
              </thead>

              <tbody>
                {filteredReadings.map((reading) => (
                  <tr key={reading.id}>
                    <td>
                      <strong>{formatDateTime(reading.measuredAt)}</strong>
                      <small>{shortId(reading.id)}</small>
                    </td>

                    <td>{reading.company?.name ?? reading.companyId}</td>

                    <td>{reading.room?.name ?? '-'}</td>

                    <td>
                      <strong>
                        {reading.equipment?.name ?? reading.equipmentId}
                      </strong>
                      {reading.equipment?.code ? (
                        <small>{reading.equipment.code}</small>
                      ) : null}
                    </td>

                    <td>
                      <span className="equipment-temperature-reading-badge">
                        {formatTemperature(reading.temperature)}
                      </span>
                    </td>

                    <td>{formatSource(reading.source)}</td>

                    <td>
                      <span>{reading.createdByUser?.name ?? '-'}</span>
                      {reading.createdByUser?.email ? (
                        <small>{reading.createdByUser.email}</small>
                      ) : null}
                    </td>

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
};

function SummaryCard({ title, value }: SummaryCardProps) {
  return (
    <article className="equipment-temperature-readings-summary-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
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
  date.setDate(date.getDate() - 30);

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

function formatSource(value?: string | null) {
  const labels: Record<string, string> = {
    MANUAL: 'Manual',
  };

  return labels[value ?? ''] ?? value ?? '-';
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

  return 'Não foi possível cadastrar a leitura do equipamento.';
}

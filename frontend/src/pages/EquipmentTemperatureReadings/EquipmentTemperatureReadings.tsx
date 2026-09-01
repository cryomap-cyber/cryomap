import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { EmptyState } from '../../components/Feedback/EmptyState';
import { LoadingState } from '../../components/Feedback/LoadingState';
import { useAuth } from '../../contexts/useAuth';
import { getCompanies } from '../../services/companies';
import {
  createEquipmentTemperatureReading,
  getEquipmentTemperatureReadings,
  type CreateEquipmentTemperatureReadingPayload,
} from '../../services/equipment-temperature-readings';
import { getEquipments } from '../../services/equipments';
import { getRooms } from '../../services/rooms';
import { getUsers } from '../../services/users';
import type { Company } from '../../types/company';
import type { Equipment } from '../../types/equipment';
import type {
  EquipmentTemperatureReading,
  EquipmentTemperatureSource,
} from '../../types/equipment-temperature-reading';
import type { Room } from '../../types/room';
import type { User } from '../../types/user';
import './EquipmentTemperatureReadings.css';

type EquipmentTemperatureReadingFormData = {
  companyId: string;
  equipmentId: string;
  temperature: string;
  dischargePressure: string;
  suctionPressure: string;
  liquidLineTemperature: string;
  evaporationTemperature: string;
  superheating: string;
  subcooling: string;
  airFlow: string;
  source: EquipmentTemperatureSource;
  notes: string;
  measuredAt: string;
};

type ChartMetric =
  | 'temperature'
  | 'dischargePressure'
  | 'suctionPressure'
  | 'superheating'
  | 'subcooling'
  | 'airFlow';

type ChartPeriod = 'TODAY' | 'SEVEN_DAYS' | 'THIRTY_DAYS' | 'TWELVE_MONTHS';

type LoadDataOptions = {
  companyId?: string;
  roomId?: string;
  equipmentId?: string;
  createdByUserId?: string;
  startDateValue?: string;
  endDateValue?: string;
};

type ChartDataItem = {
  label: string;
  value: number;
  count: number;
  timestamp: number;
};

const chartMetricOptions: {
  value: ChartMetric;
  label: string;
}[] = [
  {
    value: 'temperature',
    label: 'Temperatura',
  },
  {
    value: 'dischargePressure',
    label: 'Pressão de descarga',
  },
  {
    value: 'suctionPressure',
    label: 'Pressão de sucção',
  },
  {
    value: 'superheating',
    label: 'Superaquecimento',
  },
  {
    value: 'subcooling',
    label: 'Subresfriamento',
  },
  {
    value: 'airFlow',
    label: 'Vazão de ar',
  },
];

const chartPeriodOptions: {
  value: ChartPeriod;
  label: string;
}[] = [
  {
    value: 'TODAY',
    label: 'Hoje',
  },
  {
    value: 'SEVEN_DAYS',
    label: '7 dias',
  },
  {
    value: 'THIRTY_DAYS',
    label: '30 dias',
  },
  {
    value: 'TWELVE_MONTHS',
    label: '12 meses',
  },
];

const emptyFormData: EquipmentTemperatureReadingFormData = {
  companyId: '',
  equipmentId: '',
  temperature: '',
  dischargePressure: '',
  suctionPressure: '',
  liquidLineTemperature: '',
  evaporationTemperature: '',
  superheating: '',
  subcooling: '',
  airFlow: '',
  source: 'MANUAL',
  notes: '',
  measuredAt: '',
};

export function EquipmentTemperatureReadings() {
  const { user } = useAuth();

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
  const [selectedChartEquipmentId, setSelectedChartEquipmentId] = useState('');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('temperature');
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('THIRTY_DAYS');
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

  const canCreateMeasurement = user?.role !== 'CLIENT_USER';

  async function loadData(options?: LoadDataOptions) {
    setError('');
    setIsLoading(true);

    const nextCompanyId = options?.companyId ?? selectedCompanyId;
    const nextRoomId = options?.roomId ?? selectedRoomId;
    const nextEquipmentId = options?.equipmentId ?? selectedEquipmentId;
    const nextCreatedByUserId =
      options?.createdByUserId ?? selectedCreatedByUserId;
    const nextStartDate = options?.startDateValue ?? startDate;
    const nextEndDate = options?.endDateValue ?? endDate;

    try {
      const [companiesData, roomsData, equipmentsData, usersData, readingsData] =
        await Promise.all([
          getCompanies(),
          getRooms(nextCompanyId || undefined),
          getEquipments({
            companyId: nextCompanyId || undefined,
            roomId: nextRoomId || undefined,
          }),
          getUsers({
            companyId: nextCompanyId || undefined,
          }),
          getEquipmentTemperatureReadings({
            companyId: nextCompanyId || undefined,
            roomId: nextRoomId || undefined,
            equipmentId: nextEquipmentId || undefined,
            createdByUserId: nextCreatedByUserId || undefined,
            startDate: optionalStartIsoDate(nextStartDate),
            endDate: optionalEndIsoDate(nextEndDate),
          }),
        ]);

      setCompanies(companiesData);
      setRooms(roomsData);
      setEquipments(equipmentsData);
      setFormEquipments(equipmentsData);
      setUsers(usersData);
      setReadings(readingsData);
    } catch {
      setError('Não foi possível carregar as medições dos equipamentos.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefresh() {
    await loadData();
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

        setError('Não foi possível carregar as medições dos equipamentos.');
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
          !usersData.some((item) => item.id === selectedCreatedByUserId)
        ) {
          setSelectedCreatedByUserId('');
        }

        if (
          selectedChartEquipmentId &&
          !equipmentsData.some(
            (equipment) => equipment.id === selectedChartEquipmentId,
          )
        ) {
          setSelectedChartEquipmentId('');
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
    selectedChartEquipmentId,
  ]);

  const activeChartEquipmentId = useMemo(() => {
    if (
      selectedChartEquipmentId &&
      equipments.some((equipment) => equipment.id === selectedChartEquipmentId)
    ) {
      return selectedChartEquipmentId;
    }

    return equipments[0]?.id ?? '';
  }, [equipments, selectedChartEquipmentId]);

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
        reading.equipment?.refrigerantFluid ?? '',
        reading.createdByUser?.name ?? '',
        reading.createdByUser?.email ?? '',
        reading.source ?? '',
        reading.notes ?? '',
        String(reading.temperature),
        String(reading.dischargePressure ?? ''),
        String(reading.suctionPressure ?? ''),
        String(reading.liquidLineTemperature ?? ''),
        String(reading.evaporationTemperature ?? ''),
        String(reading.superheating ?? ''),
        String(reading.subcooling ?? ''),
        String(reading.airFlow ?? ''),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [readings, search]);

    const chartData = useMemo(() => {
    return buildChartData(
      readings,
      activeChartEquipmentId,
      chartMetric,
      chartPeriod,
    );
  }, [readings, activeChartEquipmentId, chartMetric, chartPeriod]);

  const selectedChartEquipment = equipments.find(
    (equipment) => equipment.id === activeChartEquipmentId,
  );

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
    if (!canCreateMeasurement) {
      return;
    }

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

  async function handleChartEquipmentChange(equipmentId: string) {
    setSelectedChartEquipmentId(equipmentId);
    setSelectedEquipmentId(equipmentId);

    await loadData({
      equipmentId,
    });
  }

  async function handleChartPeriodChange(period: ChartPeriod) {
    const range = getChartDateRange(period);

    setChartPeriod(period);
    setStartDate(range.startDate);
    setEndDate(range.endDate);

    await loadData({
      startDateValue: range.startDate,
      endDateValue: range.endDate,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreateMeasurement) {
      setFormError('Usuário cliente pode apenas visualizar medições.');
      return;
    }

    setFormError('');

    if (!formData.companyId) {
      setFormError('Selecione a empresa.');
      return;
    }

    if (!formData.equipmentId) {
      setFormError('Selecione o equipamento.');
      return;
    }

    const temperature = optionalNumber(formData.temperature);

    if (temperature === undefined) {
      setFormError('Informe uma temperatura válida.');
      return;
    }

    setIsSaving(true);

    try {
      const payload: CreateEquipmentTemperatureReadingPayload = {
        companyId: formData.companyId,
        equipmentId: formData.equipmentId,
        temperature,
        dischargePressure: optionalNumber(formData.dischargePressure),
        suctionPressure: optionalNumber(formData.suctionPressure),
        liquidLineTemperature: optionalNumber(formData.liquidLineTemperature),
        evaporationTemperature: optionalNumber(formData.evaporationTemperature),
        superheating: optionalNumber(formData.superheating),
        subcooling: optionalNumber(formData.subcooling),
        airFlow: optionalNumber(formData.airFlow),
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
    return (
      <LoadingState
        title="Carregando medições de equipamentos..."
        description="Buscando histórico técnico dos equipamentos."
      />
    );
  }

  return (
    <div className="equipment-temperature-readings-page">
      <header className="equipment-temperature-readings-header">
        <div>
          <span>Equipamentos</span>
          <h1>Medições dos equipamentos</h1>
          <p>
            Registre e acompanhe o histórico técnico dos equipamentos:
            temperatura, pressões, superaquecimento, subresfriamento e vazão de
            ar. Equipamentos não usam sensores no CryoMap.
          </p>

          {!canCreateMeasurement ? (
            <p>
              Seu acesso é somente leitura. Você pode consultar as medições da
              sua empresa, mas não pode criar novos registros.
            </p>
          ) : null}
        </div>

        {canCreateMeasurement ? (
          <button type="button" onClick={openCreateForm}>
            Nova medição
          </button>
        ) : null}
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

      <section className="equipment-temperature-chart-panel">
        <div className="equipment-temperature-chart-header">
          <div>
            <span>Gráfico técnico</span>
            <h2>Evolução por equipamento</h2>
            <p>
              Escolha o equipamento, o indicador e o período para acompanhar as
              medições em gráfico de colunas.
            </p>
          </div>

          <div className="equipment-temperature-chart-actions">
                       <select
              value={activeChartEquipmentId}
              onChange={(event) =>
                void handleChartEquipmentChange(event.target.value)
              }
            >
              <option value="">Selecione um equipamento</option>

              {equipments.map((equipment) => (
                <option key={equipment.id} value={equipment.id}>
                  {equipment.name} — {equipment.code}
                </option>
              ))}
            </select>

            <select
              value={chartMetric}
              onChange={(event) =>
                setChartMetric(event.target.value as ChartMetric)
              }
            >
              {chartMetricOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={chartPeriod}
              onChange={(event) =>
                void handleChartPeriodChange(event.target.value as ChartPeriod)
              }
            >
              {chartPeriodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedChartEquipment ? (
          <p className="equipment-temperature-chart-context">
            Equipamento selecionado:{' '}
            <strong>
              {selectedChartEquipment.name} — {selectedChartEquipment.code}
            </strong>
            {selectedChartEquipment.refrigerantFluid
              ? ` | Fluido: ${selectedChartEquipment.refrigerantFluid}`
              : ''}
          </p>
        ) : null}

        {chartData.length > 0 ? (
          <div className="equipment-temperature-chart-wrapper">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(value) => compactNumber(Number(value))} />
                <Tooltip
                  formatter={(value) =>
                    formatMetricValue(Number(value), chartMetric)
                  }
                  labelFormatter={(label) => `Período: ${label}`}
                />
                <Bar
                  dataKey="value"
                  name={getChartMetricLabel(chartMetric)}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            title="Sem dados para o gráfico."
            description="Selecione outro equipamento, período ou indicador para visualizar medições."
          />
        )}
      </section>

      {isFormOpen && canCreateMeasurement ? (
        <section className="equipment-temperature-reading-form-panel">
          <div className="equipment-temperature-reading-form-header">
            <div>
              <span>Histórico técnico</span>
              <h2>Nova medição de equipamento</h2>
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
              Temperatura do equipamento (°C) *
              <input
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(event) =>
                  updateFormField('temperature', event.target.value)
                }
                placeholder="Ex: -18.5"
              />
            </label>

            <label>
              Pressão de descarga (psi)
              <input
                type="number"
                step="0.1"
                value={formData.dischargePressure}
                onChange={(event) =>
                  updateFormField('dischargePressure', event.target.value)
                }
                placeholder="Ex: 220"
              />
            </label>

            <label>
              Pressão de sucção (psi)
              <input
                type="number"
                step="0.1"
                value={formData.suctionPressure}
                onChange={(event) =>
                  updateFormField('suctionPressure', event.target.value)
                }
                placeholder="Ex: 28"
              />
            </label>

            <label>
              Temp. linha de líquido (°C)
              <input
                type="number"
                step="0.1"
                value={formData.liquidLineTemperature}
                onChange={(event) =>
                  updateFormField('liquidLineTemperature', event.target.value)
                }
                placeholder="Ex: 32.4"
              />
            </label>

            <label>
              Temp. evaporação (°C)
              <input
                type="number"
                step="0.1"
                value={formData.evaporationTemperature}
                onChange={(event) =>
                  updateFormField('evaporationTemperature', event.target.value)
                }
                placeholder="Ex: -24.1"
              />
            </label>

            <label>
              Superaquecimento (°C)
              <input
                type="number"
                step="0.1"
                value={formData.superheating}
                onChange={(event) =>
                  updateFormField('superheating', event.target.value)
                }
                placeholder="Ex: 6.5"
              />
            </label>

            <label>
              Subresfriamento (°C)
              <input
                type="number"
                step="0.1"
                value={formData.subcooling}
                onChange={(event) =>
                  updateFormField('subcooling', event.target.value)
                }
                placeholder="Ex: 4.2"
              />
            </label>

            <label>
              Vazão de ar (m³/h)
              <input
                type="number"
                step="0.1"
                value={formData.airFlow}
                onChange={(event) =>
                  updateFormField('airFlow', event.target.value)
                }
                placeholder="Ex: 1800"
              />
            </label>

            <label>
              Origem
              <select
                value={formData.source}
                onChange={(event) =>
                  updateFormField(
                    'source',
                    event.target.value as EquipmentTemperatureSource,
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
                onChange={(event) =>
                  updateFormField('notes', event.target.value)
                }
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
                {isSaving ? 'Salvando...' : 'Cadastrar medição'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="equipment-temperature-readings-panel">
        <div className="equipment-temperature-readings-panel-header">
          <div>
            <h2>Histórico de medições</h2>
            <p>{filteredReadings.length} medição(ões) encontrada(s)</p>
          </div>

          <div className="equipment-temperature-readings-actions">
            <select
              value={selectedCompanyId}
              onChange={(event) => {
                setSelectedCompanyId(event.target.value);
                setSelectedRoomId('');
                setSelectedEquipmentId('');
                setSelectedCreatedByUserId('');
                setSelectedChartEquipmentId('');
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
                setSelectedChartEquipmentId('');
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
              onChange={(event) => {
                setSelectedEquipmentId(event.target.value);
                setSelectedChartEquipmentId(event.target.value);
              }}
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

              {users.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
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
              placeholder="Buscar por equipamento, fluido, pressão..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <button type="button" onClick={() => void handleRefresh()}>
              Atualizar
            </button>
          </div>
        </div>

        {error ? (
          <div className="equipment-temperature-readings-error">
            <strong>{error}</strong>

            <button type="button" onClick={() => void handleRefresh()}>
              Tentar novamente
            </button>
          </div>
        ) : null}

        {!error && filteredReadings.length === 0 ? (
          <EmptyState
            title="Nenhuma medição encontrada."
            description="Ajuste os filtros ou registre uma nova medição técnica de equipamento."
          />
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
                  <th>Temp.</th>
                  <th>Pressões</th>
                  <th>Temperaturas técnicas</th>
                  <th>Super/Sub</th>
                  <th>Vazão de ar</th>
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
                      {reading.equipment?.refrigerantFluid ? (
                        <small>Fluido: {reading.equipment.refrigerantFluid}</small>
                      ) : null}
                    </td>

                    <td>
                      <span className="equipment-temperature-reading-badge">
                        {formatTemperature(reading.temperature)}
                      </span>
                    </td>

                    <td>
                      <span>
                        Descarga: {formatPressure(reading.dischargePressure)}
                      </span>
                      <small>
                        Sucção: {formatPressure(reading.suctionPressure)}
                      </small>
                    </td>

                    <td>
                      <span>
                        Linha líquido:{' '}
                        {formatTemperature(reading.liquidLineTemperature)}
                      </span>
                      <small>
                        Evaporação:{' '}
                        {formatTemperature(reading.evaporationTemperature)}
                      </small>
                    </td>

                    <td>
                      <span>
                        Super: {formatTemperature(reading.superheating)}
                      </span>
                      <small>Sub: {formatTemperature(reading.subcooling)}</small>
                    </td>

                    <td>{formatAirFlow(reading.airFlow)}</td>

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

function optionalNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const normalized = Number(value.replace(',', '.'));

  if (Number.isNaN(normalized)) {
    return undefined;
  }

  return normalized;
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
  const range = getChartDateRange('THIRTY_DAYS');

  return range.startDate;
}

function defaultEndDate() {
  return toDateInputValue(new Date());
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

function formatPressure(value?: number | null) {
  if (value === null || value === undefined) {
    return '-';
  }

  return `${new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 1,
  }).format(value)} psi`;
}

function formatAirFlow(value?: number | null) {
  if (value === null || value === undefined) {
    return '-';
  }

  return `${new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 1,
  }).format(value)} m³/h`;
}

function formatSource(value?: string | null) {
  const labels: Record<string, string> = {
    MANUAL: 'Manual',
    IMPORT: 'Importação',
  };

  return labels[value ?? ''] ?? value ?? '-';
}

function buildChartData(
  readings: EquipmentTemperatureReading[],
  equipmentId: string,
  metric: ChartMetric,
  period: ChartPeriod,
): ChartDataItem[] {
  if (!equipmentId) {
    return [];
  }

  const range = getChartDateRange(period);
  const start = new Date(`${range.startDate}T00:00:00`);
  const end = new Date(`${range.endDate}T23:59:59`);

  const validReadings = readings
    .map((reading) => {
      const measuredAt = new Date(reading.measuredAt);
      const value = reading[metric];

      if (
        reading.equipmentId !== equipmentId ||
        Number.isNaN(measuredAt.getTime()) ||
        measuredAt < start ||
        measuredAt > end ||
        typeof value !== 'number'
      ) {
        return null;
      }

      return {
        measuredAt,
        value,
      };
    })
    .filter((reading): reading is { measuredAt: Date; value: number } => {
      return reading !== null;
    })
    .sort((first, second) => {
      return first.measuredAt.getTime() - second.measuredAt.getTime();
    });

  if (period === 'TODAY') {
    return validReadings.map((reading) => ({
      label: reading.measuredAt.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      value: roundDecimal(reading.value),
      count: 1,
      timestamp: reading.measuredAt.getTime(),
    }));
  }

  const groupedReadings = new Map<
    string,
    {
      label: string;
      total: number;
      count: number;
      timestamp: number;
    }
  >();

  validReadings.forEach((reading) => {
    const bucket = getChartBucket(reading.measuredAt, period);
    const current = groupedReadings.get(bucket.key);

    if (!current) {
      groupedReadings.set(bucket.key, {
        label: bucket.label,
        total: reading.value,
        count: 1,
        timestamp: bucket.timestamp,
      });

      return;
    }

    current.total += reading.value;
    current.count += 1;
  });

  return Array.from(groupedReadings.values())
    .sort((first, second) => first.timestamp - second.timestamp)
    .map((item) => ({
      label: item.label,
      value: roundDecimal(item.total / item.count),
      count: item.count,
      timestamp: item.timestamp,
    }));
}

function getChartBucket(date: Date, period: ChartPeriod) {
  if (period === 'TWELVE_MONTHS') {
    const year = date.getFullYear();
    const month = date.getMonth();
    const bucketDate = new Date(year, month, 1);

    return {
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      label: bucketDate.toLocaleDateString('pt-BR', {
        month: 'short',
        year: '2-digit',
      }),
      timestamp: bucketDate.getTime(),
    };
  }

  const bucketDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  return {
    key: toDateInputValue(bucketDate),
    label: bucketDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    }),
    timestamp: bucketDate.getTime(),
  };
}

function getChartDateRange(period: ChartPeriod) {
  const end = new Date();
  const start = new Date();

  if (period === 'TODAY') {
    return {
      startDate: toDateInputValue(start),
      endDate: toDateInputValue(end),
    };
  }

  if (period === 'SEVEN_DAYS') {
    start.setDate(start.getDate() - 6);
  }

  if (period === 'THIRTY_DAYS') {
    start.setDate(start.getDate() - 29);
  }

  if (period === 'TWELVE_MONTHS') {
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
  }

  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
}

function toDateInputValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 10);
}

function roundDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function getChartMetricLabel(metric: ChartMetric) {
  const option = chartMetricOptions.find((item) => item.value === metric);

  return option?.label ?? metric;
}

function formatMetricValue(value: number, metric: ChartMetric) {
  if (metric === 'dischargePressure' || metric === 'suctionPressure') {
    return formatPressure(value);
  }

  if (metric === 'airFlow') {
    return formatAirFlow(value);
  }

  return formatTemperature(value);
}

function compactNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 1,
  }).format(value);
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

  return 'Não foi possível cadastrar a medição do equipamento.';
}

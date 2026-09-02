import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
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
  deleteEquipmentTemperatureReading,
  getEquipmentTemperatureReadings,
  updateEquipmentTemperatureReading,
  type CreateEquipmentTemperatureReadingPayload,
  type UpdateEquipmentTemperatureReadingPayload,
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
  | 'liquidLineTemperature'
  | 'evaporationTemperature'
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

type ChartMetricOption = {
  value: ChartMetric;
  label: string;
  shortLabel: string;
  unit: string;
};

type ChartDataItem = {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  count: number;
  timestamp: number;
};

type ChartStats = {
  latest: ChartDataItem;
  previous: ChartDataItem | null;
  average: number;
  minimum: number;
  maximum: number;
  totalMeasurements: number;
  totalPoints: number;
};

type ChartTooltipPayload = {
  value?: number | string;
  payload?: ChartDataItem;
};

type ChartTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: ChartTooltipPayload[];
  metric: ChartMetric;
};

type ActiveFilterItem = {
  label: string;
  value: string;
};

type ActiveFilterOptions = {
  companyId: string;
  companyName?: string;
  roomId: string;
  roomName?: string;
  equipmentId: string;
  equipmentName?: string;
  userId: string;
  userName?: string;
  startDate: string;
  endDate: string;
  search: string;
};

const chartMetricOptions: ChartMetricOption[] = [
  {
    value: 'temperature',
    label: 'Temperatura do equipamento',
    shortLabel: 'Temperatura',
    unit: '°C',
  },
  {
    value: 'dischargePressure',
    label: 'Pressão de descarga',
    shortLabel: 'Descarga',
    unit: 'psi',
  },
  {
    value: 'suctionPressure',
    label: 'Pressão de sucção',
    shortLabel: 'Sucção',
    unit: 'psi',
  },
  {
    value: 'liquidLineTemperature',
    label: 'Temperatura da linha de líquido',
    shortLabel: 'Linha líquido',
    unit: '°C',
  },
  {
    value: 'evaporationTemperature',
    label: 'Temperatura de evaporação',
    shortLabel: 'Evaporação',
    unit: '°C',
  },
  {
    value: 'superheating',
    label: 'Superaquecimento',
    shortLabel: 'Super',
    unit: '°C',
  },
  {
    value: 'subcooling',
    label: 'Subresfriamento',
    shortLabel: 'Sub',
    unit: '°C',
  },
  {
    value: 'airFlow',
    label: 'Vazão de ar',
    shortLabel: 'Vazão',
    unit: 'm³/h',
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
  const [editingReading, setEditingReading] =
    useState<EquipmentTemperatureReading | null>(null);
  const [formData, setFormData] =
    useState<EquipmentTemperatureReadingFormData>(emptyFormData);

  const canCreateMeasurement = user?.role !== 'CLIENT_USER';
  const canManageMeasurement = user?.role === 'MASTER_ADMIN';

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

  async function handleApplyFilters() {
    await loadData();
  }

  async function handleClearFilters() {
    const range = getChartDateRange('THIRTY_DAYS');

    setSelectedCompanyId('');
    setSelectedRoomId('');
    setSelectedEquipmentId('');
    setSelectedCreatedByUserId('');
    setSelectedChartEquipmentId('');
    setChartMetric('temperature');
    setChartPeriod('THIRTY_DAYS');
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setSearch('');

    await loadData({
      companyId: '',
      roomId: '',
      equipmentId: '',
      createdByUserId: '',
      startDateValue: range.startDate,
      endDateValue: range.endDate,
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

  const chartStats = useMemo(() => getChartStats(chartData), [chartData]);

  const selectedChartEquipment = equipments.find(
    (equipment) => equipment.id === activeChartEquipmentId,
  );

  const selectedFilterCompany = companies.find(
    (company) => company.id === selectedCompanyId,
  );

  const selectedFilterRoom = rooms.find((room) => room.id === selectedRoomId);

  const selectedFilterEquipment = equipments.find(
    (equipment) => equipment.id === selectedEquipmentId,
  );

  const selectedFilterUser = users.find(
    (item) => item.id === selectedCreatedByUserId,
  );

  const selectedFilterEquipmentLabel = selectedFilterEquipment
    ? `${selectedFilterEquipment.name} — ${selectedFilterEquipment.code}`
    : undefined;

  const chartMetricConfig = getChartMetricConfig(chartMetric);

  const activeFilters = useMemo(() => {
    return buildActiveFilters({
      companyId: selectedCompanyId,
      companyName: selectedFilterCompany?.name,
      roomId: selectedRoomId,
      roomName: selectedFilterRoom?.name,
      equipmentId: selectedEquipmentId,
      equipmentName: selectedFilterEquipmentLabel,
      userId: selectedCreatedByUserId,
      userName: selectedFilterUser?.name,
      startDate,
      endDate,
      search,
    });
  }, [
    endDate,
    search,
    selectedCompanyId,
    selectedCreatedByUserId,
    selectedEquipmentId,
    selectedFilterCompany?.name,
    selectedFilterEquipmentLabel,
    selectedFilterRoom?.name,
    selectedFilterUser?.name,
    selectedRoomId,
    startDate,
  ]);

  const tableDateRangeLabel = `${formatDate(startDate)} até ${formatDate(
    endDate,
  )}`;

  const chartEquipmentLabel = selectedChartEquipment
    ? `${selectedChartEquipment.name} — ${selectedChartEquipment.code}`
    : 'Nenhum equipamento selecionado';

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

    setEditingReading(null);
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

  async function openEditForm(reading: EquipmentTemperatureReading) {
    if (!canManageMeasurement) {
      return;
    }

    setEditingReading(reading);
    setFormData({
      companyId: reading.companyId,
      equipmentId: reading.equipmentId,
      temperature: String(reading.temperature),
      dischargePressure: numberInputValue(reading.dischargePressure),
      suctionPressure: numberInputValue(reading.suctionPressure),
      liquidLineTemperature: numberInputValue(reading.liquidLineTemperature),
      evaporationTemperature: numberInputValue(reading.evaporationTemperature),
      superheating: numberInputValue(reading.superheating),
      subcooling: numberInputValue(reading.subcooling),
      airFlow: numberInputValue(reading.airFlow),
      source:
        reading.source === 'IMPORT' || reading.source === 'MANUAL'
          ? reading.source
          : 'MANUAL',
      notes: reading.notes ?? '',
      measuredAt: formatDateTimeInput(reading.measuredAt),
    });
    setFormError('');
    setIsFormOpen(true);

    try {
      const equipmentsData = await getEquipments({
        companyId: reading.companyId,
      });

      setFormEquipments(equipmentsData);
    } catch {
      setFormError('Não foi possível carregar equipamentos da empresa.');
    }
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setEditingReading(null);
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

    if (editingReading && !canManageMeasurement) {
      setFormError('Somente o administrador master pode editar medições.');
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
      if (editingReading) {
        const payload: UpdateEquipmentTemperatureReadingPayload = {
          companyId: formData.companyId,
          equipmentId: formData.equipmentId,
          temperature,
          dischargePressure: nullableNumber(formData.dischargePressure),
          suctionPressure: nullableNumber(formData.suctionPressure),
          liquidLineTemperature: nullableNumber(
            formData.liquidLineTemperature,
          ),
          evaporationTemperature: nullableNumber(
            formData.evaporationTemperature,
          ),
          superheating: nullableNumber(formData.superheating),
          subcooling: nullableNumber(formData.subcooling),
          airFlow: nullableNumber(formData.airFlow),
          source: formData.source,
          notes: nullableValue(formData.notes),
          measuredAt: optionalIsoDateTime(formData.measuredAt),
        };

        await updateEquipmentTemperatureReading(editingReading.id, payload);
      } else {
        const payload: CreateEquipmentTemperatureReadingPayload = {
          companyId: formData.companyId,
          equipmentId: formData.equipmentId,
          temperature,
          dischargePressure: optionalNumber(formData.dischargePressure),
          suctionPressure: optionalNumber(formData.suctionPressure),
          liquidLineTemperature: optionalNumber(
            formData.liquidLineTemperature,
          ),
          evaporationTemperature: optionalNumber(
            formData.evaporationTemperature,
          ),
          superheating: optionalNumber(formData.superheating),
          subcooling: optionalNumber(formData.subcooling),
          airFlow: optionalNumber(formData.airFlow),
          source: formData.source,
          notes: optionalValue(formData.notes),
          measuredAt: optionalIsoDateTime(formData.measuredAt),
        };

        await createEquipmentTemperatureReading(payload);
      }

      closeForm();
      await handleRefresh();
    } catch (requestError) {
      setFormError(getRequestErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteReading(reading: EquipmentTemperatureReading) {
    if (!canManageMeasurement) {
      return;
    }

    const confirmed = window.confirm(
      `Deseja realmente remover a medição de ${formatTemperature(
        reading.temperature,
      )} do equipamento "${
        reading.equipment?.name ?? reading.equipmentId
      }"?`,
    );

    if (!confirmed) {
      return;
    }

    setError('');

    try {
      await deleteEquipmentTemperatureReading(reading.id);
      await handleRefresh();
    } catch {
      setError('Não foi possível remover a medição do equipamento.');
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

          {canManageMeasurement ? (
            <p>
              Administrador master pode corrigir ou remover medições lançadas
              incorretamente.
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
            <h2>{chartMetricConfig.label}</h2>
            <p>
              Visualize a evolução técnica por equipamento. O gráfico agrupa
              múltiplas medições por média no período selecionado.
            </p>
          </div>

          <div className="equipment-temperature-chart-actions">
            <label>
              Equipamento
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
            </label>
          </div>
        </div>

        <div className="equipment-temperature-chart-controls">
          <div>
            <strong>Indicador</strong>

            <div className="equipment-temperature-chart-tabs">
              {chartMetricOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={chartMetric === option.value ? 'active' : ''}
                  onClick={() => setChartMetric(option.value)}
                >
                  {option.shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div>
            <strong>Período</strong>

            <div className="equipment-temperature-chart-tabs compact">
              {chartPeriodOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={chartPeriod === option.value ? 'active' : ''}
                  onClick={() => void handleChartPeriodChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedChartEquipment ? (
          <div className="equipment-temperature-chart-context">
            <div>
              <span>Equipamento selecionado</span>
              <strong>
                {selectedChartEquipment.name} — {selectedChartEquipment.code}
              </strong>
            </div>

            <div>
              <span>Fluido</span>
              <strong>
                {selectedChartEquipment.refrigerantFluid ?? 'Não informado'}
              </strong>
            </div>

            <div>
              <span>Faixa exibida</span>
              <strong>
                {formatDate(startDate)} até {formatDate(endDate)}
              </strong>
            </div>

            <div>
              <span>Unidade</span>
              <strong>{chartMetricConfig.unit}</strong>
            </div>
          </div>
        ) : null}

        {chartStats ? (
          <section className="equipment-temperature-chart-summary">
            <ChartSummaryCard
              title="Último ponto"
              value={formatMetricValue(chartStats.latest.value, chartMetric)}
              description={chartStats.latest.label}
            />
            <ChartSummaryCard
              title="Média"
              value={formatMetricValue(chartStats.average, chartMetric)}
              description={`${chartStats.totalMeasurements} medição(ões)`}
            />
            <ChartSummaryCard
              title="Mínimo"
              value={formatMetricValue(chartStats.minimum, chartMetric)}
              description="Menor valor do período"
            />
            <ChartSummaryCard
              title="Máximo"
              value={formatMetricValue(chartStats.maximum, chartMetric)}
              description="Maior valor do período"
            />
          </section>
        ) : null}

        {chartStats ? (
          <p className="equipment-temperature-chart-insight">
            {getChartTrendText(chartStats, chartMetric)}
          </p>
        ) : null}

        {chartData.length > 0 && chartStats ? (
          <div className="equipment-temperature-chart-wrapper">
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart
                data={chartData}
                margin={{
                  top: 18,
                  right: 18,
                  left: 2,
                  bottom: 8,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickMargin={10} minTickGap={18} />
                <YAxis
                  domain={getYAxisDomain(chartData)}
                  tickFormatter={(value) => compactNumber(Number(value))}
                  width={54}
                />
                <Tooltip content={<ChartTooltip metric={chartMetric} />} />
                <ReferenceLine
                  y={chartStats.average}
                  stroke="var(--color-primary-medium)"
                  strokeDasharray="4 4"
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  name={chartMetricConfig.label}
                  stroke="none"
                  fill="var(--color-primary-light)"
                  fillOpacity={0.16}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={chartMetricConfig.label}
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    strokeWidth: 2,
                    stroke: 'var(--color-primary)',
                    fill: '#ffffff',
                  }}
                  activeDot={{
                    r: 6,
                    strokeWidth: 2,
                    stroke: 'var(--color-primary-dark)',
                    fill: 'var(--color-primary-light)',
                  }}
                />
              </ComposedChart>
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
              <h2>
                {editingReading
                  ? 'Editar medição de equipamento'
                  : 'Nova medição de equipamento'}
              </h2>
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
                {isSaving
                  ? 'Salvando...'
                  : editingReading
                    ? 'Salvar correção'
                    : 'Cadastrar medição'}
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

            <button type="button" onClick={() => void handleApplyFilters()}>
              Aplicar filtros
            </button>

            <button
              type="button"
              className="equipment-temperature-readings-secondary-button"
              disabled={activeFilters.length === 0}
              onClick={() => void handleClearFilters()}
            >
              Limpar filtros
            </button>
          </div>
        </div>

        <div className="equipment-temperature-readings-filter-status">
          <article>
            <span>Período selecionado</span>
            <strong>{tableDateRangeLabel}</strong>
          </article>

          <article>
            <span>Dados carregados</span>
            <strong>{readings.length}</strong>
          </article>

          <article>
            <span>Exibidos na tabela</span>
            <strong>{filteredReadings.length}</strong>
          </article>

          <article>
            <span>Equipamento do gráfico</span>
            <strong>{chartEquipmentLabel}</strong>
          </article>
        </div>

        <div className="equipment-temperature-readings-active-filters">
          <strong>Filtros selecionados</strong>

          {activeFilters.length > 0 ? (
            <div className="equipment-temperature-readings-filter-chips">
              {activeFilters.map((filter) => (
                <span key={`${filter.label}-${filter.value}`}>
                  {filter.label}: {filter.value}
                </span>
              ))}
            </div>
          ) : (
            <span>Sem filtros adicionais. Exibindo o período padrão.</span>
          )}
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
                  {canManageMeasurement ? <th>Ações</th> : null}
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
                        <small>
                          Fluido: {reading.equipment.refrigerantFluid}
                        </small>
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

                    {canManageMeasurement ? (
                      <td>
                        <div className="equipment-temperature-reading-row-actions">
                          <button
                            type="button"
                            onClick={() => void openEditForm(reading)}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDeleteReading(reading)}
                          >
                            Remover
                          </button>
                        </div>
                      </td>
                    ) : null}
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

type ChartSummaryCardProps = {
  title: string;
  value: string;
  description: string;
};

function ChartSummaryCard({ title, value, description }: ChartSummaryCardProps) {
  return (
    <article className="equipment-temperature-chart-summary-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{description}</small>
    </article>
  );
}

function ChartTooltip({ active, payload, label, metric }: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0]?.payload;

  if (!item) {
    return null;
  }

  return (
    <div className="equipment-temperature-chart-tooltip">
      <strong>{String(label)}</strong>
      <span>Valor médio: {formatMetricValue(item.value, metric)}</span>
      <span>Mínimo: {formatMetricValue(item.minimum, metric)}</span>
      <span>Máximo: {formatMetricValue(item.maximum, metric)}</span>
      <small>{item.count} medição(ões) no ponto</small>
    </div>
  );
}

function optionalValue(value: string) {
  const normalized = value.trim();

  return normalized || undefined;
}

function nullableValue(value: string) {
  const normalized = value.trim();

  return normalized || null;
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

function nullableNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const normalized = Number(value.replace(',', '.'));

  if (Number.isNaN(normalized)) {
    return null;
  }

  return normalized;
}

function numberInputValue(value?: number | null) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
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
      minimum: roundDecimal(reading.value),
      maximum: roundDecimal(reading.value),
      count: 1,
      timestamp: reading.measuredAt.getTime(),
    }));
  }

  const groupedReadings = new Map<
    string,
    {
      label: string;
      total: number;
      minimum: number;
      maximum: number;
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
        minimum: reading.value,
        maximum: reading.value,
        count: 1,
        timestamp: bucket.timestamp,
      });

      return;
    }

    current.total += reading.value;
    current.minimum = Math.min(current.minimum, reading.value);
    current.maximum = Math.max(current.maximum, reading.value);
    current.count += 1;
  });

  return Array.from(groupedReadings.values())
    .sort((first, second) => first.timestamp - second.timestamp)
    .map((item) => ({
      label: item.label,
      value: roundDecimal(item.total / item.count),
      minimum: roundDecimal(item.minimum),
      maximum: roundDecimal(item.maximum),
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

function getChartMetricConfig(metric: ChartMetric) {
  const option = chartMetricOptions.find((item) => item.value === metric);

  return (
    option ?? {
      value: metric,
      label: metric,
      shortLabel: metric,
      unit: '',
    }
  );
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

function formatSignedMetricValue(value: number, metric: ChartMetric) {
  const prefix = value > 0 ? '+' : '';

  return `${prefix}${formatMetricValue(value, metric)}`;
}

function compactNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 1,
  }).format(value);
}

function getChartStats(data: ChartDataItem[]): ChartStats | null {
  if (data.length === 0) {
    return null;
  }

  const values = data.map((item) => item.value);
  const total = values.reduce((sum, value) => sum + value, 0);
  const latest = data[data.length - 1];
  const previous = data.length > 1 ? data[data.length - 2] : null;

  return {
    latest,
    previous,
    average: roundDecimal(total / values.length),
    minimum: roundDecimal(Math.min(...data.map((item) => item.minimum))),
    maximum: roundDecimal(Math.max(...data.map((item) => item.maximum))),
    totalMeasurements: data.reduce((sum, item) => sum + item.count, 0),
    totalPoints: data.length,
  };
}

function getYAxisDomain(data: ChartDataItem[]): [number, number] {
  const minimum = Math.min(...data.map((item) => item.minimum));
  const maximum = Math.max(...data.map((item) => item.maximum));
  const spread = maximum - minimum;
  const padding =
    spread === 0 ? Math.max(Math.abs(maximum) * 0.1, 1) : spread * 0.16;

  return [roundDecimal(minimum - padding), roundDecimal(maximum + padding)];
}

function getChartTrendText(stats: ChartStats, metric: ChartMetric) {
  if (!stats.previous) {
    return 'Ainda não há ponto anterior suficiente para comparar tendência neste período.';
  }

  const difference = roundDecimal(stats.latest.value - stats.previous.value);

  if (Math.abs(difference) < 0.05) {
    return `O último ponto ficou estável em relação ao ponto anterior: ${formatMetricValue(
      stats.latest.value,
      metric,
    )}.`;
  }

  if (difference > 0) {
    return `O último ponto subiu ${formatSignedMetricValue(
      difference,
      metric,
    )} em relação ao ponto anterior.`;
  }

  return `O último ponto caiu ${formatSignedMetricValue(
    difference,
    metric,
  )} em relação ao ponto anterior.`;
}

function buildActiveFilters(options: ActiveFilterOptions): ActiveFilterItem[] {
  const filters: ActiveFilterItem[] = [];

  if (options.companyId) {
    filters.push({
      label: 'Empresa',
      value: options.companyName ?? options.companyId,
    });
  }

  if (options.roomId) {
    filters.push({
      label: 'Sala',
      value: options.roomName ?? options.roomId,
    });
  }

  if (options.equipmentId) {
    filters.push({
      label: 'Equipamento',
      value: options.equipmentName ?? options.equipmentId,
    });
  }

  if (options.userId) {
    filters.push({
      label: 'Usuário',
      value: options.userName ?? options.userId,
    });
  }

  const normalizedSearch = options.search.trim();

  if (normalizedSearch) {
    filters.push({
      label: 'Busca',
      value: normalizedSearch,
    });
  }

  const defaultRange = getChartDateRange('THIRTY_DAYS');

  if (
    options.startDate !== defaultRange.startDate ||
    options.endDate !== defaultRange.endDate
  ) {
    filters.push({
      label: 'Período',
      value: `${formatDate(options.startDate)} até ${formatDate(
        options.endDate,
      )}`,
    });
  }

  return filters;
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

  return 'Não foi possível salvar a medição do equipamento.';
}


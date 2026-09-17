import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  DoorOpen,
  Eye,
  MapPin,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Thermometer,
  TriangleAlert,
  WifiOff,
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
  SectionCard,
  StatusBadge,
  type UiTone,
} from '../../components/ui/CryoUi';
import { useAuth } from '../../contexts/useAuth';
import { getCompanies } from '../../services/companies';
import {
  createRoom,
  getRooms,
  inactivateRoom,
  updateRoom,
  type CreateRoomPayload,
} from '../../services/rooms';
import { getTemperatureReadings } from '../../services/temperature-readings';
import type { Company } from '../../types/company';
import type { Room, ThermalStatus } from '../../types/room';
import type { TemperatureReading } from '../../types/temperature-reading';
import './Rooms.css';

type RoomFormData = {
  name: string;
  notes: string;
  companyId: string;
  minTemperature: string;
  maxTemperature: string;
  currentTemperature: string;
  mapX: string;
  mapY: string;
};

type ChartMetric = 'temperature' | 'humidity';

type ChartPeriod = 'TODAY' | 'SEVEN_DAYS' | 'THIRTY_DAYS' | 'TWELVE_MONTHS';

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
  latestSensorCode?: string | null;
  latestSource?: string | null;
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

type ActiveFilter = {
  label: string;
  value: string;
};

const emptyFormData: RoomFormData = {
  name: '',
  notes: '',
  companyId: '',
  minTemperature: '',
  maxTemperature: '',
  currentTemperature: '',
  mapX: '',
  mapY: '',
};

const chartMetricOptions: ChartMetricOption[] = [
  {
    value: 'temperature',
    label: 'Temperatura da sala',
    shortLabel: 'Temperatura',
    unit: '°C',
  },
  {
    value: 'humidity',
    label: 'Umidade da sala',
    shortLabel: 'Umidade',
    unit: '%',
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

const oneHourInMilliseconds = 60 * 60 * 1000;

export function Rooms() {
  const { user } = useAuth();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [temperatureReadings, setTemperatureReadings] = useState<
    TemperatureReading[]
  >([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [appliedCompanyId, setAppliedCompanyId] = useState('');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedChartRoomId, setSelectedChartRoomId] = useState('');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('temperature');
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('THIRTY_DAYS');
  const [chartStartDate, setChartStartDate] = useState(defaultStartDate());
  const [chartEndDate, setChartEndDate] = useState(defaultEndDate());
  const [error, setError] = useState('');
  const [chartError, setChartError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState<RoomFormData>(emptyFormData);

  const canManageRooms =
    user?.role === 'MASTER_ADMIN' || user?.role === 'SUPERVISOR';

  const activeChartRoomId = useMemo(() => {
    if (
      selectedChartRoomId &&
      rooms.some((room) => room.id === selectedChartRoomId)
    ) {
      return selectedChartRoomId;
    }

    return rooms[0]?.id ?? '';
  }, [rooms, selectedChartRoomId]);

  const selectedChartRoom = rooms.find((room) => room.id === activeChartRoomId);

  const chartMetricConfig = getChartMetricConfig(chartMetric);

  const loadTemperatureChartData = useCallback(
    async (options?: {
      companyId?: string;
      roomId?: string;
      startDateValue?: string;
      endDateValue?: string;
      silent?: boolean;
    }) => {
      const nextCompanyId = options?.companyId ?? appliedCompanyId;
      const nextRoomId = options?.roomId ?? activeChartRoomId;
      const nextStartDate = options?.startDateValue ?? chartStartDate;
      const nextEndDate = options?.endDateValue ?? chartEndDate;

      if (!nextRoomId) {
        setTemperatureReadings([]);
        return;
      }

      if (!options?.silent) {
        setIsChartLoading(true);
      }

      setChartError('');

      try {
        const readingsData = await getTemperatureReadings({
          companyId: nextCompanyId || undefined,
          roomId: nextRoomId,
          startDate: optionalStartIsoDate(nextStartDate),
          endDate: optionalEndIsoDate(nextEndDate),
        });

        setTemperatureReadings(readingsData);
      } catch {
        setChartError('Não foi possível carregar o gráfico térmico das salas.');
      } finally {
        if (!options?.silent) {
          setIsChartLoading(false);
        }
      }
    },
    [activeChartRoomId, appliedCompanyId, chartEndDate, chartStartDate],
  );

  async function loadRooms(companyId = appliedCompanyId) {
    const [companiesData, roomsData] = await Promise.all([
      getCompanies(),
      getRooms(companyId || undefined),
    ]);

    setCompanies(companiesData);
    setRooms(roomsData);

    if (
      selectedChartRoomId &&
      !roomsData.some((room) => room.id === selectedChartRoomId)
    ) {
      setSelectedChartRoomId('');
    }

    return roomsData;
  }

  async function handleRefresh() {
    setError('');
    setIsLoading(true);

    try {
      const roomsData = await loadRooms(appliedCompanyId);
      const nextRoomId =
        selectedChartRoomId || roomsData[0]?.id || activeChartRoomId;

      await loadTemperatureChartData({
        companyId: appliedCompanyId,
        roomId: nextRoomId,
      });
    } catch {
      setError('Não foi possível carregar as salas.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    const range = getChartDateRange('THIRTY_DAYS');

    Promise.all([
      getCompanies(),
      getRooms(),
      getTemperatureReadings({
        startDate: optionalStartIsoDate(range.startDate),
        endDate: optionalEndIsoDate(range.endDate),
      }),
    ])
      .then(([companiesData, roomsData, readingsData]) => {
        if (!isMounted) {
          return;
        }

        setCompanies(companiesData);
        setRooms(roomsData);
        setTemperatureReadings(readingsData);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError('Não foi possível carregar as salas.');
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
    if (!activeChartRoomId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadTemperatureChartData({
        companyId: appliedCompanyId,
        roomId: activeChartRoomId,
        startDateValue: chartStartDate,
        endDateValue: chartEndDate,
        silent: true,
      });
    }, oneHourInMilliseconds);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    activeChartRoomId,
    appliedCompanyId,
    chartEndDate,
    chartStartDate,
    loadTemperatureChartData,
  ]);

  const filteredRooms = useMemo(() => {
    const normalizedSearch = appliedSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return rooms;
    }

    return rooms.filter((room) => {
      return [
        room.name,
        room.notes ?? '',
        room.company?.name ?? '',
        room.status,
        room.thermalStatus,
        String(room.currentTemperature ?? ''),
        String(room.minTemperature ?? ''),
        String(room.maxTemperature ?? ''),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [rooms, appliedSearch]);

  const chartData = useMemo(() => {
    return buildChartData(
      temperatureReadings,
      activeChartRoomId,
      chartMetric,
      chartPeriod,
    );
  }, [temperatureReadings, activeChartRoomId, chartMetric, chartPeriod]);

  const chartStats = useMemo(() => getChartStats(chartData), [chartData]);

  const activeFilters = useMemo(() => {
    const filters: ActiveFilter[] = [];

    const company = companies.find((item) => item.id === appliedCompanyId);

    if (company) {
      filters.push({
        label: 'Empresa',
        value: company.name,
      });
    }

    if (appliedSearch.trim()) {
      filters.push({
        label: 'Busca',
        value: appliedSearch.trim(),
      });
    }

    filters.push({
      label: 'Período do gráfico',
      value: `${formatDate(chartStartDate)} até ${formatDate(chartEndDate)}`,
    });

    if (selectedChartRoom) {
      filters.push({
        label: 'Sala do gráfico',
        value: selectedChartRoom.name,
      });
    }

    filters.push({
      label: 'Indicador',
      value: chartMetricConfig.shortLabel,
    });

    return filters;
  }, [
    appliedCompanyId,
    appliedSearch,
    chartEndDate,
    chartMetricConfig.shortLabel,
    chartStartDate,
    companies,
    selectedChartRoom,
  ]);

  const activeListFilterCount =
    (appliedCompanyId ? 1 : 0) + (appliedSearch.trim() ? 1 : 0);

  const normalRooms = rooms.filter(
    (room) => room.thermalStatus === 'NORMAL',
  ).length;

  const warningRooms = rooms.filter(
    (room) => room.thermalStatus === 'WARNING',
  ).length;

  const criticalRooms = rooms.filter(
    (room) => room.thermalStatus === 'CRITICAL',
  ).length;

  const offlineRooms = rooms.filter(
    (room) => room.thermalStatus === 'OFFLINE',
  ).length;

  const roomsWithTemperature = rooms.filter(
    (room) =>
      room.currentTemperature !== null && room.currentTemperature !== undefined,
  ).length;

  function openCreateForm() {
    if (!canManageRooms) {
      return;
    }

    setEditingRoom(null);
    setFormData({
      ...emptyFormData,
      companyId: appliedCompanyId,
    });
    setFormError('');
    setIsFormOpen(true);
  }

  function openEditForm(room: Room) {
    if (!canManageRooms) {
      return;
    }

    setEditingRoom(room);
    setFormData({
      name: room.name,
      notes: room.notes ?? '',
      companyId: room.companyId,
      minTemperature: formatNumberForInput(room.minTemperature),
      maxTemperature: formatNumberForInput(room.maxTemperature),
      currentTemperature: formatNumberForInput(room.currentTemperature),
      mapX: formatNumberForInput(room.mapX),
      mapY: formatNumberForInput(room.mapY),
    });
    setFormError('');
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setEditingRoom(null);
    setFormData(emptyFormData);
    setFormError('');
  }

  function updateFormField(field: keyof RoomFormData, value: string) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageRooms) {
      setFormError('Você não tem permissão para alterar salas.');
      return;
    }

    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Informe o nome da sala.');
      return;
    }

    if (!formData.companyId) {
      setFormError('Selecione a empresa da sala.');
      return;
    }

    const minTemperature = optionalNumber(formData.minTemperature);
    const maxTemperature = optionalNumber(formData.maxTemperature);
    const currentTemperature = optionalNumber(formData.currentTemperature);
    const mapX = optionalNumber(formData.mapX);
    const mapY = optionalNumber(formData.mapY);

    if (
      minTemperature !== undefined &&
      maxTemperature !== undefined &&
      minTemperature > maxTemperature
    ) {
      setFormError('A temperatura mínima não pode ser maior que a máxima.');
      return;
    }

    const payload: CreateRoomPayload = {
      name: formData.name.trim(),
      companyId: formData.companyId,
      notes: optionalValue(formData.notes),
      minTemperature,
      maxTemperature,
      currentTemperature,
      mapX,
      mapY,
    };

    setIsSaving(true);

    try {
      if (editingRoom) {
        await updateRoom(editingRoom.id, payload);
      } else {
        await createRoom(payload);
      }

      closeForm();
      await handleRefresh();
    } catch (requestError) {
      setFormError(getRequestErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleInactivate(room: Room) {
    if (!canManageRooms) {
      return;
    }

    const confirmed = window.confirm(
      `Deseja realmente inativar a sala "${room.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await inactivateRoom(room.id);
      await handleRefresh();
    } catch {
      setError('Não foi possível inativar a sala.');
    }
  }

  async function handleApplyFilters() {
    setError('');
    setAppliedCompanyId(selectedCompanyId);
    setAppliedSearch(search);
    setIsLoading(true);

    try {
      const roomsData = await loadRooms(selectedCompanyId);
      const nextRoomId =
        selectedChartRoomId && roomsData.some((room) => room.id === selectedChartRoomId)
          ? selectedChartRoomId
          : roomsData[0]?.id || '';

      if (!nextRoomId) {
        setSelectedChartRoomId('');
      }

      await loadTemperatureChartData({
        companyId: selectedCompanyId,
        roomId: nextRoomId,
      });
    } catch {
      setError('Não foi possível aplicar os filtros de salas.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleClearFilters() {
    const range = getChartDateRange('THIRTY_DAYS');

    setSelectedCompanyId('');
    setAppliedCompanyId('');
    setSearch('');
    setAppliedSearch('');
    setSelectedChartRoomId('');
    setChartMetric('temperature');
    setChartPeriod('THIRTY_DAYS');
    setChartStartDate(range.startDate);
    setChartEndDate(range.endDate);

    setError('');
    setIsLoading(true);

    try {
      const roomsData = await loadRooms('');
      const nextRoomId = roomsData[0]?.id || '';

      await loadTemperatureChartData({
        companyId: '',
        roomId: nextRoomId,
        startDateValue: range.startDate,
        endDateValue: range.endDate,
      });
    } catch {
      setError('Não foi possível limpar os filtros.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleChartRoomChange(roomId: string) {
    setSelectedChartRoomId(roomId);

    await loadTemperatureChartData({
      roomId,
    });
  }

  async function handleChartPeriodChange(period: ChartPeriod) {
    const range = getChartDateRange(period);

    setChartPeriod(period);
    setChartStartDate(range.startDate);
    setChartEndDate(range.endDate);

    await loadTemperatureChartData({
      startDateValue: range.startDate,
      endDateValue: range.endDate,
    });
  }

  if (isLoading) {
    return (
      <LoadingState
        title="Carregando salas"
        description="Buscando salas, status térmico e leituras recentes."
      />
    );
  }

  const monitoringTone: UiTone =
    criticalRooms > 0 ? 'danger' : warningRooms > 0 ? 'warning' : 'success';

  return (
    <div className="rooms-page">
      <PageHeader
        eyebrow="Cadastros"
        title="Salas"
        description="Visualize os ambientes monitorados pelo CryoMap, acompanhe a condição térmica e consulte o histórico de temperatura e umidade."
        icon={DoorOpen}
        actions={
          canManageRooms ? (
            <ActionButton
              type="button"
              icon={Plus}
              variant="primary"
              onClick={openCreateForm}
            >
              Nova sala
            </ActionButton>
          ) : undefined
        }
        meta={
          <>
            <MetaPill icon={Building2}>{rooms.length} sala(s)</MetaPill>

            <MetaPill
              icon={criticalRooms > 0 ? TriangleAlert : CheckCircle2}
              tone={monitoringTone}
            >
              {criticalRooms > 0
                ? `${criticalRooms} crítica(s)`
                : warningRooms > 0
                  ? `${warningRooms} em atenção`
                  : 'Monitoramento normal'}
            </MetaPill>

            <MetaPill icon={ShieldCheck}>
              {canManageRooms ? 'Gestão habilitada' : 'Somente consulta'}
            </MetaPill>
          </>
        }
      />

      {!canManageRooms ? (
        <InlineNotice
          tone="info"
          icon={Eye}
          title="Modo de consulta"
          description="Alterações cadastrais de salas ficam restritas ao Master Admin e Supervisor."
        />
      ) : null}

      <CollapsibleSection
        title="Resumo das salas"
        openDescription="Indicadores gerais das salas estão visíveis."
        closedDescription="Indicadores gerais estão ocultos para liberar espaço na tela."
        openLabel="Ocultar resumo"
        closedLabel="Mostrar resumo"
        storageKey="cryomap.rooms.summary-open"
        defaultOpen
        defaultOpenOnMobile={false}
        className="rooms-summary-disclosure"
        contentClassName="rooms-summary"
        variant="section"
      >
        <MetricCard
          label="Total"
          value={rooms.length}
          detail="Salas carregadas"
          icon={DoorOpen}
          tone="info"
        />

        <MetricCard
          label="Com temperatura"
          value={roomsWithTemperature}
          detail="Com valor atual disponível"
          icon={Thermometer}
          tone="info"
        />

        <MetricCard
          label="Normal"
          value={normalRooms}
          detail="Dentro da condição esperada"
          icon={CheckCircle2}
          tone="success"
        />

        <MetricCard
          label="Atenção"
          value={warningRooms}
          detail="Requer acompanhamento"
          icon={TriangleAlert}
          tone={warningRooms > 0 ? 'warning' : 'neutral'}
        />

        <MetricCard
          label="Críticas"
          value={criticalRooms}
          detail="Fora da condição térmica"
          icon={CircleAlert}
          tone={criticalRooms > 0 ? 'danger' : 'success'}
        />

        <MetricCard
          label="Offline"
          value={offlineRooms}
          detail="Sem condição térmica ativa"
          icon={WifiOff}
          tone="neutral"
        />
      </CollapsibleSection>

      <SectionCard
        eyebrow="Gráfico térmico"
        title={chartMetricConfig.label}
        description="Acompanhe a evolução térmica da sala selecionada. O gráfico é recarregado automaticamente a cada 1 hora para reduzir carga no sistema."
        icon={Activity}
        className="rooms-temperature-chart-panel"
        action={
          <label className="rooms-temperature-chart-room">
            <span>Sala</span>
            <select
              value={activeChartRoomId}
              onChange={(event) =>
                void handleChartRoomChange(event.target.value)
              }
            >
              <option value="">Selecione uma sala</option>

              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} — {room.company?.name ?? room.companyId}
                </option>
              ))}
            </select>
          </label>
        }
      >
        <div className="rooms-temperature-chart-controls">
          <div>
            <strong>Indicador</strong>

            <div className="rooms-temperature-chart-tabs">
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

            <div className="rooms-temperature-chart-tabs compact">
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

        {selectedChartRoom ? (
          <div className="rooms-temperature-chart-context">
            <div>
              <span>Sala selecionada</span>
              <strong>{selectedChartRoom.name}</strong>
            </div>

            <div>
              <span>Empresa</span>
              <strong>
                {selectedChartRoom.company?.name ?? selectedChartRoom.companyId}
              </strong>
            </div>

            <div>
              <span>Faixa exibida</span>
              <strong>
                {formatDate(chartStartDate)} até {formatDate(chartEndDate)}
              </strong>
            </div>

            <div>
              <span>Unidade</span>
              <strong>{chartMetricConfig.unit}</strong>
            </div>
          </div>
        ) : null}

        {chartStats ? (
          <section className="rooms-temperature-chart-summary">
            <MetricCard
              label="Último ponto"
              value={formatMetricValue(chartStats.latest.value, chartMetric)}
              detail={chartStats.latest.label}
              icon={Clock3}
              tone="info"
            />

            <MetricCard
              label="Média"
              value={formatMetricValue(chartStats.average, chartMetric)}
              detail={`${chartStats.totalMeasurements} leitura(s)`}
              icon={Activity}
              tone="info"
            />

            <MetricCard
              label="Mínimo"
              value={formatMetricValue(chartStats.minimum, chartMetric)}
              detail="Menor valor do período"
              icon={ArrowDown}
              tone="success"
            />

            <MetricCard
              label="Máximo"
              value={formatMetricValue(chartStats.maximum, chartMetric)}
              detail="Maior valor do período"
              icon={ArrowUp}
              tone="warning"
            />
          </section>
        ) : null}

        {chartStats ? (
          <InlineNotice
            tone="info"
            icon={Activity}
            title="Tendência do período"
            description={getChartTrendText(chartStats, chartMetric)}
          />
        ) : null}

        {chartError ? (
          <InlineNotice
            tone="danger"
            icon={TriangleAlert}
            title={chartError}
            description="Tente carregar novamente as leituras da sala selecionada."
            action={
              <ActionButton
                type="button"
                icon={RefreshCw}
                variant="danger"
                onClick={() => void loadTemperatureChartData()}
              >
                Tentar novamente
              </ActionButton>
            }
          />
        ) : null}

        {isChartLoading ? (
          <LoadingState
            title="Carregando gráfico"
            description="Buscando leituras térmicas da sala selecionada."
          />
        ) : null}

        {!isChartLoading && !chartError && chartData.length > 0 && chartStats ? (
          <div className="rooms-temperature-chart-wrapper">
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
        ) : null}

        {!isChartLoading && !chartError && chartData.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Sem dados para o gráfico"
            description="Selecione outra sala, período ou indicador para visualizar leituras."
          />
        ) : null}
      </SectionCard>

      {isFormOpen && canManageRooms ? (
        <section className="room-form-panel">
          <div className="room-form-header">
            <div>
              <span>Sala</span>
              <h2>{editingRoom ? 'Editar sala' : 'Nova sala'}</h2>
              <p>
                Configure identificação, faixa térmica e posição do ambiente.
              </p>
            </div>

            <ActionButton type="button" variant="ghost" onClick={closeForm}>
              Fechar
            </ActionButton>
          </div>

          <form className="room-form" onSubmit={handleSubmit}>
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
              Nome *
              <input
                value={formData.name}
                onChange={(event) =>
                  updateFormField('name', event.target.value)
                }
                placeholder="Ex: Câmara Fria 01"
              />
            </label>

            <label className="room-form-wide">
              Descrição
              <input
                value={formData.notes}
                onChange={(event) =>
                  updateFormField('notes', event.target.value)
                }
                placeholder="Ex: Câmara de congelados do setor A"
              />
            </label>

            <label>
              Temperatura mínima °C
              <input
                type="number"
                step="0.1"
                value={formData.minTemperature}
                onChange={(event) =>
                  updateFormField('minTemperature', event.target.value)
                }
                placeholder="-18"
              />
            </label>

            <label>
              Temperatura máxima °C
              <input
                type="number"
                step="0.1"
                value={formData.maxTemperature}
                onChange={(event) =>
                  updateFormField('maxTemperature', event.target.value)
                }
                placeholder="-12"
              />
            </label>

            <label>
              Temperatura atual °C
              <input
                type="number"
                step="0.1"
                value={formData.currentTemperature}
                onChange={(event) =>
                  updateFormField('currentTemperature', event.target.value)
                }
                placeholder="-15"
              />
            </label>

            <label>
              Posição X no mapa
              <input
                type="number"
                step="0.01"
                value={formData.mapX}
                onChange={(event) =>
                  updateFormField('mapX', event.target.value)
                }
                placeholder="0.25"
              />
            </label>

            <label>
              Posição Y no mapa
              <input
                type="number"
                step="0.01"
                value={formData.mapY}
                onChange={(event) =>
                  updateFormField('mapY', event.target.value)
                }
                placeholder="0.50"
              />
            </label>

            {formError ? (
              <strong className="room-form-error">{formError}</strong>
            ) : null}

            <div className="room-form-actions">
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
                  : editingRoom
                    ? 'Salvar alterações'
                    : 'Cadastrar sala'}
              </ActionButton>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rooms-panel">
        <div className="rooms-panel-header">
          <div>
            <span>Ambientes cadastrados</span>
            <h2>Lista de salas</h2>
            <p>
              {filteredRooms.length} registro(s) exibido(s) de {rooms.length}{' '}
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
          openDescription="Ajuste os filtros para refinar a lista de salas."
          closedDescription={
            activeListFilterCount > 0
              ? `${activeListFilterCount} filtro(s) ativo(s) na lista.`
              : 'Nenhum filtro específico aplicado à lista.'
          }
          openLabel="Ocultar filtros"
          closedLabel="Filtros"
          storageKey="cryomap.rooms.filters-open"
          defaultOpen={false}
          defaultOpenOnMobile={false}
          count={activeListFilterCount}
          className="rooms-filters-disclosure"
          contentClassName="rooms-filter-area"
          variant="toolbar"
        >
          <div className="rooms-actions">
            <label className="rooms-filter-field">
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

            <label className="rooms-filter-field rooms-search-field">
              <span>
                <Search size={13} strokeWidth={2.1} aria-hidden="true" />
                Busca
              </span>
              <input
                type="search"
                placeholder="Buscar por sala, empresa, status..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <div className="rooms-action-buttons">
              <ActionButton
                type="button"
                icon={RefreshCw}
                variant="primary"
                onClick={() => void handleApplyFilters()}
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

        <div className="rooms-filter-status">
          <div>
            <strong>Filtros ativos</strong>
            <span>
              Lista e gráfico usam a empresa aplicada. O gráfico também considera
              sala, período e indicador selecionados.
            </span>
          </div>

          <div className="rooms-filter-chips">
            {activeFilters.map((filter) => (
              <span key={`${filter.label}-${filter.value}`}>
                {filter.label}: <strong>{filter.value}</strong>
              </span>
            ))}
          </div>
        </div>

        {error ? (
          <InlineNotice
            tone="danger"
            icon={TriangleAlert}
            title={error}
            description="Tente recarregar as salas ou rever os filtros aplicados."
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

        {!error && filteredRooms.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="Nenhuma sala encontrada"
            description="Cadastre uma sala ou ajuste os filtros para visualizar resultados."
          />
        ) : null}

        {!error && filteredRooms.length > 0 ? (
          <>
            <div className="rooms-mobile-list">
              {filteredRooms.map((room) => (
                <RoomMobileCard
                  key={room.id}
                  room={room}
                  canManage={canManageRooms}
                  onEdit={openEditForm}
                  onInactivate={handleInactivate}
                />
              ))}
            </div>

            <div className="rooms-table-wrapper">
              <table className="rooms-table">
                <thead>
                  <tr>
                    <th>Sala</th>
                    <th>Empresa</th>
                    <th>Temperatura</th>
                    <th>Faixa</th>
                    <th>Status</th>
                    <th>Cadastro</th>
                    {canManageRooms ? <th>Ações</th> : null}
                  </tr>
                </thead>

                <tbody>
                  {filteredRooms.map((room) => (
                    <tr key={room.id}>
                      <td>
                        <div className="room-table-primary">
                          <strong>{room.name}</strong>
                          <span>{room.notes || 'Sem descrição'}</span>

                          <small>
                            <MapPin size={12} strokeWidth={2} />
                            X {formatCoordinate(room.mapX)} · Y{' '}
                            {formatCoordinate(room.mapY)}
                          </small>
                        </div>
                      </td>

                      <td>
                        <div className="room-table-company">
                          <Building2 size={14} strokeWidth={2} />
                          <span>{room.company?.name ?? room.companyId}</span>
                        </div>
                      </td>

                      <td>
                        <RoomTemperature
                          value={room.currentTemperature}
                          status={room.thermalStatus}
                        />
                      </td>

                      <td>
                        <div className="room-table-range">
                          <span>
                            Mín. {formatTemperature(room.minTemperature)}
                          </span>
                          <span>
                            Máx. {formatTemperature(room.maxTemperature)}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="room-table-statuses">
                          <RoomThermalBadge status={room.thermalStatus} />
                          <RoomRegistrationBadge status={room.status} />
                        </div>
                      </td>

                      <td>
                        <div className="room-table-created">
                          <CalendarDays size={13} strokeWidth={2} />
                          <span>{formatDateTime(room.createdAt)}</span>
                        </div>
                      </td>

                      {canManageRooms ? (
                        <td>
                          <div className="room-row-actions">
                            <button
                              type="button"
                              className="room-icon-action"
                              title="Editar sala"
                              aria-label={`Editar sala ${room.name}`}
                              onClick={() => openEditForm(room)}
                            >
                              <Pencil size={15} strokeWidth={2} />
                            </button>

                            <button
                              type="button"
                              className="room-icon-action room-icon-action--danger"
                              title="Inativar sala"
                              aria-label={`Inativar sala ${room.name}`}
                              disabled={room.status === 'INACTIVE'}
                              onClick={() => void handleInactivate(room)}
                            >
                              <Power size={15} strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      ) : null}
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

type RoomMobileCardProps = {
  room: Room;
  canManage: boolean;
  onEdit: (room: Room) => void;
  onInactivate: (room: Room) => Promise<void>;
};

function RoomMobileCard({
  room,
  canManage,
  onEdit,
  onInactivate,
}: RoomMobileCardProps) {
  return (
    <article
      className={`room-mobile-card room-mobile-card--${room.thermalStatus.toLowerCase()}`}
    >
      <div className="room-mobile-card-header">
        <div>
          <span>{room.company?.name ?? room.companyId}</span>
          <strong>{room.name}</strong>
          {room.notes ? <small>{room.notes}</small> : null}
        </div>

        <RoomThermalBadge status={room.thermalStatus} />
      </div>

      <div className="room-mobile-card-temperature">
        <span>Temperatura atual</span>
        <strong>{formatTemperature(room.currentTemperature)}</strong>
      </div>

      <div className="room-mobile-card-meta">
        <div>
          <span>Faixa configurada</span>
          <strong>
            {formatTemperature(room.minTemperature)} até{' '}
            {formatTemperature(room.maxTemperature)}
          </strong>
        </div>

        <div>
          <span>Cadastro</span>
          <RoomRegistrationBadge status={room.status} />
        </div>

        <div>
          <span>Mapa</span>
          <strong>
            X {formatCoordinate(room.mapX)} · Y {formatCoordinate(room.mapY)}
          </strong>
        </div>

        <div>
          <span>Criada em</span>
          <strong>{formatDateTime(room.createdAt)}</strong>
        </div>
      </div>

      {canManage ? (
        <div className="room-mobile-card-actions">
          <ActionButton
            type="button"
            icon={Pencil}
            variant="secondary"
            onClick={() => onEdit(room)}
          >
            Editar
          </ActionButton>

          <ActionButton
            type="button"
            icon={Power}
            variant="danger"
            disabled={room.status === 'INACTIVE'}
            onClick={() => void onInactivate(room)}
          >
            Inativar
          </ActionButton>
        </div>
      ) : null}
    </article>
  );
}

type RoomTemperatureProps = {
  value?: number | null;
  status: ThermalStatus;
};

function RoomTemperature({ value, status }: RoomTemperatureProps) {
  return (
    <span
      className={`room-temperature room-temperature--${status.toLowerCase()}`}
    >
      <Thermometer size={15} strokeWidth={2.1} />
      {formatTemperature(value)}
    </span>
  );
}

type RoomThermalBadgeProps = {
  status: ThermalStatus;
};

function RoomThermalBadge({ status }: RoomThermalBadgeProps) {
  const labels: Record<ThermalStatus, string> = {
    NORMAL: 'Normal',
    WARNING: 'Atenção',
    CRITICAL: 'Crítica',
    OFFLINE: 'Offline',
  };

  return (
    <StatusBadge tone={getThermalTone(status)}>
      {labels[status]}
    </StatusBadge>
  );
}

function getThermalTone(status: ThermalStatus): UiTone {
  if (status === 'NORMAL') {
    return 'success';
  }

  if (status === 'WARNING') {
    return 'warning';
  }

  if (status === 'CRITICAL') {
    return 'danger';
  }

  return 'neutral';
}

type RoomRegistrationBadgeProps = {
  status: Room['status'];
};

function RoomRegistrationBadge({ status }: RoomRegistrationBadgeProps) {
  return (
    <StatusBadge tone={status === 'ACTIVE' ? 'success' : 'neutral'}>
      {status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
    </StatusBadge>
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
    <div className="rooms-temperature-chart-tooltip">
      <strong>{String(label)}</strong>
      <span>Valor médio: {formatMetricValue(item.value, metric)}</span>
      <span>Mínimo: {formatMetricValue(item.minimum, metric)}</span>
      <span>Máximo: {formatMetricValue(item.maximum, metric)}</span>
      <small>{item.count} leitura(s) no ponto</small>

      {item.latestSensorCode ? (
        <small>Último sensor: {item.latestSensorCode}</small>
      ) : null}

      {item.latestSource ? (
        <small>Origem: {formatSource(item.latestSource)}</small>
      ) : null}
    </div>
  );
}

function buildChartData(
  readings: TemperatureReading[],
  roomId: string,
  metric: ChartMetric,
  period: ChartPeriod,
): ChartDataItem[] {
  if (!roomId) {
    return [];
  }

  const range = getChartDateRange(period);
  const start = new Date(`${range.startDate}T00:00:00`);
  const end = new Date(`${range.endDate}T23:59:59`);

  const validReadings = readings
    .map((reading) => {
      const readAt = new Date(reading.readAt);
      const value = reading[metric];

      if (
        reading.roomId !== roomId ||
        Number.isNaN(readAt.getTime()) ||
        readAt < start ||
        readAt > end ||
        typeof value !== 'number'
      ) {
        return null;
      }

      return {
        readAt,
        value,
        sensorCode: reading.sensor?.code ?? null,
        source: reading.source ?? null,
      };
    })
    .filter(
      (
        reading,
      ): reading is {
        readAt: Date;
        value: number;
        sensorCode: string | null;
        source: string | null;
      } => reading !== null,
    )
    .sort((first, second) => first.readAt.getTime() - second.readAt.getTime());

  if (period === 'TODAY') {
    return validReadings.map((reading) => ({
      label: reading.readAt.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      value: roundDecimal(reading.value),
      minimum: roundDecimal(reading.value),
      maximum: roundDecimal(reading.value),
      count: 1,
      timestamp: reading.readAt.getTime(),
      latestSensorCode: reading.sensorCode,
      latestSource: reading.source,
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
      latestTimestamp: number;
      latestSensorCode?: string | null;
      latestSource?: string | null;
    }
  >();

  validReadings.forEach((reading) => {
    const bucket = getChartBucket(reading.readAt, period);
    const current = groupedReadings.get(bucket.key);
    const readingTimestamp = reading.readAt.getTime();

    if (!current) {
      groupedReadings.set(bucket.key, {
        label: bucket.label,
        total: reading.value,
        minimum: reading.value,
        maximum: reading.value,
        count: 1,
        timestamp: bucket.timestamp,
        latestTimestamp: readingTimestamp,
        latestSensorCode: reading.sensorCode,
        latestSource: reading.source,
      });

      return;
    }

    current.total += reading.value;
    current.minimum = Math.min(current.minimum, reading.value);
    current.maximum = Math.max(current.maximum, reading.value);
    current.count += 1;

    if (readingTimestamp >= current.latestTimestamp) {
      current.latestTimestamp = readingTimestamp;
      current.latestSensorCode = reading.sensorCode;
      current.latestSource = reading.source;
    }
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
      latestSensorCode: item.latestSensorCode,
      latestSource: item.latestSource,
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

function formatSignedMetricValue(value: number, metric: ChartMetric) {
  const prefix = value > 0 ? '+' : '';

  return `${prefix}${formatMetricValue(value, metric)}`;
}

function formatMetricValue(value: number, metric: ChartMetric) {
  if (metric === 'humidity') {
    return formatHumidity(value);
  }

  return formatTemperature(value);
}

function compactNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 1,
  }).format(value);
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
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)} %`;
}

function formatCoordinate(value?: number | null) {
  if (value === null || value === undefined) {
    return '-';
  }

  return Number(value).toFixed(2);
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

function formatNumberForInput(value?: number | null) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

function formatSource(value?: string | null) {
  const labels: Record<string, string> = {
    MANUAL: 'Manual',
    SENSOR: 'Sensor',
    IMPORT: 'Importação',
    API: 'API',
  };

  return labels[value ?? ''] ?? value ?? '-';
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

  return 'Não foi possível salvar a sala.';
}

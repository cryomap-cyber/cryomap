import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock3,
  Database,
  DoorOpen,
  Droplets,
  Gauge,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Snowflake,
  Thermometer,
  TriangleAlert,
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

type TemperatureReadingFormData = {
  companyId: string;
  roomId: string;
  sensorId: string;
  temperature: string;
  humidity: string;
  readAt: string;
  source: string;
};

type ActiveFilter = {
  label: string;
  value: string;
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

  async function handleClearFilters() {
    const nextStartDate = defaultStartDate();
    const nextEndDate = defaultEndDate();

    setSelectedCompanyId('');
    setSelectedRoomId('');
    setSelectedSensorId('');
    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
    setSearch('');
    setError('');
    setIsLoading(true);

    try {
      const [companiesData, roomsData, sensorsData, readingsData] =
        await Promise.all([
          getCompanies(),
          getRooms(),
          getSensors(),
          getTemperatureReadings({
            startDate: optionalStartIsoDate(nextStartDate),
            endDate: optionalEndIsoDate(nextEndDate),
          }),
        ]);

      setCompanies(companiesData);
      setRooms(roomsData);
      setSensors(sensorsData);
      setTemperatureReadings(readingsData);
    } catch {
      setError('Não foi possível limpar os filtros de leitura.');
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

        const shouldResetRoom =
          formData.roomId &&
          !roomsData.some((room) => room.id === formData.roomId);

        const shouldResetSensor =
          formData.sensorId &&
          !sensorsData.some((sensor) => sensor.id === formData.sensorId);

        if (shouldResetRoom || shouldResetSensor) {
          setFormData((current) => ({
            ...current,
            roomId: shouldResetRoom ? '' : current.roomId,
            sensorId:
              shouldResetRoom || shouldResetSensor ? '' : current.sensorId,
          }));
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

    filters.push({
      label: 'Período',
      value: `${formatDate(startDate)} até ${formatDate(endDate)}`,
    });

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
    sensors,
    startDate,
  ]);

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

  const hasCriticalTemperature = temperatureReadings.some((reading) =>
    isTemperatureOutsideLimits(
      reading.temperature,
      reading.room?.minTemperature,
      reading.room?.maxTemperature,
    ),
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
        title="Carregando leituras"
        description="Buscando histórico térmico das salas monitoradas."
      />
    );
  }

  return (
    <div className="temperature-readings-page">
      <PageHeader
        eyebrow="Monitoramento"
        title="Leituras de temperatura"
        description="Consulte temperatura e umidade das salas monitoradas por sensores, integrações ou registros manuais."
        icon={Thermometer}
        actions={
          <ActionButton
            type="button"
            icon={Plus}
            variant="primary"
            onClick={openCreateForm}
          >
            Nova leitura manual
          </ActionButton>
        }
        meta={
          <>
            <MetaPill icon={Clock3}>
              {formatDate(startDate)} até {formatDate(endDate)}
            </MetaPill>

            <MetaPill icon={Database}>
              {temperatureReadings.length} leituras
            </MetaPill>

            <MetaPill
              icon={hasCriticalTemperature ? TriangleAlert : CheckCircle2}
              tone={hasCriticalTemperature ? 'danger' : 'success'}
            >
              {hasCriticalTemperature
                ? 'Há leituras fora do limite'
                : 'Sem leituras fora do limite'}
            </MetaPill>
          </>
        }
      />

      <CollapsibleSection
        title="Resumo das leituras"
        openDescription="Indicadores térmicos do período selecionado estão visíveis."
        closedDescription="Indicadores térmicos estão ocultos para liberar espaço na tela."
        openLabel="Ocultar resumo"
        closedLabel="Mostrar resumo"
        storageKey="cryomap.temperature-readings.summary-open"
        defaultOpen
        defaultOpenOnMobile={false}
        className="temperature-readings-summary-disclosure"
        contentClassName="temperature-readings-summary"
        variant="section"
      >
        <MetricCard
          label="Total de leituras"
          value={temperatureReadings.length}
          detail="Registros no período atual"
          icon={Database}
          tone="info"
        />

        <MetricCard
          label="Temperatura média"
          value={formatTemperature(averageTemperature)}
          detail="Média das leituras carregadas"
          icon={Thermometer}
          tone="info"
        />

        <MetricCard
          label="Temperatura mínima"
          value={formatTemperature(minimumTemperature)}
          detail="Menor valor registrado"
          icon={Snowflake}
          tone="info"
        />

        <MetricCard
          label="Temperatura máxima"
          value={formatTemperature(maximumTemperature)}
          detail={
            hasCriticalTemperature
              ? 'Há leitura fora do limite configurado'
              : 'Sem extrapolação identificada'
          }
          icon={Gauge}
          tone={hasCriticalTemperature ? 'danger' : 'success'}
        />

        <MetricCard
          label="Umidade média"
          value={formatHumidity(averageHumidity)}
          detail={`${readingsWithHumidity.length} leitura(s) com umidade`}
          icon={Droplets}
          tone="info"
        />
      </CollapsibleSection>

      {isFormOpen ? (
        <section className="temperature-reading-form-panel">
          <div className="temperature-reading-form-header">
            <div>
              <span>Leitura manual</span>
              <h2>Nova leitura de temperatura</h2>
              <p>
                Registre uma medição de contingência ou uma leitura coletada
                manualmente em campo.
              </p>
            </div>

            <ActionButton
              type="button"
              variant="ghost"
              onClick={closeForm}
            >
              Fechar
            </ActionButton>
          </div>

          <div className="temperature-reading-form-tip">
            <Thermometer size={18} strokeWidth={2.1} aria-hidden="true" />

            <div>
              <strong>Uso sem sensor ativo</strong>
              <p>
                Para alimentar o histórico da sala, selecione empresa e sala,
                deixe o sensor vazio e mantenha a origem como MANUAL.
              </p>
            </div>
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
                placeholder="Ex: -18.5"
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
                placeholder="Ex: 72"
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

            <label className="temperature-reading-form-wide">
              Origem
              <input
                type="text"
                list="temperature-reading-source-options"
                value={formData.source}
                onChange={(event) =>
                  updateFormField('source', event.target.value)
                }
                placeholder="MANUAL, SENSOR, API..."
              />

              <datalist id="temperature-reading-source-options">
                <option value="MANUAL" />
                <option value="SENSOR" />
                <option value="API" />
                <option value="IMPORT" />
                <option value="GOVEE" />
                <option value="MQTT" />
              </datalist>
            </label>

            {formError ? (
              <strong className="temperature-reading-form-error">
                {formError}
              </strong>
            ) : null}

            <div className="temperature-reading-form-actions">
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
                {isSaving ? 'Salvando...' : 'Cadastrar leitura'}
              </ActionButton>
            </div>
          </form>
        </section>
      ) : null}

      <section className="temperature-readings-panel">
        <div className="temperature-readings-panel-header">
          <div>
            <span>Histórico térmico</span>
            <h2>Leituras registradas</h2>
            <p>
              {filteredReadings.length} leitura(s) exibida(s) de{' '}
              {temperatureReadings.length} carregada(s)
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
          openDescription="Ajuste empresa, sala, sensor, período e busca para refinar o histórico."
          closedDescription={`${activeFilters.length} filtro(s) ativo(s).`}
          openLabel="Ocultar filtros"
          closedLabel="Filtros"
          storageKey="cryomap.temperature-readings.filters-open"
          defaultOpen={false}
          defaultOpenOnMobile={false}
          count={activeFilters.length}
          className="temperature-readings-filters-disclosure"
          contentClassName="temperature-readings-filter-area"
          variant="toolbar"
        >
          <div className="temperature-readings-actions">
            <label className="temperature-readings-filter-field">
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

            <label className="temperature-readings-filter-field">
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

            <label className="temperature-readings-filter-field">
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

            <label className="temperature-readings-filter-field">
              <span>Início</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>

            <label className="temperature-readings-filter-field">
              <span>Fim</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>

            <label className="temperature-readings-filter-field temperature-readings-search-field">
              <span>
                <Search size={13} strokeWidth={2.1} aria-hidden="true" />
                Busca
              </span>

              <input
                type="search"
                placeholder="Buscar por sala, sensor, origem..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <div className="temperature-readings-action-buttons">
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

        <div className="temperature-readings-filter-status">
          <div>
            <strong>Filtros selecionados</strong>
            <span>
              Aplicar filtros recarrega o histórico. A busca textual atua nos
              registros já carregados.
            </span>
          </div>

          <div className="temperature-readings-filter-chips">
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
            description="Tente recarregar os dados do período selecionado."
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

        {!error && filteredReadings.length === 0 ? (
          <EmptyState
            icon={Thermometer}
            title="Nenhuma leitura encontrada"
            description="Ajuste os filtros ou registre uma nova leitura de temperatura."
          />
        ) : null}

        {!error && filteredReadings.length > 0 ? (
          <>
            <div className="temperature-readings-mobile-list">
              {filteredReadings.map((reading) => (
                <TemperatureReadingMobileCard
                  key={reading.id}
                  reading={reading}
                />
              ))}
            </div>

            <div className="temperature-readings-table-wrapper">
              <table className="temperature-readings-table">
                <thead>
                  <tr>
                    <th>Leitura</th>
                    <th>Local</th>
                    <th>Sensor / origem</th>
                    <th>Temperatura</th>
                    <th>Umidade</th>
                    <th>Status</th>
                    <th>Observações</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredReadings.map((reading) => (
                    <tr key={reading.id}>
                      <td>
                        <div className="temperature-reading-table-primary">
                          <strong>{formatDateTime(reading.readAt)}</strong>
                          <span>{shortId(reading.id)}</span>
                        </div>
                      </td>

                      <td>
                        <div className="temperature-reading-table-location">
                          <strong>
                            {reading.room?.name ?? reading.roomId}
                          </strong>

                          <span>
                            <Building2 size={13} strokeWidth={2} />
                            {reading.company?.name ?? reading.companyId}
                          </span>

                          {hasTemperatureLimit(
                            reading.room?.minTemperature,
                            reading.room?.maxTemperature,
                          ) ? (
                            <small>
                              Faixa: {formatTemperature(reading.room?.minTemperature)}{' '}
                              até {formatTemperature(reading.room?.maxTemperature)}
                            </small>
                          ) : null}
                        </div>
                      </td>

                      <td>
                        <div className="temperature-reading-table-source">
                          <span>
                            <Radio size={13} strokeWidth={2} />
                            {reading.sensor?.code ?? 'Sem sensor'}
                          </span>

                          {reading.sensor?.location ? (
                            <small>{reading.sensor.location}</small>
                          ) : null}

                          <SourceBadge source={reading.source} />
                        </div>
                      </td>

                      <td>
                        <TemperatureBadge
                          temperature={reading.temperature}
                          minTemperature={reading.room?.minTemperature}
                          maxTemperature={reading.room?.maxTemperature}
                        />
                      </td>

                      <td>
                        <div className="temperature-reading-humidity">
                          <Droplets size={14} strokeWidth={2} />
                          <strong>{formatHumidity(reading.humidity)}</strong>
                        </div>
                      </td>

                      <td>
                        <ThermalStatusBadge
                          status={reading.room?.thermalStatus ?? null}
                        />
                      </td>

                      <td>
                        <span className="temperature-reading-notes">
                          {reading.notes || 'Sem observações'}
                        </span>
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

type TemperatureReadingMobileCardProps = {
  reading: TemperatureReading;
};

function TemperatureReadingMobileCard({
  reading,
}: TemperatureReadingMobileCardProps) {
  const outsideLimits = isTemperatureOutsideLimits(
    reading.temperature,
    reading.room?.minTemperature,
    reading.room?.maxTemperature,
  );

  return (
    <article
      className={
        outsideLimits
          ? 'temperature-reading-mobile-card is-critical'
          : 'temperature-reading-mobile-card'
      }
    >
      <div className="temperature-reading-mobile-card-header">
        <div className="temperature-reading-mobile-card-title">
          <span>{reading.company?.name ?? 'Empresa não informada'}</span>
          <strong>{reading.room?.name ?? 'Sala não informada'}</strong>
        </div>

        <ThermalStatusBadge status={reading.room?.thermalStatus ?? null} />
      </div>

      <div className="temperature-reading-mobile-card-measurement">
        <div>
          <span>Temperatura</span>
          <strong>{formatTemperature(reading.temperature)}</strong>
        </div>

        <div>
          <span>Umidade</span>
          <strong>{formatHumidity(reading.humidity)}</strong>
        </div>
      </div>

      <div className="temperature-reading-mobile-card-meta">
        <span>
          <Radio size={14} strokeWidth={2} />
          {reading.sensor?.code ?? 'Leitura sem sensor'}
        </span>

        <span>
          <Clock3 size={14} strokeWidth={2} />
          {formatDateTime(reading.readAt)}
        </span>

        <span>
          <DoorOpen size={14} strokeWidth={2} />
          {hasTemperatureLimit(
            reading.room?.minTemperature,
            reading.room?.maxTemperature,
          )
            ? `${formatTemperature(reading.room?.minTemperature)} até ${formatTemperature(reading.room?.maxTemperature)}`
            : 'Sem faixa configurada'}
        </span>

        <SourceBadge source={reading.source} />
      </div>

      {reading.notes ? (
        <p className="temperature-reading-mobile-card-notes">
          {reading.notes}
        </p>
      ) : null}
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
  const isCritical = isTemperatureOutsideLimits(
    temperature,
    minTemperature,
    maxTemperature,
  );

  return (
    <span
      className={
        isCritical
          ? 'temperature-reading-value is-critical'
          : 'temperature-reading-value'
      }
    >
      <Thermometer size={15} strokeWidth={2.1} />
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
    <StatusBadge tone={getThermalStatusTone(normalizedStatus)}>
      {labels[normalizedStatus] ?? normalizedStatus}
    </StatusBadge>
  );
}

type SourceBadgeProps = {
  source?: string | null;
};

function SourceBadge({ source }: SourceBadgeProps) {
  return (
    <StatusBadge tone={getSourceTone(source)}>
      {formatSource(source)}
    </StatusBadge>
  );
}

function getThermalStatusTone(status: string): UiTone {
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

function getSourceTone(source?: string | null): UiTone {
  if (source === 'MANUAL') {
    return 'warning';
  }

  if (source === 'SENSOR' || source === 'MQTT') {
    return 'success';
  }

  if (source === 'API' || source === 'GOVEE') {
    return 'info';
  }

  return 'neutral';
}

function isTemperatureOutsideLimits(
  temperature: number,
  minTemperature?: number | null,
  maxTemperature?: number | null,
) {
  return (
    (minTemperature !== null &&
      minTemperature !== undefined &&
      temperature < minTemperature) ||
    (maxTemperature !== null &&
      maxTemperature !== undefined &&
      temperature > maxTemperature)
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

  return toDateInputValue(date);
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

function formatHumidity(value?: number | null) {
  if (value === null || value === undefined) {
    return '-';
  }

  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function formatSource(value?: string | null) {
  const labels: Record<string, string> = {
    MANUAL: 'Manual',
    SENSOR: 'Sensor',
    IMPORT: 'Importação',
    API: 'API',
    GOVEE: 'Govee',
    MQTT: 'MQTT',
  };

  return labels[value ?? ''] ?? value ?? '-';
}

function hasTemperatureLimit(
  minTemperature?: number | null,
  maxTemperature?: number | null,
) {
  return (
    (minTemperature !== null && minTemperature !== undefined) ||
    (maxTemperature !== null && maxTemperature !== undefined)
  );
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

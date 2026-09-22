import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  Clock3,
  DoorOpen,
  FileSpreadsheet,
  FileText,
  HardHat,
  Layers3,
  RefreshCw,
  RotateCcw,
  Thermometer,
  TriangleAlert,
  UserRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import { CollapsibleSection } from '../../components/CollapsibleSection/CollapsibleSection';
import {
  ActionButton,
  EmptyState,
  InlineNotice,
  LoadingState,
  MetaPill,
  PageHeader,
  SectionCard,
  StatusBadge,
  type UiTone,
} from '../../components/ui/CryoUi';
import { getCompanies } from '../../services/companies';
import { getEquipments } from '../../services/equipments';
import {
  downloadReportFile,
  getDowntimeSummary,
  getOperationalSummary,
  getServiceRecordsSummary,
  getTasksSummary,
  getThermalReadingsSummary,
  type ReportData,
  type ReportFormat,
  type ReportType,
  type ReportsQueryParams,
} from '../../services/reports';
import { getRooms } from '../../services/rooms';
import { getUsers } from '../../services/users';
import type { Company } from '../../types/company';
import type { Equipment } from '../../types/equipment';
import type { Room } from '../../types/room';
import type { User } from '../../types/user';
import './Reports.css';




type ReportsState = {

  operationalSummary: ReportData | null;

  tasksSummary: ReportData | null;

  serviceRecordsSummary: ReportData | null;

  downtimeSummary: ReportData | null;

  thermalReadingsSummary: ReportData | null;

};



type LoadReportsOptions = {

  companyId?: string;

  roomId?: string;

  equipmentId?: string;

  technicianId?: string;

  startDateValue?: string;

  endDateValue?: string;

};



type ActiveFilter = {

  label: string;

  value: string;

};



const emptyReportsState: ReportsState = {

  operationalSummary: null,

  tasksSummary: null,

  serviceRecordsSummary: null,

  downtimeSummary: null,

  thermalReadingsSummary: null,

};



export function Reports() {

  const [companies, setCompanies] = useState<Company[]>([]);

  const [rooms, setRooms] = useState<Room[]>([]);

  const [equipments, setEquipments] = useState<Equipment[]>([]);

  const [users, setUsers] = useState<User[]>([]);

  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  const [selectedRoomId, setSelectedRoomId] = useState('');

  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');

  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');

  const [startDate, setStartDate] = useState(defaultStartDate());

  const [endDate, setEndDate] = useState(defaultEndDate());

  const [reports, setReports] = useState<ReportsState>(emptyReportsState);

  const [error, setError] = useState('');

  const [isLoading, setIsLoading] = useState(true);

  const [isExporting, setIsExporting] = useState(false);



  const reportParams = useMemo<ReportsQueryParams>(() => {

    return {

      companyId: selectedCompanyId || undefined,

      roomId: selectedRoomId || undefined,

      equipmentId: selectedEquipmentId || undefined,

      technicianId: selectedTechnicianId || undefined,

      startDate: optionalStartIsoDate(startDate),

      endDate: optionalEndIsoDate(endDate),

    };

  }, [

    selectedCompanyId,

    selectedRoomId,

    selectedEquipmentId,

    selectedTechnicianId,

    startDate,

    endDate,

  ]);



  async function loadReports(options?: LoadReportsOptions) {

    setError('');

    setIsLoading(true);



    const nextCompanyId = options?.companyId ?? selectedCompanyId;

    const nextRoomId = options?.roomId ?? selectedRoomId;

    const nextEquipmentId = options?.equipmentId ?? selectedEquipmentId;

    const nextTechnicianId = options?.technicianId ?? selectedTechnicianId;

    const nextStartDate = options?.startDateValue ?? startDate;

    const nextEndDate = options?.endDateValue ?? endDate;



    const nextReportParams: ReportsQueryParams = {

      companyId: nextCompanyId || undefined,

      roomId: nextRoomId || undefined,

      equipmentId: nextEquipmentId || undefined,

      technicianId: nextTechnicianId || undefined,

      startDate: optionalStartIsoDate(nextStartDate),

      endDate: optionalEndIsoDate(nextEndDate),

    };



    try {

      const [

        companiesData,

        roomsData,

        equipmentsData,

        usersData,

        operationalSummary,

        tasksSummary,

        serviceRecordsSummary,

        downtimeSummary,

        thermalReadingsSummary,

      ] = await Promise.all([

        getCompanies(),

        getRooms(nextCompanyId || undefined),

        getEquipments({

          companyId: nextCompanyId || undefined,

          roomId: nextRoomId || undefined,

        }),

        getUsers({

          companyId: nextCompanyId || undefined,

        }),

        getOperationalSummary(nextReportParams),

        getTasksSummary(nextReportParams),

        getServiceRecordsSummary(nextReportParams),

        getDowntimeSummary(nextReportParams),

        getThermalReadingsSummary(nextReportParams),

      ]);



      setCompanies(companiesData);

      setRooms(roomsData);

      setEquipments(equipmentsData);

      setUsers(usersData);

      setReports({

        operationalSummary,

        tasksSummary,

        serviceRecordsSummary,

        downtimeSummary,

        thermalReadingsSummary,

      });

    } catch {

      setError('Não foi possível carregar os relatórios.');

    } finally {

      setIsLoading(false);

    }

  }



  async function handleRefresh() {

    await loadReports();

  }



  async function handleClearFilters() {

    const nextStartDate = defaultStartDate();

    const nextEndDate = defaultEndDate();



    setSelectedCompanyId('');

    setSelectedRoomId('');

    setSelectedEquipmentId('');

    setSelectedTechnicianId('');

    setStartDate(nextStartDate);

    setEndDate(nextEndDate);

    setError('');



    await loadReports({

      companyId: '',

      roomId: '',

      equipmentId: '',

      technicianId: '',

      startDateValue: nextStartDate,

      endDateValue: nextEndDate,

    });

  }



  useEffect(() => {

    let isMounted = true;



    const initialReportParams: ReportsQueryParams = {

      startDate: optionalStartIsoDate(defaultStartDate()),

      endDate: optionalEndIsoDate(defaultEndDate()),

    };



    Promise.all([

      getCompanies(),

      getRooms(),

      getEquipments(),

      getUsers(),

      getOperationalSummary(initialReportParams),

      getTasksSummary(initialReportParams),

      getServiceRecordsSummary(initialReportParams),

      getDowntimeSummary(initialReportParams),

      getThermalReadingsSummary(initialReportParams),

    ])

      .then(

        ([

          companiesData,

          roomsData,

          equipmentsData,

          usersData,

          operationalSummary,

          tasksSummary,

          serviceRecordsSummary,

          downtimeSummary,

          thermalReadingsSummary,

        ]) => {

          if (!isMounted) {

            return;

          }



          setCompanies(companiesData);

          setRooms(roomsData);

          setEquipments(equipmentsData);

          setUsers(usersData);

          setReports({

            operationalSummary,

            tasksSummary,

            serviceRecordsSummary,

            downtimeSummary,

            thermalReadingsSummary,

          });

        },

      )

      .catch(() => {

        if (!isMounted) {

          return;

        }



        setError('Não foi possível carregar os relatórios.');

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

          selectedTechnicianId &&

          !usersData.some((user) => user.id === selectedTechnicianId)

        ) {

          setSelectedTechnicianId('');

        }

      })

      .catch(() => {

        if (!isMounted) {

          return;

        }



        setError('Não foi possível carregar filtros de relatórios.');

      });



    return () => {

      isMounted = false;

    };

  }, [

    selectedCompanyId,

    selectedRoomId,

    selectedEquipmentId,

    selectedTechnicianId,

  ]);



  const activeFilters = useMemo(() => {

    const filters: ActiveFilter[] = [];



    const selectedCompany = companies.find(

      (company) => company.id === selectedCompanyId,

    );

    const selectedRoom = rooms.find((room) => room.id === selectedRoomId);

    const selectedEquipment = equipments.find(

      (equipment) => equipment.id === selectedEquipmentId,

    );

    const selectedTechnician = users.find(

      (user) => user.id === selectedTechnicianId,

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



    if (selectedEquipment) {

      filters.push({

        label: 'Equipamento',

        value: selectedEquipment.name,

      });

    }



    if (selectedTechnician) {

      filters.push({

        label: 'Técnico',

        value: selectedTechnician.name,

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



    return filters;

  }, [

    companies,

    endDate,

    equipments,

    rooms,

    selectedCompanyId,

    selectedEquipmentId,

    selectedRoomId,

    selectedTechnicianId,

    startDate,

    users,

  ]);



  const periodLabel = `${formatDate(startDate)} até ${formatDate(endDate)}`;



  async function handleExport(type: ReportType, format: ReportFormat) {

    setError('');

    setIsExporting(true);



    try {

      await downloadReportFile(type, format, reportParams);

    } catch {

      setError('Não foi possível exportar o relatório.');

    } finally {

      setIsExporting(false);

    }

  }



  if (isLoading) {
    return (
      <LoadingState
        title="Carregando relatórios"
        description="Gerando resumos operacionais e indicadores."
      />
    );
  }

  return (
    <div className="reports-page">
      <PageHeader
        eyebrow="Gestão"
        title="Relatórios"
        description="Consulte indicadores operacionais e exporte os dados disponíveis em Excel ou PDF."
        icon={BarChart3}
        actions={
          <ActionButton
            type="button"
            icon={RefreshCw}
            variant="primary"
            onClick={() => void handleRefresh()}
          >
            Atualizar relatórios
          </ActionButton>
        }
        meta={
          <>
            <MetaPill icon={CalendarDays}>{periodLabel}</MetaPill>
            <MetaPill icon={Layers3}>
              {activeFilters.length} filtro(s) específico(s)
            </MetaPill>
            <MetaPill icon={FileText} tone="info">
              Excel e PDF
            </MetaPill>
          </>
        }
      />

      <CollapsibleSection
        title="Filtros dos relatórios"
        openDescription="Selecione empresa, sala, equipamento, técnico e período; depois aplique para recalcular os painéis."
        closedDescription={
          activeFilters.length > 0
            ? `${activeFilters.length} filtro(s) específico(s) selecionado(s).`
            : `Período padrão: ${periodLabel}.`
        }
        openLabel="Ocultar filtros"
        closedLabel="Filtros"
        storageKey="cryomap.reports.filters-open"
        defaultOpen={false}
        defaultOpenOnMobile={false}
        count={activeFilters.length}
        className="reports-filters-disclosure"
        contentClassName="reports-filter-area"
        variant="toolbar"
      >
        <div className="reports-filters">
          <label className="reports-filter-field">
            <span>
              <Building2 size={13} strokeWidth={2.1} aria-hidden="true" />
              Empresa
            </span>
            <select
              value={selectedCompanyId}
              onChange={(event) => {
                setSelectedCompanyId(event.target.value);
                setSelectedRoomId('');
                setSelectedEquipmentId('');
                setSelectedTechnicianId('');
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

          <label className="reports-filter-field">
            <span>
              <DoorOpen size={13} strokeWidth={2.1} aria-hidden="true" />
              Sala
            </span>
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
          </label>

          <label className="reports-filter-field">
            <span>
              <Wrench size={13} strokeWidth={2.1} aria-hidden="true" />
              Equipamento
            </span>
            <select
              value={selectedEquipmentId}
              onChange={(event) => setSelectedEquipmentId(event.target.value)}
            >
              <option value="">Todos os equipamentos</option>

              {equipments.map((equipment) => (
                <option key={equipment.id} value={equipment.id}>
                  {equipment.name}
                </option>
              ))}
            </select>
          </label>

          <label className="reports-filter-field">
            <span>
              <UserRound size={13} strokeWidth={2.1} aria-hidden="true" />
              Técnico
            </span>
            <select
              value={selectedTechnicianId}
              onChange={(event) => setSelectedTechnicianId(event.target.value)}
            >
              <option value="">Todos os técnicos</option>

              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>

          <label className="reports-filter-field">
            <span>
              <CalendarDays size={13} strokeWidth={2.1} aria-hidden="true" />
              Início
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label className="reports-filter-field">
            <span>
              <CalendarDays size={13} strokeWidth={2.1} aria-hidden="true" />
              Fim
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>

        <div className="reports-filter-footer">
          <div className="reports-filter-status">
            <div>
              <strong>Seleção atual</strong>
              <span>
                Período: {periodLabel}. As exportações usam os filtros
                atualmente selecionados.
              </span>
            </div>

            <div className="reports-filter-chips">
              {activeFilters.length > 0 ? (
                activeFilters.map((filter) => (
                  <StatusBadge
                    key={`${filter.label}-${filter.value}`}
                    tone="info"
                  >
                    {filter.label}: {filter.value}
                  </StatusBadge>
                ))
              ) : (
                <StatusBadge tone="neutral">
                  Sem filtros específicos
                </StatusBadge>
              )}
            </div>
          </div>

          <div className="reports-filter-actions">
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

      {error ? (
        <InlineNotice
          tone="danger"
          icon={TriangleAlert}
          title={error}
          description="Tente atualizar novamente os relatórios ou reveja os filtros selecionados."
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

      <SectionCard
        eyebrow="Arquivos"
        title="Exportações"
        description="Baixe os relatórios nos formatos já disponíveis no backend, respeitando os filtros selecionados."
        icon={FileText}
        action={
          isExporting ? (
            <StatusBadge tone="info">Exportando arquivo...</StatusBadge>
          ) : (
            <StatusBadge tone="neutral">4 tipos disponíveis</StatusBadge>
          )
        }
        className="reports-export-section"
      >
        <div className="reports-export-grid">
          <ExportCard
            title="Tarefas"
            description="Tarefas filtradas por empresa, sala, equipamento, técnico e período."
            icon={Layers3}
            disabled={isExporting}
            onExcel={() => void handleExport('tasks', 'xlsx')}
            onPdf={() => void handleExport('tasks', 'pdf')}
          />

          <ExportCard
            title="Atendimentos"
            description="Registros de atendimento técnico e finalizações."
            icon={HardHat}
            disabled={isExporting}
            onExcel={() => void handleExport('service-records', 'xlsx')}
            onPdf={() => void handleExport('service-records', 'pdf')}
          />

          <ExportCard
            title="Tempo parado"
            description="Resumo de downtime por atendimento e equipamento."
            icon={Clock3}
            disabled={isExporting}
            onExcel={() => void handleExport('downtime', 'xlsx')}
            onPdf={() => void handleExport('downtime', 'pdf')}
          />

          <ExportCard
            title="Leituras térmicas"
            description="Histórico de temperatura e umidade das salas."
            icon={Thermometer}
            disabled={isExporting}
            onExcel={() => void handleExport('thermal-readings', 'xlsx')}
            onPdf={() => void handleExport('thermal-readings', 'pdf')}
          />
        </div>
      </SectionCard>

      <section className="reports-results-section">
        <div className="reports-results-header">
          <div>
            <span>Indicadores</span>
            <h2>Resumos operacionais</h2>
            <p>
              Cinco painéis calculados para o período e filtros atualmente
              aplicados.
            </p>
          </div>

          <StatusBadge tone="info">{periodLabel}</StatusBadge>
        </div>

        <div className="reports-grid">
          <ReportPanel
            title="Resumo operacional"
            description="Visão consolidada dos principais cadastros e estados operacionais."
            data={reports.operationalSummary}
            icon={Activity}
            tone="info"
          />

          <ReportPanel
            title="Tarefas"
            description="Distribuição de tarefas por status, prioridade e registros recentes."
            data={reports.tasksSummary}
            icon={Layers3}
            tone="neutral"
          />

          <ReportPanel
            title="Atendimentos"
            description="Resumo dos registros de atendimento técnico do período."
            data={reports.serviceRecordsSummary}
            icon={HardHat}
            tone="success"
          />

          <ReportPanel
            title="Tempo parado"
            description="Indicadores de downtime e equipamentos com maior tempo parado."
            data={reports.downtimeSummary}
            icon={Clock3}
            tone="warning"
          />

          <ReportPanel
            title="Leituras térmicas"
            description="Resumo de temperatura, umidade e leituras ambientais."
            data={reports.thermalReadingsSummary}
            icon={Thermometer}
            tone="info"
          />
        </div>
      </section>
    </div>
  );
}

type ExportCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  disabled: boolean;
  onExcel: () => void;
  onPdf: () => void;
};

function ExportCard({
  title,
  description,
  icon: Icon,
  disabled,
  onExcel,
  onPdf,
}: ExportCardProps) {
  return (
    <article className="reports-export-card">
      <div className="reports-export-card-header">
        <span className="reports-export-card-icon" aria-hidden="true">
          <Icon size={18} strokeWidth={2.15} />
        </span>

        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      <div className="reports-export-actions">
        <ActionButton
          type="button"
          icon={FileSpreadsheet}
          variant="secondary"
          disabled={disabled}
          onClick={onExcel}
        >
          Excel
        </ActionButton>

        <ActionButton
          type="button"
          icon={FileText}
          variant="primary"
          disabled={disabled}
          onClick={onPdf}
        >
          PDF
        </ActionButton>
      </div>
    </article>
  );
}

type ReportPanelProps = {
  title: string;
  description: string;
  data: ReportData | null;
  icon: LucideIcon;
  tone?: UiTone;
};

function ReportPanel({
  title,
  description,
  data,
  icon,
  tone = 'neutral',
}: ReportPanelProps) {
  const entries = data ? getVisibleEntries(data) : [];

  return (
    <SectionCard
      title={title}
      description={description}
      icon={icon}
      tone={tone}
      action={
        <StatusBadge tone="neutral">
          {entries.length} grupo(s)
        </StatusBadge>
      }
      className="report-panel"
    >
      {entries.length === 0 ? (
        <EmptyState
          title="Nenhum dado carregado"
          description="Aplique os filtros para atualizar este painel."
        />
      ) : (
        <div className="report-key-value-list">
          {entries.map(([key, value]) => (
            <ReportValue key={key} label={formatKey(key)} value={value} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

type ReportValueProps = {

  label: string;

  value: unknown;

  depth?: number;

};



function ReportValue({ label, value, depth = 0 }: ReportValueProps) {

  if (isHiddenReportValue(value)) {

    return null;

  }



  if (Array.isArray(value)) {

    return (

      <div className="report-key-value">

        <span>{label}</span>

        <strong>{value.length} item(ns)</strong>



        {value.length > 0 ? (

          <div className="report-array-preview">

            {value.slice(0, 3).map((item, index) => (

              <small key={index}>{formatArrayItem(item)}</small>

            ))}



            {value.length > 3 ? (

              <small>+ {value.length - 3} item(ns)</small>

            ) : null}

          </div>

        ) : null}

      </div>

    );

  }



  if (isPlainObject(value)) {

    const entries = getVisibleEntries(value);



    return (

      <div className="report-key-value nested">

        <span>{label}</span>



        {entries.length === 0 ? (

          <strong>-</strong>

        ) : (

          <div className="report-nested-list">

            {entries.map(([nestedKey, nestedValue]) => (

              <ReportValue

                key={nestedKey}

                label={formatKey(nestedKey)}

                value={nestedValue}

                depth={depth + 1}

              />

            ))}

          </div>

        )}

      </div>

    );

  }



  return (

    <div className="report-key-value">

      <span>{label}</span>

      <strong>{formatValue(value)}</strong>

    </div>

  );

}



function getVisibleEntries(data: Record<string, unknown>) {

  return Object.entries(data).filter(([key]) => {

    return !['generatedAt', 'filters', 'period'].includes(key);

  });

}



function isPlainObject(value: unknown): value is Record<string, unknown> {

  return typeof value === 'object' && value !== null && !Array.isArray(value);

}



function isHiddenReportValue(value: unknown) {

  return value === undefined;

}



function formatArrayItem(value: unknown) {

  if (isPlainObject(value)) {

    if (typeof value.title === 'string') {

      return value.title;

    }



    if (typeof value.name === 'string') {

      return value.name;

    }



    if (typeof value.id === 'string') {

      return `Registro ${shortId(value.id)}`;

    }



    const firstReadableValue = Object.values(value).find(

      (item) => typeof item === 'string' || typeof item === 'number',

    );



    return firstReadableValue ? String(firstReadableValue) : 'Registro';

  }



  return formatValue(value);

}



function formatKey(value: string) {

  const labels: Record<string, string> = {

    total: 'Total',

    active: 'Ativas',

    inactive: 'Inativas',

    normal: 'Normal',

    warning: 'Atenção',

    critical: 'Crítico',

    offline: 'Offline',

    maintenance: 'Manutenção',

    running: 'Em operação',

    stopped: 'Parado',

    open: 'Abertas',

    inProgress: 'Em andamento',

    done: 'Concluídas',

    canceled: 'Canceladas',

    overdue: 'Atrasadas',

    low: 'Baixa',

    medium: 'Média',

    high: 'Alta',

    totalRecords: 'Total de registros',

    totalDowntimeMinutes: 'Tempo parado total',

    totalDowntimeHours: 'Tempo parado em horas',

    averageDowntimeMinutes: 'Média de tempo parado',

    maximumDowntimeMinutes: 'Maior tempo parado',

    totalReadings: 'Total de leituras',

    average: 'Média',

    minimum: 'Mínima',

    maximum: 'Máxima',

    first: 'Primeira',

    last: 'Última',

    companies: 'Empresas',

    rooms: 'Salas',

    sensors: 'Sensores',

    equipments: 'Equipamentos',

    tasks: 'Tarefas',

    serviceRecords: 'Atendimentos',

    thermalAlerts: 'Alertas térmicos',

    byStatus: 'Por status',

    byPriority: 'Por prioridade',

    recentTasks: 'Tarefas recentes',

    recentServiceRecords: 'Atendimentos recentes',

    recentDowntimeRecords: 'Registros recentes de tempo parado',

    topEquipments: 'Equipamentos com mais tempo parado',

    topRooms: 'Salas com mais tempo parado',

    temperature: 'Temperatura',

    humidity: 'Umidade',

    readAt: 'Período das leituras',

    criticalRooms: 'Salas críticas',

    latestReadings: 'Últimas leituras',

    finished: 'Finalizados',

    totalDowntime: 'Tempo parado total',

  };



  if (labels[value]) {

    return labels[value];

  }



  return value

    .replace(/([A-Z])/g, ' $1')

    .replace(/_/g, ' ')

    .replace(/^./, (letter) => letter.toUpperCase());

}



function formatValue(value: unknown): string {

  if (value === null || value === undefined) {

    return '-';

  }



  if (typeof value === 'number') {

    return formatNumber(value);

  }



  if (typeof value === 'string') {

    if (isIsoDate(value)) {

      return new Date(value).toLocaleString('pt-BR');

    }



    if (isUuid(value)) {

      return shortId(value);

    }



    return formatEnumLikeValue(value);

  }



  if (typeof value === 'boolean') {

    return value ? 'Sim' : 'Não';

  }



  return String(value);

}



function formatNumber(value: number) {

  return new Intl.NumberFormat('pt-BR', {

    maximumFractionDigits: 2,

  }).format(value);

}



function formatEnumLikeValue(value: string) {

  const labels: Record<string, string> = {

    OPEN: 'Aberta',

    IN_PROGRESS: 'Em andamento',

    DONE: 'Concluída',

    CANCELED: 'Cancelada',

    OVERDUE: 'Atrasada',

    LOW: 'Baixa',

    MEDIUM: 'Média',

    HIGH: 'Alta',

    CRITICAL: 'Crítica',

    ACTIVE: 'Ativo',

    INACTIVE: 'Inativo',

    OFFLINE: 'Offline',

    MAINTENANCE: 'Manutenção',

    NORMAL: 'Normal',

    WARNING: 'Atenção',

  };



  return labels[value] ?? value;

}



function isIsoDate(value: string) {

  return /^\d{4}-\d{2}-\d{2}T/.test(value);

}



function isUuid(value: string) {

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(

    value,

  );

}



function shortId(value: string) {

  return value.slice(0, 8).toUpperCase();

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



function formatDate(value?: string | null) {

  if (!value) {

    return '-';

  }



  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');

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
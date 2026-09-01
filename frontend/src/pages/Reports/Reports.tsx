import { useEffect, useMemo, useState } from 'react';
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
import { LoadingState } from '../../components/Feedback/LoadingState';
import { EmptyState } from '../../components/Feedback/EmptyState';

type ReportsState = {
  operationalSummary: ReportData | null;
  tasksSummary: ReportData | null;
  serviceRecordsSummary: ReportData | null;
  downtimeSummary: ReportData | null;
  thermalReadingsSummary: ReportData | null;
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

  async function handleRefresh() {
    setError('');
    setIsLoading(true);

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
        getRooms(selectedCompanyId || undefined),
        getEquipments({
          companyId: selectedCompanyId || undefined,
          roomId: selectedRoomId || undefined,
        }),
        getUsers({
          companyId: selectedCompanyId || undefined,
        }),
        getOperationalSummary(reportParams),
        getTasksSummary(reportParams),
        getServiceRecordsSummary(reportParams),
        getDowntimeSummary(reportParams),
        getThermalReadingsSummary(reportParams),
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
    title="Carregando relatórios..."
    description="Gerando resumos operacionais e indicadores."
  />
);
  }

  return (
    <div className="reports-page">
      <header className="reports-header">
        <div>
          <span>Gestão</span>
          <h1>Relatórios</h1>
          <p>
            Consulte resumos operacionais e exporte relatórios em Excel ou PDF.
          </p>
        </div>

        <button type="button" onClick={handleRefresh}>
          Atualizar relatórios
        </button>
      </header>

      <section className="reports-filters-panel">
        <div>
          <h2>Filtros</h2>
          <p>Selecione os filtros e clique em atualizar.</p>
        </div>

        <div className="reports-filters">
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
                {equipment.name}
              </option>
            ))}
          </select>

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

          <button type="button" onClick={handleRefresh}>
            Aplicar filtros
          </button>
        </div>
      </section>

      {error ? (
        <div className="reports-error">
          <strong>{error}</strong>

          <button type="button" onClick={handleRefresh}>
            Tentar novamente
          </button>
        </div>
      ) : null}

      <section className="reports-export-panel">
        <div>
          <h2>Exportações</h2>
          <p>Baixe os relatórios nos formatos já disponíveis no backend.</p>
        </div>

        <div className="reports-export-grid">
          <ExportCard
            title="Tarefas"
            description="Tarefas filtradas por empresa, sala, equipamento, técnico e período."
            disabled={isExporting}
            onExcel={() => handleExport('tasks', 'xlsx')}
            onPdf={() => handleExport('tasks', 'pdf')}
          />

          <ExportCard
            title="Atendimentos"
            description="Registros de atendimento técnico e finalizações."
            disabled={isExporting}
            onExcel={() => handleExport('service-records', 'xlsx')}
            onPdf={() => handleExport('service-records', 'pdf')}
          />

          <ExportCard
            title="Tempo parado"
            description="Resumo de downtime por atendimento/equipamento."
            disabled={isExporting}
            onExcel={() => handleExport('downtime', 'xlsx')}
            onPdf={() => handleExport('downtime', 'pdf')}
          />

          <ExportCard
            title="Leituras térmicas"
            description="Histórico de temperatura e umidade das salas."
            disabled={isExporting}
            onExcel={() => handleExport('thermal-readings', 'xlsx')}
            onPdf={() => handleExport('thermal-readings', 'pdf')}
          />
        </div>
      </section>

      <section className="reports-grid">
        <ReportPanel
          title="Resumo operacional"
          data={reports.operationalSummary}
        />

        <ReportPanel title="Tarefas" data={reports.tasksSummary} />

        <ReportPanel
          title="Atendimentos"
          data={reports.serviceRecordsSummary}
        />

        <ReportPanel title="Tempo parado" data={reports.downtimeSummary} />

        <ReportPanel
          title="Leituras térmicas"
          data={reports.thermalReadingsSummary}
        />
      </section>
    </div>
  );
}

type ExportCardProps = {
  title: string;
  description: string;
  disabled: boolean;
  onExcel: () => void;
  onPdf: () => void;
};

function ExportCard({
  title,
  description,
  disabled,
  onExcel,
  onPdf,
}: ExportCardProps) {
  return (
    <article className="reports-export-card">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <div className="reports-export-actions">
        <button type="button" disabled={disabled} onClick={onExcel}>
          Excel
        </button>

        <button type="button" disabled={disabled} onClick={onPdf}>
          PDF
        </button>
      </div>
    </article>
  );
}

type ReportPanelProps = {
  title: string;
  data: ReportData | null;
};

function ReportPanel({ title, data }: ReportPanelProps) {
  const entries = data ? getVisibleEntries(data) : [];

  return (
    <article className="report-panel">
      <div className="report-panel-header">
        <h2>{title}</h2>
        <span>{entries.length} grupo(s)</span>
      </div>

      {entries.length === 0 ? (
        <EmptyState
  compact
  title="Nenhum dado carregado."
  description="Aplique os filtros para atualizar este painel."
/>
      ) : (
        <div className="report-key-value-list">
          {entries.map(([key, value]) => (
            <ReportValue key={key} label={formatKey(key)} value={value} />
          ))}
        </div>
      )}
    </article>
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

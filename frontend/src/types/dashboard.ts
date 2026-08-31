export type DashboardOverview = {
  generatedAt: string;
  filters?: {
    companyId?: string | null;
  };
  companies: {
    total: number;
    active: number;
    inactive: number;
  };
  rooms: {
    total: number;
    normal: number;
    warning: number;
    critical: number;
    offline: number;
  };
  sensors: {
    total: number;
    active: number;
    offline: number;
    maintenance: number;
    inactive: number;
  };
  equipments: {
    total: number;
    active: number;
    running: number;
    stopped: number;
    maintenance: number;
    offline: number;
    inactive: number;
  };
  tasks: {
    total: number;
    open: number;
    inProgress: number;
    done: number;
    canceled: number;
    overdue: number;
    criticalPriority: number;
  };
  thermalAlerts?: {
    total: number;
    active: number;
    open: number;
    acknowledged: number;
    resolved: number;
    dismissed: number;
    critical: number;
    warning: number;
  };
  activeThermalAlertRooms?: {
    total: number;
    rooms: ActiveThermalAlertRoom[];
  };
  recentThermalAlerts?: RecentThermalAlert[];
  recentServiceRecords?: RecentServiceRecord[];
  latestRoomTemperatureReadings?: LatestRoomTemperatureReading[];
};

export type ActiveThermalAlertRoom = {
  id: string;
  roomId: string;
  severity: string;
  status: string;
  temperature: number | null;
  message: string | null;
  triggeredAt: string;
  room: {
    id: string;
    name: string;
    currentTemperature: number | null;
    thermalStatus: string;
    minTemperature?: number | null;
    maxTemperature?: number | null;
  };
};

export type RecentThermalAlert = {
  id: string;
  companyId?: string;
  roomId?: string;
  sensorId?: string | null;
  readingId?: string | null;
  type?: string;
  severity: string;
  status: string;
  temperature: number | null;
  minTemperature?: number | null;
  maxTemperature?: number | null;
  message: string | null;
  triggeredAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  room?: {
    id?: string;
    name: string;
    thermalStatus?: string;
    currentTemperature?: number | null;
  } | null;
  sensor?: {
    id?: string;
    code: string;
    status: string;
  } | null;
};

export type RecentServiceRecord = {
  id: string;
  taskId: string;
  companyId: string;
  roomId?: string | null;
  equipmentId?: string | null;
  technicianId?: string | null;
  startedAt: string;
  finishedAt?: string | null;
  downtimeMinutes?: number | null;
  problemFound?: string | null;
  servicePerformed?: string | null;
  task?: {
    id: string;
    title: string;
    status: string;
    priority: string;
  } | null;
  company?: {
    id: string;
    name: string;
  } | null;
  room?: {
    id: string;
    name: string;
  } | null;
  equipment?: {
    id: string;
    name: string;
    code: string;
  } | null;
  technician?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type LatestRoomTemperatureReading = {
  id: string;
  companyId: string;
  roomId: string;
  sensorId?: string | null;
  temperature: number;
  humidity?: number | null;
  source: string;
  readAt: string;
  room?: {
    id: string;
    name: string;
    thermalStatus: string;
    minTemperature?: number | null;
    maxTemperature?: number | null;
  } | null;
  sensor?: {
    id: string;
    code: string;
    status: string;
  } | null;
};
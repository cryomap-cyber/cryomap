import { api } from './api';

export type ReportsQueryParams = {
  companyId?: string;
  roomId?: string;
  equipmentId?: string;
  technicianId?: string;
  startDate?: string;
  endDate?: string;
};

export type ReportData = Record<string, unknown>;

export type ReportType =
  | 'tasks'
  | 'service-records'
  | 'downtime'
  | 'thermal-readings';

export type ReportFormat = 'xlsx' | 'pdf';

export async function getOperationalSummary(params?: ReportsQueryParams) {
  const response = await api.get<ReportData>('/reports/operational-summary', {
    params,
  });

  return response.data;
}

export async function getTasksSummary(params?: ReportsQueryParams) {
  const response = await api.get<ReportData>('/reports/tasks-summary', {
    params,
  });

  return response.data;
}

export async function getServiceRecordsSummary(params?: ReportsQueryParams) {
  const response = await api.get<ReportData>(
    '/reports/service-records-summary',
    {
      params,
    },
  );

  return response.data;
}

export async function getDowntimeSummary(params?: ReportsQueryParams) {
  const response = await api.get<ReportData>('/reports/downtime-summary', {
    params,
  });

  return response.data;
}

export async function getThermalReadingsSummary(params?: ReportsQueryParams) {
  const response = await api.get<ReportData>(
    '/reports/thermal-readings-summary',
    {
      params,
    },
  );

  return response.data;
}

export async function downloadReportFile(
  type: ReportType,
  format: ReportFormat,
  params?: ReportsQueryParams,
) {
  const response = await api.get<Blob>(`/reports/export/${type}.${format}`, {
    params,
    responseType: 'blob',
  });

  const fileName = `cryomap-${type}-${new Date()
    .toISOString()
    .slice(0, 10)}.${format}`;

  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();

  link.remove();
  window.URL.revokeObjectURL(url);
}

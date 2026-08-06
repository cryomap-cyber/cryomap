import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createRequire } from 'node:module';
import type {
  Workbook as ExcelWorkbook,
  Worksheet as ExcelWorksheet,
} from 'exceljs';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReportsQueryDto } from './dto/reports-query.dto.js';

const require = createRequire(import.meta.url);

const ExcelJSModule = require('exceljs') as typeof import('exceljs') & {
  default?: typeof import('exceljs');
};

const ExcelJS = ExcelJSModule.default ?? ExcelJSModule;

@Injectable()
export class ReportsExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportTasks(query: ReportsQueryDto) {
    await this.validateFilters(query);

    const period = this.resolvePeriod(query.startDate, query.endDate);
    const where = this.buildTaskWhere(query, period);

    const tasks = await this.prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        dueDate: true,
        completedAt: true,
        createdAt: true,
        company: {
          select: {
            name: true,
          },
        },
        room: {
          select: {
            name: true,
          },
        },
        equipment: {
          select: {
            name: true,
            code: true,
          },
        },
        assignedToUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const workbook = this.createWorkbook();
    const worksheet = workbook.addWorksheet('Tarefas');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Empresa', key: 'company', width: 28 },
      { header: 'Sala', key: 'room', width: 24 },
      { header: 'Equipamento', key: 'equipment', width: 28 },
      { header: 'Código Equipamento', key: 'equipmentCode', width: 20 },
      { header: 'Responsável', key: 'assignedToUser', width: 28 },
      { header: 'Email Responsável', key: 'assignedToUserEmail', width: 32 },
      { header: 'Título', key: 'title', width: 40 },
      { header: 'Descrição', key: 'description', width: 50 },
      { header: 'Prioridade', key: 'priority', width: 16 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Vencimento', key: 'dueDate', width: 22 },
      { header: 'Concluída em', key: 'completedAt', width: 22 },
      { header: 'Criada em', key: 'createdAt', width: 22 },
    ];

    for (const task of tasks) {
      worksheet.addRow({
        id: task.id,
        company: task.company?.name ?? '',
        room: task.room?.name ?? '',
        equipment: task.equipment?.name ?? '',
        equipmentCode: task.equipment?.code ?? '',
        assignedToUser: task.assignedToUser?.name ?? '',
        assignedToUserEmail: task.assignedToUser?.email ?? '',
        title: task.title,
        description: task.description ?? '',
        priority: task.priority,
        status: task.status,
        dueDate: this.formatDate(task.dueDate),
        completedAt: this.formatDate(task.completedAt),
        createdAt: this.formatDate(task.createdAt),
      });
    }

    this.formatWorksheet(worksheet);
    this.addMetadataSheet(workbook, query, period, tasks.length);

    return this.workbookToBuffer(workbook);
  }

  async exportServiceRecords(query: ReportsQueryDto) {
    await this.validateFilters(query);

    const period = this.resolvePeriod(query.startDate, query.endDate);
    const where = this.buildServiceRecordWhere(query, period);

    const serviceRecords = await this.prisma.serviceRecord.findMany({
      where,
      select: {
        id: true,
        startedAt: true,
        finishedAt: true,
        downtimeMinutes: true,
        problemFound: true,
        servicePerformed: true,
        notes: true,
        company: {
          select: {
            name: true,
          },
        },
        room: {
          select: {
            name: true,
          },
        },
        equipment: {
          select: {
            name: true,
            code: true,
          },
        },
        technician: {
          select: {
            name: true,
            email: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            priority: true,
            status: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    const workbook = this.createWorkbook();
    const worksheet = workbook.addWorksheet('Atendimentos');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Empresa', key: 'company', width: 28 },
      { header: 'Sala', key: 'room', width: 24 },
      { header: 'Equipamento', key: 'equipment', width: 28 },
      { header: 'Código Equipamento', key: 'equipmentCode', width: 20 },
      { header: 'Técnico', key: 'technician', width: 28 },
      { header: 'Email Técnico', key: 'technicianEmail', width: 32 },
      { header: 'Tarefa', key: 'taskTitle', width: 40 },
      { header: 'Prioridade da Tarefa', key: 'taskPriority', width: 20 },
      { header: 'Status da Tarefa', key: 'taskStatus', width: 20 },
      { header: 'Iniciado em', key: 'startedAt', width: 22 },
      { header: 'Finalizado em', key: 'finishedAt', width: 22 },
      { header: 'Tempo parado (min)', key: 'downtimeMinutes', width: 20 },
      { header: 'Tempo parado (h)', key: 'downtimeHours', width: 18 },
      { header: 'Problema encontrado', key: 'problemFound', width: 45 },
      { header: 'Serviço realizado', key: 'servicePerformed', width: 45 },
      { header: 'Observações', key: 'notes', width: 45 },
    ];

    for (const record of serviceRecords) {
      worksheet.addRow({
        id: record.id,
        company: record.company?.name ?? '',
        room: record.room?.name ?? '',
        equipment: record.equipment?.name ?? '',
        equipmentCode: record.equipment?.code ?? '',
        technician: record.technician?.name ?? '',
        technicianEmail: record.technician?.email ?? '',
        taskTitle: record.task?.title ?? '',
        taskPriority: record.task?.priority ?? '',
        taskStatus: record.task?.status ?? '',
        startedAt: this.formatDate(record.startedAt),
        finishedAt: this.formatDate(record.finishedAt),
        downtimeMinutes: record.downtimeMinutes ?? '',
        downtimeHours:
          record.downtimeMinutes !== null &&
          record.downtimeMinutes !== undefined
            ? Number((record.downtimeMinutes / 60).toFixed(2))
            : '',
        problemFound: record.problemFound ?? '',
        servicePerformed: record.servicePerformed ?? '',
        notes: record.notes ?? '',
      });
    }

    this.formatWorksheet(worksheet);
    this.addMetadataSheet(workbook, query, period, serviceRecords.length);

    return this.workbookToBuffer(workbook);
  }

  async exportDowntime(query: ReportsQueryDto) {
    await this.validateFilters(query);

    const period = this.resolvePeriod(query.startDate, query.endDate);
    const where = this.buildServiceRecordWhere(query, period);

    const serviceRecords = await this.prisma.serviceRecord.findMany({
      where: {
        ...where,
        downtimeMinutes: {
          not: null,
        },
      },
      select: {
        id: true,
        startedAt: true,
        finishedAt: true,
        downtimeMinutes: true,
        problemFound: true,
        servicePerformed: true,
        company: {
          select: {
            name: true,
          },
        },
        room: {
          select: {
            name: true,
          },
        },
        equipment: {
          select: {
            name: true,
            code: true,
          },
        },
        technician: {
          select: {
            name: true,
          },
        },
        task: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        downtimeMinutes: 'desc',
      },
    });

    const workbook = this.createWorkbook();
    const worksheet = workbook.addWorksheet('Tempo Parado');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Empresa', key: 'company', width: 28 },
      { header: 'Sala', key: 'room', width: 24 },
      { header: 'Equipamento', key: 'equipment', width: 28 },
      { header: 'Código Equipamento', key: 'equipmentCode', width: 20 },
      { header: 'Técnico', key: 'technician', width: 28 },
      { header: 'Tarefa', key: 'taskTitle', width: 40 },
      { header: 'Iniciado em', key: 'startedAt', width: 22 },
      { header: 'Finalizado em', key: 'finishedAt', width: 22 },
      { header: 'Tempo parado (min)', key: 'downtimeMinutes', width: 20 },
      { header: 'Tempo parado (h)', key: 'downtimeHours', width: 18 },
      { header: 'Problema encontrado', key: 'problemFound', width: 45 },
      { header: 'Serviço realizado', key: 'servicePerformed', width: 45 },
    ];

    for (const record of serviceRecords) {
      worksheet.addRow({
        id: record.id,
        company: record.company?.name ?? '',
        room: record.room?.name ?? '',
        equipment: record.equipment?.name ?? '',
        equipmentCode: record.equipment?.code ?? '',
        technician: record.technician?.name ?? '',
        taskTitle: record.task?.title ?? '',
        startedAt: this.formatDate(record.startedAt),
        finishedAt: this.formatDate(record.finishedAt),
        downtimeMinutes: record.downtimeMinutes ?? 0,
        downtimeHours: Number(((record.downtimeMinutes ?? 0) / 60).toFixed(2)),
        problemFound: record.problemFound ?? '',
        servicePerformed: record.servicePerformed ?? '',
      });
    }

    const totalMinutes = serviceRecords.reduce(
      (sum, record) => sum + (record.downtimeMinutes ?? 0),
      0,
    );

    const summaryWorksheet = workbook.addWorksheet('Resumo');

    summaryWorksheet.columns = [
      { header: 'Indicador', key: 'indicator', width: 34 },
      { header: 'Valor', key: 'value', width: 24 },
    ];

    summaryWorksheet.addRows([
      {
        indicator: 'Total de registros com tempo parado',
        value: serviceRecords.length,
      },
      {
        indicator: 'Tempo parado total em minutos',
        value: totalMinutes,
      },
      {
        indicator: 'Tempo parado total em horas',
        value: Number((totalMinutes / 60).toFixed(2)),
      },
    ]);

    this.formatWorksheet(worksheet);
    this.formatWorksheet(summaryWorksheet);
    this.addMetadataSheet(workbook, query, period, serviceRecords.length);

    return this.workbookToBuffer(workbook);
  }

  async exportThermalReadings(query: ReportsQueryDto) {
    await this.validateFilters(query);

    const period = this.resolvePeriod(query.startDate, query.endDate);
    const where = this.buildRoomTemperatureReadingWhere(query, period);

    const readings = await this.prisma.roomTemperatureReading.findMany({
      where,
      select: {
        id: true,
        temperature: true,
        humidity: true,
        source: true,
        readAt: true,
        company: {
          select: {
            name: true,
          },
        },
        room: {
          select: {
            name: true,
            thermalStatus: true,
            minTemperature: true,
            maxTemperature: true,
          },
        },
        sensor: {
          select: {
            code: true,
            status: true,
          },
        },
      },
      orderBy: {
        readAt: 'desc',
      },
    });

    const workbook = this.createWorkbook();
    const worksheet = workbook.addWorksheet('Leituras Térmicas');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Empresa', key: 'company', width: 28 },
      { header: 'Sala', key: 'room', width: 24 },
      { header: 'Status Térmico da Sala', key: 'thermalStatus', width: 24 },
      { header: 'Temperatura', key: 'temperature', width: 16 },
      { header: 'Umidade', key: 'humidity', width: 16 },
      { header: 'Temperatura Mínima', key: 'minTemperature', width: 22 },
      { header: 'Temperatura Máxima', key: 'maxTemperature', width: 22 },
      { header: 'Sensor', key: 'sensorCode', width: 24 },
      { header: 'Status Sensor', key: 'sensorStatus', width: 18 },
      { header: 'Fonte', key: 'source', width: 16 },
      { header: 'Lida em', key: 'readAt', width: 22 },
    ];

    for (const reading of readings) {
      worksheet.addRow({
        id: reading.id,
        company: reading.company?.name ?? '',
        room: reading.room?.name ?? '',
        thermalStatus: reading.room?.thermalStatus ?? '',
        temperature: reading.temperature,
        humidity: reading.humidity ?? '',
        minTemperature: reading.room?.minTemperature ?? '',
        maxTemperature: reading.room?.maxTemperature ?? '',
        sensorCode: reading.sensor?.code ?? '',
        sensorStatus: reading.sensor?.status ?? '',
        source: reading.source,
        readAt: this.formatDate(reading.readAt),
      });
    }

    this.formatWorksheet(worksheet);
    this.addMetadataSheet(workbook, query, period, readings.length);

    return this.workbookToBuffer(workbook);
  }

  private createWorkbook(): ExcelWorkbook {
    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'CryoMap';
    workbook.lastModifiedBy = 'CryoMap';
    workbook.created = new Date();
    workbook.modified = new Date();

    return workbook;
  }

  private formatWorksheet(worksheet: ExcelWorksheet) {
    worksheet.views = [
      {
        state: 'frozen',
        ySplit: 1,
      },
    ];

    const headerRow = worksheet.getRow(1);

    headerRow.font = {
      bold: true,
    };

    headerRow.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };

    worksheet.autoFilter = {
      from: {
        row: 1,
        column: 1,
      },
      to: {
        row: 1,
        column: worksheet.columnCount,
      },
    };

    worksheet.eachRow((row) => {
      row.alignment = {
        vertical: 'top',
        wrapText: true,
      };
    });
  }

  private addMetadataSheet(
    workbook: ExcelWorkbook,
    query: ReportsQueryDto,
    period: {
      startDate: Date;
      endDate: Date;
    },
    totalRows: number,
  ) {
    const worksheet = workbook.addWorksheet('Metadados');

    worksheet.columns = [
      { header: 'Campo', key: 'field', width: 28 },
      { header: 'Valor', key: 'value', width: 45 },
    ];

    worksheet.addRows([
      {
        field: 'Gerado em',
        value: this.formatDate(new Date()),
      },
      {
        field: 'Período inicial',
        value: this.formatDate(period.startDate),
      },
      {
        field: 'Período final',
        value: this.formatDate(period.endDate),
      },
      {
        field: 'Empresa ID',
        value: query.companyId ?? '',
      },
      {
        field: 'Sala ID',
        value: query.roomId ?? '',
      },
      {
        field: 'Equipamento ID',
        value: query.equipmentId ?? '',
      },
      {
        field: 'Técnico ID',
        value: query.technicianId ?? '',
      },
      {
        field: 'Total de linhas',
        value: totalRows,
      },
    ]);

    this.formatWorksheet(worksheet);
  }

  private async workbookToBuffer(workbook: ExcelWorkbook) {
    const buffer = await workbook.xlsx.writeBuffer();

    return Buffer.from(buffer);
  }

  private formatDate(date?: Date | null) {
    if (!date) {
      return '';
    }

    return date.toISOString();
  }

  private buildTaskWhere(
    query: ReportsQueryDto,
    period: {
      startDate: Date;
      endDate: Date;
    },
  ): Prisma.TaskWhereInput {
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      createdAt: {
        gte: period.startDate,
        lte: period.endDate,
      },
    };

    if (query.companyId) {
      where.companyId = query.companyId;
    }

    if (query.roomId) {
      where.roomId = query.roomId;
    }

    if (query.equipmentId) {
      where.equipmentId = query.equipmentId;
    }

    if (query.technicianId) {
      where.assignedToUserId = query.technicianId;
    }

    return where;
  }

  private buildServiceRecordWhere(
    query: ReportsQueryDto,
    period: {
      startDate: Date;
      endDate: Date;
    },
  ): Prisma.ServiceRecordWhereInput {
    const where: Prisma.ServiceRecordWhereInput = {
      deletedAt: null,
      startedAt: {
        gte: period.startDate,
        lte: period.endDate,
      },
    };

    if (query.companyId) {
      where.companyId = query.companyId;
    }

    if (query.roomId) {
      where.roomId = query.roomId;
    }

    if (query.equipmentId) {
      where.equipmentId = query.equipmentId;
    }

    if (query.technicianId) {
      where.technicianId = query.technicianId;
    }

    return where;
  }

  private buildRoomTemperatureReadingWhere(
    query: ReportsQueryDto,
    period: {
      startDate: Date;
      endDate: Date;
    },
  ): Prisma.RoomTemperatureReadingWhereInput {
    const where: Prisma.RoomTemperatureReadingWhereInput = {
      readAt: {
        gte: period.startDate,
        lte: period.endDate,
      },
    };

    if (query.companyId) {
      where.companyId = query.companyId;
    }

    if (query.roomId) {
      where.roomId = query.roomId;
    }

    return where;
  }

  private resolvePeriod(startDate?: string, endDate?: string) {
    const resolvedEndDate = endDate ? new Date(endDate) : new Date();

    if (Number.isNaN(resolvedEndDate.getTime())) {
      throw new BadRequestException('Data final inválida');
    }

    const resolvedStartDate = startDate
      ? new Date(startDate)
      : new Date(resolvedEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(resolvedStartDate.getTime())) {
      throw new BadRequestException('Data inicial inválida');
    }

    if (resolvedStartDate > resolvedEndDate) {
      throw new BadRequestException(
        'A data inicial não pode ser maior que a data final',
      );
    }

    return {
      startDate: resolvedStartDate,
      endDate: resolvedEndDate,
    };
  }

  private async validateFilters(query: ReportsQueryDto) {
    if (query.companyId) {
      await this.ensureCompanyExists(query.companyId);
    }

    if (query.roomId) {
      await this.ensureRoomExists(query.roomId, query.companyId);
    }

    if (query.equipmentId) {
      await this.ensureEquipmentExists(query.equipmentId, query.companyId);
    }

    if (query.technicianId) {
      await this.ensureTechnicianExists(query.technicianId, query.companyId);
    }
  }

  private async ensureCompanyExists(companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }
  }

  private async ensureRoomExists(roomId: string, companyId?: string) {
    const where: Prisma.RoomWhereInput = {
      id: roomId,
      deletedAt: null,
    };

    if (companyId) {
      where.companyId = companyId;
    }

    const room = await this.prisma.room.findFirst({
      where,
      select: {
        id: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Sala não encontrada');
    }
  }

  private async ensureEquipmentExists(equipmentId: string, companyId?: string) {
    const where: Prisma.EquipmentWhereInput = {
      id: equipmentId,
      deletedAt: null,
    };

    if (companyId) {
      where.companyId = companyId;
    }

    const equipment = await this.prisma.equipment.findFirst({
      where,
      select: {
        id: true,
      },
    });

    if (!equipment) {
      throw new NotFoundException('Equipamento não encontrado');
    }
  }

  private async ensureTechnicianExists(
    technicianId: string,
    companyId?: string,
  ) {
    const where: Prisma.UserWhereInput = {
      id: technicianId,
      deletedAt: null,
    };

    if (companyId) {
      where.OR = [
        {
          companyId,
        },
        {
          companyId: null,
        },
      ];
    }

    const technician = await this.prisma.user.findFirst({
      where,
      select: {
        id: true,
      },
    });

    if (!technician) {
      throw new NotFoundException('Técnico não encontrado');
    }
  }
}

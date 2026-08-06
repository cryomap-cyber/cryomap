import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createRequire } from 'node:module';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReportsQueryDto } from './dto/reports-query.dto.js';

type PdfDocument = {
  fontSize(size: number): PdfDocument;
  font(fontName: string): PdfDocument;
  text(text: string, options?: Record<string, unknown>): PdfDocument;
  moveDown(lines?: number): PdfDocument;
  addPage(): PdfDocument;
  end(): void;
  on(event: 'data', listener: (chunk: Buffer) => void): PdfDocument;
  on(event: 'end', listener: () => void): PdfDocument;
  on(event: 'error', listener: (error: Error) => void): PdfDocument;
  page: {
    height: number;
    margins: {
      bottom: number;
    };
  };
  y: number;
};

type PdfDocumentConstructor = {
  new (options?: {
    size?: string;
    margin?: number;
    bufferPages?: boolean;
  }): PdfDocument;
};

const require = createRequire(import.meta.url);
const PDFDocument = require('pdfkit') as PdfDocumentConstructor;

@Injectable()
export class ReportsPdfExportService {
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

    return this.createPdfBuffer(
      'Relatório de Tarefas',
      query,
      period,
      tasks.length,
      (doc) => {
        this.writeSectionTitle(doc, 'Resumo');

        this.writeKeyValue(doc, 'Total de tarefas', tasks.length);

        this.writeSectionTitle(doc, 'Tarefas');

        for (const task of tasks) {
          this.writeRecord(doc, [
            ['ID', task.id],
            ['Empresa', task.company?.name],
            ['Sala', task.room?.name],
            ['Equipamento', task.equipment?.name],
            ['Código equipamento', task.equipment?.code],
            ['Responsável', task.assignedToUser?.name],
            ['Email responsável', task.assignedToUser?.email],
            ['Título', task.title],
            ['Descrição', task.description],
            ['Prioridade', task.priority],
            ['Status', task.status],
            ['Vencimento', this.formatDate(task.dueDate)],
            ['Concluída em', this.formatDate(task.completedAt)],
            ['Criada em', this.formatDate(task.createdAt)],
          ]);
        }
      },
    );
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

    return this.createPdfBuffer(
      'Relatório de Atendimentos',
      query,
      period,
      serviceRecords.length,
      (doc) => {
        this.writeSectionTitle(doc, 'Resumo');

        this.writeKeyValue(doc, 'Total de atendimentos', serviceRecords.length);

        this.writeSectionTitle(doc, 'Atendimentos');

        for (const record of serviceRecords) {
          this.writeRecord(doc, [
            ['ID', record.id],
            ['Empresa', record.company?.name],
            ['Sala', record.room?.name],
            ['Equipamento', record.equipment?.name],
            ['Código equipamento', record.equipment?.code],
            ['Técnico', record.technician?.name],
            ['Email técnico', record.technician?.email],
            ['Tarefa', record.task?.title],
            ['Prioridade da tarefa', record.task?.priority],
            ['Status da tarefa', record.task?.status],
            ['Iniciado em', this.formatDate(record.startedAt)],
            ['Finalizado em', this.formatDate(record.finishedAt)],
            ['Tempo parado (min)', record.downtimeMinutes],
            [
              'Tempo parado (h)',
              record.downtimeMinutes !== null &&
              record.downtimeMinutes !== undefined
                ? Number((record.downtimeMinutes / 60).toFixed(2))
                : '',
            ],
            ['Problema encontrado', record.problemFound],
            ['Serviço realizado', record.servicePerformed],
            ['Observações', record.notes],
          ]);
        }
      },
    );
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

    const totalMinutes = serviceRecords.reduce(
      (sum, record) => sum + (record.downtimeMinutes ?? 0),
      0,
    );

    return this.createPdfBuffer(
      'Relatório de Tempo Parado',
      query,
      period,
      serviceRecords.length,
      (doc) => {
        this.writeSectionTitle(doc, 'Resumo');

        this.writeKeyValue(
          doc,
          'Total de registros com tempo parado',
          serviceRecords.length,
        );
        this.writeKeyValue(doc, 'Tempo parado total em minutos', totalMinutes);
        this.writeKeyValue(
          doc,
          'Tempo parado total em horas',
          Number((totalMinutes / 60).toFixed(2)),
        );

        this.writeSectionTitle(doc, 'Registros de tempo parado');

        for (const record of serviceRecords) {
          this.writeRecord(doc, [
            ['ID', record.id],
            ['Empresa', record.company?.name],
            ['Sala', record.room?.name],
            ['Equipamento', record.equipment?.name],
            ['Código equipamento', record.equipment?.code],
            ['Técnico', record.technician?.name],
            ['Tarefa', record.task?.title],
            ['Iniciado em', this.formatDate(record.startedAt)],
            ['Finalizado em', this.formatDate(record.finishedAt)],
            ['Tempo parado (min)', record.downtimeMinutes],
            [
              'Tempo parado (h)',
              Number(((record.downtimeMinutes ?? 0) / 60).toFixed(2)),
            ],
            ['Problema encontrado', record.problemFound],
            ['Serviço realizado', record.servicePerformed],
          ]);
        }
      },
    );
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

    return this.createPdfBuffer(
      'Relatório de Leituras Térmicas',
      query,
      period,
      readings.length,
      (doc) => {
        this.writeSectionTitle(doc, 'Resumo');

        this.writeKeyValue(doc, 'Total de leituras', readings.length);

        this.writeSectionTitle(doc, 'Leituras térmicas');

        for (const reading of readings) {
          this.writeRecord(doc, [
            ['ID', reading.id],
            ['Empresa', reading.company?.name],
            ['Sala', reading.room?.name],
            ['Status térmico da sala', reading.room?.thermalStatus],
            ['Temperatura', reading.temperature],
            ['Umidade', reading.humidity],
            ['Temperatura mínima', reading.room?.minTemperature],
            ['Temperatura máxima', reading.room?.maxTemperature],
            ['Sensor', reading.sensor?.code],
            ['Status sensor', reading.sensor?.status],
            ['Fonte', reading.source],
            ['Lida em', this.formatDate(reading.readAt)],
          ]);
        }
      },
    );
  }

  private createPdfBuffer(
    title: string,
    query: ReportsQueryDto,
    period: {
      startDate: Date;
      endDate: Date;
    },
    totalRows: number,
    buildContent: (doc: PdfDocument) => void,
  ) {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true,
    });

    const chunks: Buffer[] = [];

    return new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk) => {
        chunks.push(Buffer.from(chunk));
      });

      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on('error', (error) => {
        reject(error);
      });

      this.writeHeader(doc, title);
      this.writeMetadata(doc, query, period, totalRows);
      buildContent(doc);

      doc.end();
    });
  }

  private writeHeader(doc: PdfDocument, title: string) {
    doc.font('Helvetica-Bold').fontSize(18).text('CryoMap');
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(14).text(title);
    doc.moveDown(1);
  }

  private writeMetadata(
    doc: PdfDocument,
    query: ReportsQueryDto,
    period: {
      startDate: Date;
      endDate: Date;
    },
    totalRows: number,
  ) {
    this.writeSectionTitle(doc, 'Metadados');

    this.writeKeyValue(doc, 'Gerado em', this.formatDate(new Date()));
    this.writeKeyValue(
      doc,
      'Período inicial',
      this.formatDate(period.startDate),
    );
    this.writeKeyValue(doc, 'Período final', this.formatDate(period.endDate));
    this.writeKeyValue(doc, 'Empresa ID', query.companyId);
    this.writeKeyValue(doc, 'Sala ID', query.roomId);
    this.writeKeyValue(doc, 'Equipamento ID', query.equipmentId);
    this.writeKeyValue(doc, 'Técnico ID', query.technicianId);
    this.writeKeyValue(doc, 'Total de registros', totalRows);

    doc.moveDown(0.5);
  }

  private writeSectionTitle(doc: PdfDocument, title: string) {
    this.ensureSpace(doc, 70);

    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(12).text(title);
    doc.moveDown(0.3);
  }

  private writeKeyValue(
    doc: PdfDocument,
    key: string,
    value: string | number | Date | null | undefined,
  ) {
    this.ensureSpace(doc, 30);

    doc.font('Helvetica-Bold').fontSize(9).text(`${key}: `, {
      continued: true,
    });

    doc.font('Helvetica').fontSize(9).text(this.formatValue(value));
  }

  private writeRecord(
    doc: PdfDocument,
    fields: Array<[string, string | number | Date | null | undefined]>,
  ) {
    this.ensureSpace(doc, 120);

    doc.font('Helvetica-Bold').fontSize(10).text('Registro');
    doc.moveDown(0.2);

    for (const [key, value] of fields) {
      this.writeKeyValue(doc, key, value);
    }

    doc.moveDown(0.8);
  }

  private ensureSpace(doc: PdfDocument, neededSpace: number) {
    const bottomLimit = doc.page.height - doc.page.margins.bottom;

    if (doc.y + neededSpace > bottomLimit) {
      doc.addPage();
    }
  }

  private formatValue(value: string | number | Date | null | undefined) {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    if (value instanceof Date) {
      return this.formatDate(value);
    }

    const text = String(value);

    if (text.length > 300) {
      return `${text.slice(0, 300)}...`;
    }

    return text;
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

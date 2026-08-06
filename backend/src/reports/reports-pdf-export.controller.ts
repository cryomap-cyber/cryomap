import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ReportsQueryDto } from './dto/reports-query.dto.js';
import { ReportsPdfExportService } from './reports-pdf-export.service.js';

@UseGuards(JwtAuthGuard)
@Controller('reports/export')
export class ReportsPdfExportController {
  constructor(
    private readonly reportsPdfExportService: ReportsPdfExportService,
  ) {}

  @Get('tasks.pdf')
  async exportTasks(
    @Query() query: ReportsQueryDto,
    @Res() response: Response,
  ) {
    const buffer = await this.reportsPdfExportService.exportTasks(query);

    this.sendPdfFile(response, buffer, 'cryomap-tarefas.pdf');
  }

  @Get('service-records.pdf')
  async exportServiceRecords(
    @Query() query: ReportsQueryDto,
    @Res() response: Response,
  ) {
    const buffer =
      await this.reportsPdfExportService.exportServiceRecords(query);

    this.sendPdfFile(response, buffer, 'cryomap-atendimentos.pdf');
  }

  @Get('downtime.pdf')
  async exportDowntime(
    @Query() query: ReportsQueryDto,
    @Res() response: Response,
  ) {
    const buffer = await this.reportsPdfExportService.exportDowntime(query);

    this.sendPdfFile(response, buffer, 'cryomap-tempo-parado.pdf');
  }

  @Get('thermal-readings.pdf')
  async exportThermalReadings(
    @Query() query: ReportsQueryDto,
    @Res() response: Response,
  ) {
    const buffer =
      await this.reportsPdfExportService.exportThermalReadings(query);

    this.sendPdfFile(response, buffer, 'cryomap-leituras-termicas.pdf');
  }

  private sendPdfFile(response: Response, buffer: Buffer, fileName: string) {
    response.setHeader('Content-Type', 'application/pdf');

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`,
    );

    response.setHeader('Content-Length', buffer.length);

    response.end(buffer);
  }
}

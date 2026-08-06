import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ReportsQueryDto } from './dto/reports-query.dto.js';
import { ReportsExportService } from './reports-export.service.js';

@UseGuards(JwtAuthGuard)
@Controller('reports/export')
export class ReportsExportController {
  constructor(private readonly reportsExportService: ReportsExportService) {}

  @Get('tasks.xlsx')
  async exportTasks(
    @Query() query: ReportsQueryDto,
    @Res() response: Response,
  ) {
    const buffer = await this.reportsExportService.exportTasks(query);

    this.sendExcelFile(response, buffer, 'cryomap-tarefas.xlsx');
  }

  @Get('service-records.xlsx')
  async exportServiceRecords(
    @Query() query: ReportsQueryDto,
    @Res() response: Response,
  ) {
    const buffer = await this.reportsExportService.exportServiceRecords(query);

    this.sendExcelFile(response, buffer, 'cryomap-atendimentos.xlsx');
  }

  @Get('downtime.xlsx')
  async exportDowntime(
    @Query() query: ReportsQueryDto,
    @Res() response: Response,
  ) {
    const buffer = await this.reportsExportService.exportDowntime(query);

    this.sendExcelFile(response, buffer, 'cryomap-tempo-parado.xlsx');
  }

  @Get('thermal-readings.xlsx')
  async exportThermalReadings(
    @Query() query: ReportsQueryDto,
    @Res() response: Response,
  ) {
    const buffer = await this.reportsExportService.exportThermalReadings(query);

    this.sendExcelFile(response, buffer, 'cryomap-leituras-termicas.xlsx');
  }

  private sendExcelFile(response: Response, buffer: Buffer, fileName: string) {
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`,
    );

    response.setHeader('Content-Length', buffer.length);

    response.end(buffer);
  }
}

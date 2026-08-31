import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../generated/prisma/client.js';
import { ReportsQueryDto } from './dto/reports-query.dto.js';
import { ReportsAccessService } from './reports-access.service.js';
import { ReportsPdfExportService } from './reports-pdf-export.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR, UserRole.CLIENT_USER)
@Controller('reports/export')
export class ReportsPdfExportController {
  constructor(
    private readonly reportsPdfExportService: ReportsPdfExportService,
    private readonly reportsAccessService: ReportsAccessService,
  ) {}

  @Get('tasks.pdf')
  async exportTasks(
    @Query() query: ReportsQueryDto,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const scopedQuery = this.reportsAccessService.resolveQuery(
      query,
      request.user!,
    );

    const buffer = await this.reportsPdfExportService.exportTasks(scopedQuery);

    this.sendPdfFile(response, buffer, 'cryomap-tarefas.pdf');
  }

  @Get('service-records.pdf')
  async exportServiceRecords(
    @Query() query: ReportsQueryDto,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const scopedQuery = this.reportsAccessService.resolveQuery(
      query,
      request.user!,
    );

    const buffer =
      await this.reportsPdfExportService.exportServiceRecords(scopedQuery);

    this.sendPdfFile(response, buffer, 'cryomap-atendimentos.pdf');
  }

  @Get('downtime.pdf')
  async exportDowntime(
    @Query() query: ReportsQueryDto,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const scopedQuery = this.reportsAccessService.resolveQuery(
      query,
      request.user!,
    );

    const buffer =
      await this.reportsPdfExportService.exportDowntime(scopedQuery);

    this.sendPdfFile(response, buffer, 'cryomap-tempo-parado.pdf');
  }

  @Get('thermal-readings.pdf')
  async exportThermalReadings(
    @Query() query: ReportsQueryDto,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const scopedQuery = this.reportsAccessService.resolveQuery(
      query,
      request.user!,
    );

    const buffer =
      await this.reportsPdfExportService.exportThermalReadings(scopedQuery);

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

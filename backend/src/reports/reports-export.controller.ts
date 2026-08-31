import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../generated/prisma/client.js';
import { ReportsQueryDto } from './dto/reports-query.dto.js';
import { ReportsAccessService } from './reports-access.service.js';
import { ReportsExportService } from './reports-export.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR, UserRole.CLIENT_USER)
@Controller('reports/export')
export class ReportsExportController {
  constructor(
    private readonly reportsExportService: ReportsExportService,
    private readonly reportsAccessService: ReportsAccessService,
  ) {}

  @Get('tasks.xlsx')
  async exportTasks(
    @Query() query: ReportsQueryDto,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const scopedQuery = this.reportsAccessService.resolveQuery(
      query,
      request.user!,
    );

    const buffer = await this.reportsExportService.exportTasks(scopedQuery);

    this.sendExcelFile(response, buffer, 'cryomap-tarefas.xlsx');
  }

  @Get('service-records.xlsx')
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
      await this.reportsExportService.exportServiceRecords(scopedQuery);

    this.sendExcelFile(response, buffer, 'cryomap-atendimentos.xlsx');
  }

  @Get('downtime.xlsx')
  async exportDowntime(
    @Query() query: ReportsQueryDto,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const scopedQuery = this.reportsAccessService.resolveQuery(
      query,
      request.user!,
    );

    const buffer = await this.reportsExportService.exportDowntime(scopedQuery);

    this.sendExcelFile(response, buffer, 'cryomap-tempo-parado.xlsx');
  }

  @Get('thermal-readings.xlsx')
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
      await this.reportsExportService.exportThermalReadings(scopedQuery);

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

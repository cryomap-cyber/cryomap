import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../generated/prisma/client.js';
import { ReportsQueryDto } from './dto/reports-query.dto.js';
import { ReportsAccessService } from './reports-access.service.js';
import { ReportsService } from './reports.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR, UserRole.CLIENT_USER)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportsAccessService: ReportsAccessService,
  ) {}

  @Get('operational-summary')
  getOperationalSummary(
    @Query() query: ReportsQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const scopedQuery = this.reportsAccessService.resolveQuery(
      query,
      request.user!,
    );

    return this.reportsService.getOperationalSummary(scopedQuery);
  }

  @Get('tasks-summary')
  getTasksSummary(
    @Query() query: ReportsQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const scopedQuery = this.reportsAccessService.resolveQuery(
      query,
      request.user!,
    );

    return this.reportsService.getTasksSummary(scopedQuery);
  }

  @Get('service-records-summary')
  getServiceRecordsSummary(
    @Query() query: ReportsQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const scopedQuery = this.reportsAccessService.resolveQuery(
      query,
      request.user!,
    );

    return this.reportsService.getServiceRecordsSummary(scopedQuery);
  }

  @Get('downtime-summary')
  getDowntimeSummary(
    @Query() query: ReportsQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const scopedQuery = this.reportsAccessService.resolveQuery(
      query,
      request.user!,
    );

    return this.reportsService.getDowntimeSummary(scopedQuery);
  }

  @Get('thermal-readings-summary')
  getThermalReadingsSummary(
    @Query() query: ReportsQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const scopedQuery = this.reportsAccessService.resolveQuery(
      query,
      request.user!,
    );

    return this.reportsService.getThermalReadingsSummary(scopedQuery);
  }
}

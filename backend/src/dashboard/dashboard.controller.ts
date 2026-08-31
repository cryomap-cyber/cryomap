import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { DashboardQueryDto } from './dto/dashboard-query.dto.js';
import { DashboardService } from './dashboard.service.js';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview(
    @Query() query: DashboardQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dashboardService.getOverview(query, request.user!);
  }
}

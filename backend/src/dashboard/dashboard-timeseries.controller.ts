import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { DashboardTimeseriesService } from './dashboard-timeseries.service.js';
import { RecentRoomReadingsQueryDto } from './dto/recent-room-readings-query.dto.js';
import { RoomSeriesQueryDto } from './dto/room-series-query.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardTimeseriesController {
  constructor(
    private readonly dashboardTimeseriesService: DashboardTimeseriesService,
  ) {}

  @Get('room-temperature-series')
  getRoomTemperatureSeries(
    @Query() query: RoomSeriesQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dashboardTimeseriesService.getRoomTemperatureSeries(
      query,
      request.user!,
    );
  }

  @Get('room-humidity-series')
  getRoomHumiditySeries(
    @Query() query: RoomSeriesQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dashboardTimeseriesService.getRoomHumiditySeries(
      query,
      request.user!,
    );
  }

  @Get('room-readings-summary')
  getRoomReadingsSummary(
    @Query() query: RoomSeriesQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dashboardTimeseriesService.getRoomReadingsSummary(
      query,
      request.user!,
    );
  }

  @Get('recent-room-readings')
  getRecentRoomReadings(
    @Query() query: RecentRoomReadingsQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.dashboardTimeseriesService.getRecentRoomReadings(
      query,
      request.user!,
    );
  }
}

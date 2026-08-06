import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RecentRoomReadingsQueryDto } from './dto/recent-room-readings-query.dto.js';
import { RoomSeriesQueryDto } from './dto/room-series-query.dto.js';
import { DashboardTimeseriesService } from './dashboard-timeseries.service.js';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardTimeseriesController {
  constructor(
    private readonly dashboardTimeseriesService: DashboardTimeseriesService,
  ) {}

  @Get('room-temperature-series')
  getRoomTemperatureSeries(@Query() query: RoomSeriesQueryDto) {
    return this.dashboardTimeseriesService.getRoomTemperatureSeries(query);
  }

  @Get('room-humidity-series')
  getRoomHumiditySeries(@Query() query: RoomSeriesQueryDto) {
    return this.dashboardTimeseriesService.getRoomHumiditySeries(query);
  }

  @Get('room-readings-summary')
  getRoomReadingsSummary(@Query() query: RoomSeriesQueryDto) {
    return this.dashboardTimeseriesService.getRoomReadingsSummary(query);
  }

  @Get('recent-room-readings')
  getRecentRoomReadings(@Query() query: RecentRoomReadingsQueryDto) {
    return this.dashboardTimeseriesService.getRecentRoomReadings(query);
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ReportsQueryDto } from './dto/reports-query.dto.js';
import { ReportsService } from './reports.service.js';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('operational-summary')
  getOperationalSummary(@Query() query: ReportsQueryDto) {
    return this.reportsService.getOperationalSummary(query);
  }

  @Get('tasks-summary')
  getTasksSummary(@Query() query: ReportsQueryDto) {
    return this.reportsService.getTasksSummary(query);
  }

  @Get('service-records-summary')
  getServiceRecordsSummary(@Query() query: ReportsQueryDto) {
    return this.reportsService.getServiceRecordsSummary(query);
  }

  @Get('downtime-summary')
  getDowntimeSummary(@Query() query: ReportsQueryDto) {
    return this.reportsService.getDowntimeSummary(query);
  }

  @Get('thermal-readings-summary')
  getThermalReadingsSummary(@Query() query: ReportsQueryDto) {
    return this.reportsService.getThermalReadingsSummary(query);
  }
}

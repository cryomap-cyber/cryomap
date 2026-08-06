import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { DashboardTimeseriesController } from './dashboard-timeseries.controller.js';
import { DashboardTimeseriesService } from './dashboard-timeseries.service.js';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController, DashboardTimeseriesController],
  providers: [DashboardService, DashboardTimeseriesService],
})
export class DashboardModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ReportsExportController } from './reports-export.controller.js';
import { ReportsExportService } from './reports-export.service.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ReportsController, ReportsExportController],
  providers: [ReportsService, ReportsExportService],
})
export class ReportsModule {}

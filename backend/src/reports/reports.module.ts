import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ReportsExportController } from './reports-export.controller.js';
import { ReportsExportService } from './reports-export.service.js';
import { ReportsPdfExportController } from './reports-pdf-export.controller.js';
import { ReportsPdfExportService } from './reports-pdf-export.service.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [AuthModule],
  controllers: [
    ReportsController,
    ReportsExportController,
    ReportsPdfExportController,
  ],
  providers: [ReportsService, ReportsExportService, ReportsPdfExportService],
})
export class ReportsModule {}

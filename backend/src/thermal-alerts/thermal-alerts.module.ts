import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ThermalAlertsController } from './thermal-alerts.controller.js';
import { ThermalAlertsService } from './thermal-alerts.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ThermalAlertsController],
  providers: [ThermalAlertsService],
})
export class ThermalAlertsModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { EquipmentTemperatureReadingsController } from './equipment-temperature-readings.controller.js';
import { EquipmentTemperatureReadingsService } from './equipment-temperature-readings.service.js';

@Module({
  imports: [AuthModule],
  controllers: [EquipmentTemperatureReadingsController],
  providers: [EquipmentTemperatureReadingsService],
})
export class EquipmentTemperatureReadingsModule {}

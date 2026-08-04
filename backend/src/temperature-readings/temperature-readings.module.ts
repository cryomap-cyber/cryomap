import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TemperatureReadingsController } from './temperature-readings.controller.js';
import { TemperatureReadingsService } from './temperature-readings.service.js';

@Module({
  imports: [AuthModule],
  controllers: [TemperatureReadingsController],
  providers: [TemperatureReadingsService],
})
export class TemperatureReadingsModule {}

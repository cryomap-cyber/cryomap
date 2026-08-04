import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SensorsController } from './sensors.controller.js';
import { SensorsService } from './sensors.service.js';

@Module({
  imports: [AuthModule],
  controllers: [SensorsController],
  providers: [SensorsService],
})
export class SensorsModule {}

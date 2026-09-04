import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { TemperatureReadingsModule } from '../temperature-readings/temperature-readings.module.js';
import { GoveeService } from './govee.service.js';

@Module({
  imports: [PrismaModule, TemperatureReadingsModule],
  providers: [GoveeService],
  exports: [GoveeService],
})
export class GoveeModule {}

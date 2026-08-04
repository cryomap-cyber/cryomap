import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { EquipmentsController } from './equipments.controller.js';
import { EquipmentsService } from './equipments.service.js';

@Module({
  imports: [AuthModule],
  controllers: [EquipmentsController],
  providers: [EquipmentsService],
})
export class EquipmentsModule {}

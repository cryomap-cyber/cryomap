import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { FindThermalAlertsDto } from './dto/find-thermal-alerts.dto.js';
import { ThermalAlertsService } from './thermal-alerts.service.js';

@UseGuards(JwtAuthGuard)
@Controller('thermal-alerts')
export class ThermalAlertsController {
  constructor(private readonly thermalAlertsService: ThermalAlertsService) {}

  @Get()
  findAll(@Query() filters: FindThermalAlertsDto) {
    return this.thermalAlertsService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.thermalAlertsService.findOne(id);
  }

  @Patch(':id/acknowledge')
  acknowledge(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.thermalAlertsService.acknowledge(id, request.user?.id);
  }

  @Patch(':id/resolve')
  resolve(@Param('id') id: string) {
    return this.thermalAlertsService.resolve(id);
  }

  @Patch(':id/dismiss')
  dismiss(@Param('id') id: string) {
    return this.thermalAlertsService.dismiss(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.thermalAlertsService.remove(id);
  }
}

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

import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../generated/prisma/client.js';
import { FindThermalAlertsDto } from './dto/find-thermal-alerts.dto.js';
import { ThermalAlertsService } from './thermal-alerts.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('thermal-alerts')
export class ThermalAlertsController {
  constructor(private readonly thermalAlertsService: ThermalAlertsService) {}

  @Roles(
    UserRole.MASTER_ADMIN,
    UserRole.SUPERVISOR,
    UserRole.CLIENT_USER,
    UserRole.TECHNICIAN,
  )
  @Get()
  findAll(
    @Query() filters: FindThermalAlertsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.thermalAlertsService.findAll(filters, request.user!);
  }

  @Roles(
    UserRole.MASTER_ADMIN,
    UserRole.SUPERVISOR,
    UserRole.CLIENT_USER,
    UserRole.TECHNICIAN,
  )
  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.thermalAlertsService.findOne(id, request.user!);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
  @Patch(':id/acknowledge')
  acknowledge(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.thermalAlertsService.acknowledge(id, request.user!);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
  @Patch(':id/resolve')
  resolve(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.thermalAlertsService.resolve(id, request.user!);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
  @Patch(':id/dismiss')
  dismiss(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.thermalAlertsService.dismiss(id, request.user!);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.thermalAlertsService.remove(id, request.user!);
  }
}

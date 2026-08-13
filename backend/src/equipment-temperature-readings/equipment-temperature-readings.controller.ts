import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../generated/prisma/client.js';
import { CreateEquipmentTemperatureReadingDto } from './dto/create-equipment-temperature-reading.dto.js';
import { FindEquipmentTemperatureReadingsDto } from './dto/find-equipment-temperature-readings.dto.js';
import { EquipmentTemperatureReadingsService } from './equipment-temperature-readings.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
@Controller('equipment-temperature-readings')
export class EquipmentTemperatureReadingsController {
  constructor(
    private readonly equipmentTemperatureReadingsService: EquipmentTemperatureReadingsService,
  ) {}

  @Post()
  create(
    @Body() createDto: CreateEquipmentTemperatureReadingDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.equipmentTemperatureReadingsService.create(
      createDto,
      request.user!,
    );
  }

  @Get()
  findAll(
    @Query() filters: FindEquipmentTemperatureReadingsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.equipmentTemperatureReadingsService.findAll(
      filters,
      request.user!,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.equipmentTemperatureReadingsService.findOne(id, request.user!);
  }
}

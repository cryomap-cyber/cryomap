import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { UpdateEquipmentTemperatureReadingDto } from './dto/update-equipment-temperature-reading.dto.js';
import { EquipmentTemperatureReadingsService } from './equipment-temperature-readings.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipment-temperature-readings')
export class EquipmentTemperatureReadingsController {
  constructor(
    private readonly equipmentTemperatureReadingsService: EquipmentTemperatureReadingsService,
  ) {}

  @Post()
  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
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
  @Roles(
    UserRole.MASTER_ADMIN,
    UserRole.SUPERVISOR,
    UserRole.CLIENT_USER,
    UserRole.TECHNICIAN,
  )
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
  @Roles(
    UserRole.MASTER_ADMIN,
    UserRole.SUPERVISOR,
    UserRole.CLIENT_USER,
    UserRole.TECHNICIAN,
  )
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.equipmentTemperatureReadingsService.findOne(id, request.user!);
  }

  @Patch(':id')
  @Roles(UserRole.MASTER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEquipmentTemperatureReadingDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.equipmentTemperatureReadingsService.update(
      id,
      updateDto,
      request.user!,
    );
  }

  @Delete(':id')
  @Roles(UserRole.MASTER_ADMIN)
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.equipmentTemperatureReadingsService.remove(id, request.user!);
  }
}

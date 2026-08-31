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
import { CreateRoomTemperatureReadingDto } from './dto/create-room-temperature-reading.dto.js';
import { FindRoomTemperatureReadingsDto } from './dto/find-room-temperature-readings.dto.js';
import { TemperatureReadingsService } from './temperature-readings.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('temperature-readings')
export class TemperatureReadingsController {
  constructor(
    private readonly temperatureReadingsService: TemperatureReadingsService,
  ) {}

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
  @Post()
  create(
    @Body() createDto: CreateRoomTemperatureReadingDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.temperatureReadingsService.create(createDto, request.user);
  }

  @Get()
  findAll(
    @Query() filters: FindRoomTemperatureReadingsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.temperatureReadingsService.findAll(filters, request.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.temperatureReadingsService.findOne(id, request.user);
  }
}

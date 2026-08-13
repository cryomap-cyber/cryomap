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
import { CreateSensorDto } from './dto/create-sensor.dto.js';
import { UpdateSensorDto } from './dto/update-sensor.dto.js';
import { SensorsService } from './sensors.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sensors')
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR)
  @Post()
  create(@Body() createSensorDto: CreateSensorDto) {
    return this.sensorsService.create(createSensorDto);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR, UserRole.CLIENT_USER)
  @Get()
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query('companyId') companyId?: string,
    @Query('roomId') roomId?: string,
  ) {
    return this.sensorsService.findAll(request.user!, companyId, roomId);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR, UserRole.CLIENT_USER)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.sensorsService.findOne(id, request.user!);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSensorDto: UpdateSensorDto) {
    return this.sensorsService.update(id, updateSensorDto);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sensorsService.remove(id);
  }
}

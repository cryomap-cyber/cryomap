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
import { CreateServiceRecordDto } from './dto/create-service-record.dto.js';
import { FindServiceRecordsDto } from './dto/find-service-records.dto.js';
import { UpdateServiceRecordDto } from './dto/update-service-record.dto.js';
import { ServiceRecordsService } from './service-records.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('service-records')
export class ServiceRecordsController {
  constructor(private readonly serviceRecordsService: ServiceRecordsService) {}

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
  @Post()
  create(
    @Body() createDto: CreateServiceRecordDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.serviceRecordsService.create(createDto, request.user!);
  }

  @Roles(
    UserRole.MASTER_ADMIN,
    UserRole.SUPERVISOR,
    UserRole.CLIENT_USER,
    UserRole.TECHNICIAN,
  )
  @Get()
  findAll(
    @Query() filters: FindServiceRecordsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.serviceRecordsService.findAll(filters, request.user!);
  }

  @Roles(
    UserRole.MASTER_ADMIN,
    UserRole.SUPERVISOR,
    UserRole.CLIENT_USER,
    UserRole.TECHNICIAN,
  )
  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.serviceRecordsService.findOne(id, request.user!);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceRecordDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.serviceRecordsService.update(id, updateDto, request.user!);
  }

  @Roles(UserRole.MASTER_ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.serviceRecordsService.remove(id, request.user!);
  }
}

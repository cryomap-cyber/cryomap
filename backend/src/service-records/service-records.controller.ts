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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { CreateServiceRecordDto } from './dto/create-service-record.dto.js';
import { FindServiceRecordsDto } from './dto/find-service-records.dto.js';
import { UpdateServiceRecordDto } from './dto/update-service-record.dto.js';
import { ServiceRecordsService } from './service-records.service.js';

@UseGuards(JwtAuthGuard)
@Controller('service-records')
export class ServiceRecordsController {
  constructor(private readonly serviceRecordsService: ServiceRecordsService) {}

  @Post()
  create(
    @Body() createDto: CreateServiceRecordDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.serviceRecordsService.create(createDto, request.user?.id);
  }

  @Get()
  findAll(@Query() filters: FindServiceRecordsDto) {
    return this.serviceRecordsService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.serviceRecordsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateServiceRecordDto) {
    return this.serviceRecordsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.serviceRecordsService.remove(id);
  }
}

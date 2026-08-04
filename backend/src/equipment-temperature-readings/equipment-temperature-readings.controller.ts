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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { CreateEquipmentTemperatureReadingDto } from './dto/create-equipment-temperature-reading.dto.js';
import { FindEquipmentTemperatureReadingsDto } from './dto/find-equipment-temperature-readings.dto.js';
import { EquipmentTemperatureReadingsService } from './equipment-temperature-readings.service.js';

@UseGuards(JwtAuthGuard)
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
      request.user?.id,
    );
  }

  @Get()
  findAll(@Query() filters: FindEquipmentTemperatureReadingsDto) {
    return this.equipmentTemperatureReadingsService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.equipmentTemperatureReadingsService.findOne(id);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateRoomTemperatureReadingDto } from './dto/create-room-temperature-reading.dto.js';
import { FindRoomTemperatureReadingsDto } from './dto/find-room-temperature-readings.dto.js';
import { TemperatureReadingsService } from './temperature-readings.service.js';

@UseGuards(JwtAuthGuard)
@Controller('temperature-readings')
export class TemperatureReadingsController {
  constructor(
    private readonly temperatureReadingsService: TemperatureReadingsService,
  ) {}

  @Post()
  create(@Body() createDto: CreateRoomTemperatureReadingDto) {
    return this.temperatureReadingsService.create(createDto);
  }

  @Get()
  findAll(@Query() filters: FindRoomTemperatureReadingsDto) {
    return this.temperatureReadingsService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.temperatureReadingsService.findOne(id);
  }
}

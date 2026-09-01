import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { EquipmentTemperatureSource } from '../../generated/prisma/client.js';

export class CreateEquipmentTemperatureReadingDto {
  @IsUUID()
  companyId!: string;

  @IsUUID()
  equipmentId!: string;

  @IsNumber()
  temperature!: number;

  @IsOptional()
  @IsNumber()
  dischargePressure?: number;

  @IsOptional()
  @IsNumber()
  suctionPressure?: number;

  @IsOptional()
  @IsNumber()
  liquidLineTemperature?: number;

  @IsOptional()
  @IsNumber()
  evaporationTemperature?: number;

  @IsOptional()
  @IsNumber()
  superheating?: number;

  @IsOptional()
  @IsNumber()
  subcooling?: number;

  @IsOptional()
  @IsNumber()
  airFlow?: number;

  @IsOptional()
  @IsEnum(EquipmentTemperatureSource)
  source?: EquipmentTemperatureSource;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  measuredAt?: string;
}

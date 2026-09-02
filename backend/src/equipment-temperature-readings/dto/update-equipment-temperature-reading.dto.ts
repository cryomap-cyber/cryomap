import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { EquipmentTemperatureSource } from '../../generated/prisma/client.js';

export class UpdateEquipmentTemperatureReadingDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  equipmentId?: string;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  dischargePressure?: number | null;

  @IsOptional()
  @IsNumber()
  suctionPressure?: number | null;

  @IsOptional()
  @IsNumber()
  liquidLineTemperature?: number | null;

  @IsOptional()
  @IsNumber()
  evaporationTemperature?: number | null;

  @IsOptional()
  @IsNumber()
  superheating?: number | null;

  @IsOptional()
  @IsNumber()
  subcooling?: number | null;

  @IsOptional()
  @IsNumber()
  airFlow?: number | null;

  @IsOptional()
  @IsEnum(EquipmentTemperatureSource)
  source?: EquipmentTemperatureSource;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsDateString()
  measuredAt?: string;
}

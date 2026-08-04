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
  @IsEnum(EquipmentTemperatureSource)
  source?: EquipmentTemperatureSource;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  measuredAt?: string;
}

import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ThermalStatus } from '../../generated/prisma/client.js';

export class UpdateRoomDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  type?: string | null;

  @IsOptional()
  @IsNumber()
  minTemperature?: number | null;

  @IsOptional()
  @IsNumber()
  maxTemperature?: number | null;

  @IsOptional()
  @IsNumber()
  currentTemperature?: number | null;

  @IsOptional()
  @IsEnum(ThermalStatus)
  thermalStatus?: ThermalStatus;

  @IsOptional()
  @IsNumber()
  mapX?: number | null;

  @IsOptional()
  @IsNumber()
  mapY?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

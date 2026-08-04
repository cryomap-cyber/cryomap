import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SensorStatus, SensorType } from '../../generated/prisma/client.js';

export class UpdateSensorDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  code?: string;

  @IsOptional()
  @IsEnum(SensorType)
  type?: SensorType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string | null;

  @IsOptional()
  @IsEnum(SensorStatus)
  status?: SensorStatus;

  @IsOptional()
  @IsNumber()
  lastTemperature?: number | null;

  @IsOptional()
  @IsNumber()
  lastHumidity?: number | null;
}

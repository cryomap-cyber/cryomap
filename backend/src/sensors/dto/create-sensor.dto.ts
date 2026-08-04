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

export class CreateSensorDto {
  @IsUUID()
  companyId!: string;

  @IsUUID()
  roomId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  code!: string;

  @IsOptional()
  @IsEnum(SensorType)
  type?: SensorType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @IsEnum(SensorStatus)
  status?: SensorStatus;

  @IsOptional()
  @IsNumber()
  lastTemperature?: number;

  @IsOptional()
  @IsNumber()
  lastHumidity?: number;
}

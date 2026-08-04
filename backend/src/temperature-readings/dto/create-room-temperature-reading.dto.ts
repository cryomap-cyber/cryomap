import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ReadingSource } from '../../generated/prisma/client.js';

export class CreateRoomTemperatureReadingDto {
  @IsUUID()
  companyId!: string;

  @IsUUID()
  roomId!: string;

  @IsOptional()
  @IsUUID()
  sensorId?: string;

  @IsNumber()
  temperature!: number;

  @IsOptional()
  @IsNumber()
  humidity?: number;

  @IsOptional()
  @IsEnum(ReadingSource)
  source?: ReadingSource;

  @IsOptional()
  @IsDateString()
  readAt?: string;
}

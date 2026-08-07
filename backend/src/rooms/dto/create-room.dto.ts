import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRoomDto {
  @IsUUID()
  companyId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  type?: string;

  @IsOptional()
  @IsNumber()
  minTemperature?: number;

  @IsOptional()
  @IsNumber()
  maxTemperature?: number;

  @IsOptional()
  @IsNumber()
  currentTemperature?: number;

  @IsOptional()
  @IsNumber()
  mapX?: number;

  @IsOptional()
  @IsNumber()
  mapY?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

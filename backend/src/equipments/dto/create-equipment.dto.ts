import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateEquipmentDto {
  @IsUUID()
  companyId!: string;

  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  serialNumber?: string;

  @IsOptional()
  @IsNumber()
  setpoint?: number;

  @IsOptional()
  @IsNumber()
  delta?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

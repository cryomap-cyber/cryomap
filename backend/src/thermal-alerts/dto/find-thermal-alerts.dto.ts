import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  ThermalAlertSeverity,
  ThermalAlertStatus,
  ThermalAlertType,
} from '../../generated/prisma/client.js';

export class FindThermalAlertsDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsUUID()
  sensorId?: string;

  @IsOptional()
  @IsEnum(ThermalAlertType)
  type?: ThermalAlertType;

  @IsOptional()
  @IsEnum(ThermalAlertSeverity)
  severity?: ThermalAlertSeverity;

  @IsOptional()
  @IsEnum(ThermalAlertStatus)
  status?: ThermalAlertStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

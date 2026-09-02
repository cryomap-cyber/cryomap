import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateServiceRecordDto {
  @IsUUID()
  taskId!: string;

  @IsOptional()
  @IsUUID()
  technicianId?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  finishedAt?: string;

  @IsOptional()
  @IsString()
  standardizedProblem?: string;

  @IsOptional()
  @IsString()
  problemFound?: string;

  @IsOptional()
  @IsString()
  servicePerformed?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

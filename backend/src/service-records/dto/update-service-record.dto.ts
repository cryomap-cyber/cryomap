import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateServiceRecordDto {
  @IsOptional()
  @IsUUID()
  technicianId?: string | null;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  finishedAt?: string | null;

  @IsOptional()
  @IsString()
  problemFound?: string | null;

  @IsOptional()
  @IsString()
  servicePerformed?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

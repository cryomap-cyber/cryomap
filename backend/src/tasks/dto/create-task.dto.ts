import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  TaskOrigin,
  TaskPriority,
  TaskStatus,
} from '../../generated/prisma/client.js';

export class CreateTaskDto {
  @IsUUID()
  companyId!: string;

  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsUUID()
  equipmentId?: string;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskOrigin)
  origin?: TaskOrigin;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  externalUrl?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

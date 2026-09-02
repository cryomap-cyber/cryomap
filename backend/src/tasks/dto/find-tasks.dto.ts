import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import {
  TaskOrigin,
  TaskPriority,
  TaskStatus,
} from '../../generated/prisma/client.js';

export class FindTasksDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsUUID()
  equipmentId?: string;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsEnum(TaskOrigin)
  origin?: TaskOrigin;

  @IsOptional()
  @IsString()
  externalCode?: string;

  @IsOptional()
  @IsDateString()
  startDueDate?: string;

  @IsOptional()
  @IsDateString()
  endDueDate?: string;
}

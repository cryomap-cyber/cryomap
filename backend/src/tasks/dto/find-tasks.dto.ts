import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TaskPriority, TaskStatus } from '../../generated/prisma/client.js';

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
  @IsDateString()
  startDueDate?: string;

  @IsOptional()
  @IsDateString()
  endDueDate?: string;
}

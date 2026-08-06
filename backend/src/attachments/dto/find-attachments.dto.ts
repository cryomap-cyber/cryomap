import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { AttachmentType } from '../../generated/prisma/client.js';

export class FindAttachmentsDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  taskId?: string;

  @IsOptional()
  @IsUUID()
  serviceRecordId?: string;

  @IsOptional()
  @IsUUID()
  uploadedByUserId?: string;

  @IsOptional()
  @IsEnum(AttachmentType)
  type?: AttachmentType;
}

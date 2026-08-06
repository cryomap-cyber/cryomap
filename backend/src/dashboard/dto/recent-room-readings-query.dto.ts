import { IsNumberString, IsOptional, IsUUID } from 'class-validator';

export class RecentRoomReadingsQueryDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}

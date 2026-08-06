import {
  IsDateString,
  IsNumberString,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class RoomSeriesQueryDto {
  @IsUUID()
  companyId!: string;

  @IsUUID()
  roomId!: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}

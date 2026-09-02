import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class FindServiceProblemSuggestionsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBooleanString()
  includeInactive?: string;
}

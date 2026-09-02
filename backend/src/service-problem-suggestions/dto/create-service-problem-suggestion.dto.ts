import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateServiceProblemSuggestionDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

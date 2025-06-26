import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateTournamentResultDto } from './update-tournament-result.dto';

export class BulkUpdateResultsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTournamentResultDto)
  results: UpdateTournamentResultDto[];
}
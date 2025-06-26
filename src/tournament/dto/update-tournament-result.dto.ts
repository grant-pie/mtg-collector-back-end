import { IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class UpdateTournamentResultDto {
  @IsString()
  userId: string;

  @IsNumber()
  @Min(0)
  wins: number;

  @IsNumber()
  @Min(0)
  losses: number;
}
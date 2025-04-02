import { IsNotEmpty, IsBoolean } from 'class-validator';

export class RespondTradeDto {
  @IsNotEmpty()
  @IsBoolean()
  accept: boolean;
}
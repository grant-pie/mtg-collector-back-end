// src/trade/dto/create-trade.dto.ts
import { IsNotEmpty, IsArray, IsString, ArrayMinSize } from 'class-validator';

export class CreateTradeDto {
  @IsNotEmpty()
  @IsString()
  receiverId: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  initiatorCardIds: string[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  receiverCardIds: string[];
}


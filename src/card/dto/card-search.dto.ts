// src/card/dto/card-search.dto.ts
import { IsOptional, IsString, IsArray } from 'class-validator';

export class CardSearchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsArray()
  colors?: string[];

  @IsOptional()
  @IsString()
  rarity?: string;

  @IsOptional()
  @IsString()
  set?: string;
}
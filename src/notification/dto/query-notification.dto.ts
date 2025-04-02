// src/notification/dto/query-notification.dto.ts
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';
import { Transform } from 'class-transformer';

export class QueryNotificationDto {
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  read?: boolean;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
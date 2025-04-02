// src/trade/trade.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradeController } from './trade.controller';
import { TradeService } from './trade.service';
import { Trade } from './entities/trade.entity';
import { UserCardModule } from '../user-card/user-card.module';
import { NotificationModule } from '../notification/notification.module';
import { DeckModule } from '../deck/deck.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trade]),
    UserCardModule,
    NotificationModule,
    DeckModule
  ],
  controllers: [TradeController],
  providers: [TradeService],
  exports: [TradeService]
})
export class TradeModule {}
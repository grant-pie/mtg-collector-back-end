import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeckController } from './deck.controller';
import { DeckService } from './deck.service';
import { Deck } from './entities/deck.entity';
import { CardModule } from '../card/card.module';
import { Card } from '../card/entities/card.entity';
import { UserModule } from '../user/user.module';
import { UserCardModule } from '../user-card/user-card.module';
import { UserCard } from '../user-card/entities/user-card.entity'; // Add this import

@Module({
  imports: [
    TypeOrmModule.forFeature([Deck, Card, UserCard]), // Add UserCard here
    CardModule,
    UserModule,
    UserCardModule,
  ],
  controllers: [DeckController],
  providers: [DeckService],
  exports: [DeckService],
})
export class DeckModule {}
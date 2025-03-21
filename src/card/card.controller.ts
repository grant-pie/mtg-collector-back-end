// src/card/card.controller.ts
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CardService } from './card.service';
import { Card } from './entities/card.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../user/enums/role.enum';

@Controller('cards')
@UseGuards(AuthGuard('jwt'))
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Get()
  async findAll(@Query() query): Promise<Card[]> {
    // If there are search parameters, use search function
    if (Object.keys(query).length > 0) {
      return this.cardService.search(query);
    }
    // Otherwise return all cards
    return this.cardService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Card> {
    return this.cardService.findOne(id);
  }

  @Get('scryfall/:scryfallId')
  async findByscryfallId(@Param('scryfallId') scryfallId: string): Promise<Card> {
    const card = await this.cardService.findByScryfallId(scryfallId);
    if (!card) {
      // If card doesn't exist in our database, fetch it
      return this.cardService.createOrUpdate(scryfallId);
    }
    return card;
  }
}
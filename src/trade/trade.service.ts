// src/trade/trade.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trade, TradeStatus } from './entities/trade.entity';
import { CreateTradeDto } from './dto/create-trade.dto';
import { RespondTradeDto } from './dto/respond-trade.dto';
import { UserCardService } from '../user-card/user-card.service';
import { NotificationService } from '../notification/notification.service';
import { DeckService } from '../deck/deck.service';
import { NotificationType } from '../notification/entities/notification.entity';

@Injectable()
export class TradeService {
  constructor(
    @InjectRepository(Trade)
    private tradeRepository: Repository<Trade>,
    private userCardService: UserCardService,
    private notificationService: NotificationService,
    private deckService: DeckService,
  ) {}

  async create(user: any, createTradeDto: CreateTradeDto): Promise<Trade> {
    const { receiverId, initiatorCardIds, receiverCardIds } = createTradeDto;
    
    // Verify all initiator cards belong to the initiator
    await this.validateCardsOwnership(user.id, initiatorCardIds);
    
    // Verify all receiver cards belong to the receiver
    await this.validateCardsOwnership(receiverId, receiverCardIds);
    
    // Remove cards from decks if they are in any
    await this.removeCardsFromDecks([...initiatorCardIds, ...receiverCardIds]);
    
    // Create the trade
    const trade = this.tradeRepository.create({
      initiatorId: user.id,
      receiverId,
      initiatorCards: initiatorCardIds,
      receiverCards: receiverCardIds,
      status: TradeStatus.PENDING
    });
    
    await this.tradeRepository.save(trade);
    
    // Create notification for the receiver
    await this.notificationService.create({
      userId: receiverId,
      type: NotificationType.TRADE_OFFER,
      title: 'New Trade Offer',
      message: `You have received a new trade offer.`
    });
    
    return trade;
  }

  async findAll(userId: string): Promise<Trade[]> {
    return this.tradeRepository.find({
      where: [
        { initiatorId: userId },
        { receiverId: userId }
      ],
      order: {
        createdAt: 'DESC'
      }
    });
  }

  async findPending(userId: string): Promise<Trade[]> {
    return this.tradeRepository.find({
      where: [
        { initiatorId: userId, status: TradeStatus.PENDING },
        { receiverId: userId, status: TradeStatus.PENDING }
      ],
      order: {
        createdAt: 'DESC'
      }
    });
  }

  async findOne(id: string): Promise<Trade> {
    const trade = await this.tradeRepository.findOne({
      where: { id }
    });
    
    if (!trade) {
      throw new NotFoundException(`Trade with ID ${id} not found`);
    }
    
    return trade;
  }

  async respondToTrade(user: any, id: string, respondTradeDto: RespondTradeDto): Promise<Trade> {
    const { accept } = respondTradeDto;
    const trade = await this.findOne(id);
    
    // Verify the user is the receiver of the trade
    if (trade.receiverId !== user.id) {
      throw new ForbiddenException('Only the trade receiver can respond to this trade');
    }
    
    // Verify the trade is in pending status
    if (trade.status !== TradeStatus.PENDING) {
      throw new BadRequestException(`This trade is already ${trade.status}`);
    }
    
    // Remove cards from decks if they have been added after trade was created
    await this.removeCardsFromDecks([...trade.initiatorCards, ...trade.receiverCards]);
    
    if (accept) {
      // Execute the trade
      await this.executeTradeExchange(trade);
      trade.status = TradeStatus.ACCEPTED;
    } else {
      trade.status = TradeStatus.REJECTED;
    }
    
    trade.respondedAt = new Date();
    await this.tradeRepository.save(trade);
    
    // Create notification for the initiator
    await this.notificationService.create({
      userId: trade.initiatorId,
      type: accept ? NotificationType.TRADE_ACCEPTED : NotificationType.TRADE_REJECTED,
      title: accept ? 'Trade Accepted' : 'Trade Rejected',
      message: accept 
        ? `Your trade offer has been accepted.` 
        : `Your trade offer has been rejected.`
    });
    
    return trade;
  }

  async cancelTrade(user: any, id: string): Promise<Trade> {
    const trade = await this.findOne(id);
    
    // Verify the user is the initiator of the trade
    if (trade.initiatorId !== user.id) {
      throw new ForbiddenException('Only the trade initiator can cancel this trade');
    }
    
    // Verify the trade is in pending status
    if (trade.status !== TradeStatus.PENDING) {
      throw new BadRequestException(`This trade is already ${trade.status}`);
    }
    
    trade.status = TradeStatus.CANCELED;
    trade.respondedAt = new Date();
    await this.tradeRepository.save(trade);
    
    // Create notification for the receiver
    await this.notificationService.create({
      userId: trade.receiverId,
      type: NotificationType.TRADE_CANCELLED,
      title: 'Trade Canceled',
      message: `A trade offer has been canceled.`
    });
    
    return trade;
  }

  private async validateCardsOwnership(userId: string, cardIds: string[]): Promise<void> {
    for (const cardId of cardIds) {
      const card = await this.userCardService.findById(cardId);
      if (!card) {
        throw new NotFoundException(`Card with ID ${cardId} not found`);
      }
      if (card.userId !== userId) {
        throw new ForbiddenException(`Card with ID ${cardId} does not belong to user ${userId}`);
      }
    }
  }

  /**
   * Remove cards from any decks they are in
   * @param cardIds Array of card IDs to check and remove from decks
   */
  private async removeCardsFromDecks(cardIds: string[]): Promise<void> {
    for (const cardId of cardIds) {
      // Find all decks containing this card
      const decks = await this.deckService.findByUserCardId(cardId);
      
      if (decks.length > 0) {
        // For each deck containing the card, remove the card
        for (const deck of decks) {
          // Create a mock user with admin role to bypass permission checks 
          // since we're doing this automatically in the system
          const adminUser = { 
            id: deck.userId, 
            role: 'admin' 
          };
          
          // Remove the card from the deck
          await this.deckService.removeUserCardFromDeck(
            adminUser as any,
            deck.id,
            cardId
          );
        
        }
      }
    }
  }

  private async executeTradeExchange(trade: Trade): Promise<void> {
    // Transfer initiator cards to receiver
    for (const cardId of trade.initiatorCards) {
      await this.userCardService.transferCard(cardId, trade.initiatorId, trade.receiverId);
    }
    
    // Transfer receiver cards to initiator
    for (const cardId of trade.receiverCards) {
      await this.userCardService.transferCard(cardId, trade.receiverId, trade.initiatorId);
    }
  }
}
// src/deck/deck.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deck } from './entities/deck.entity';
import { User } from '../user/entities/user.entity';
import { UserCard } from '../user-card/entities/user-card.entity';
import { Role } from '../user/enums/role.enum';

@Injectable()
export class DeckService {
  constructor(
    @InjectRepository(Deck)
    private deckRepository: Repository<Deck>,
    @InjectRepository(UserCard)
    private userCardRepository: Repository<UserCard>,
  ) {}

  async findAllByUserId(userId: string): Promise<Deck[]> {
    return this.deckRepository.find({
      where: { userId },
      relations: ['userCards', 'userCards.card'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Deck> {
    const deck = await this.deckRepository.findOne({
      where: { id },
      relations: ['userCards', 'userCards.card'],
    });
    
    if (!deck) {
      throw new NotFoundException(`Deck with ID ${id} not found`);
    }
    
    return deck;
  }

  async create(user: User, createDeckDto: { name: string; description?: string }): Promise<Deck> {
    const deck = new Deck();
    deck.name = createDeckDto.name;
    deck.description = createDeckDto.description || '';
    deck.userId = user.id;
    deck.userCards = [];
    
    return this.deckRepository.save(deck);
  }

  async update(
    currentUser: User,
    deckId: string,
    updateDeckDto: { name?: string; description?: string },
  ): Promise<Deck> {
    const deck = await this.findOne(deckId);
    
    // Check if user owns deck or is admin
    if (currentUser.role !== Role.ADMIN && currentUser.id !== deck.userId) {
      throw new ForbiddenException('You do not have permission to update this deck');
    }
    
    if (updateDeckDto.name) {
      deck.name = updateDeckDto.name;
    }
    
    if (updateDeckDto.description !== undefined) {
      deck.description = updateDeckDto.description;
    }
    
    return this.deckRepository.save(deck);
  }

  async delete(currentUser: User, deckId: string): Promise<void> {
    const deck = await this.findOne(deckId);
    
    // Check if user owns deck or is admin
    if (currentUser.role !== Role.ADMIN && currentUser.id !== deck.userId) {
      throw new ForbiddenException('You do not have permission to delete this deck');
    }
    
    await this.deckRepository.remove(deck);
  }

  async addUserCardToDeck(
    currentUser: User,
    deckId: string,
    userCardId: string,
  ): Promise<Deck> {
    const deck = await this.findOne(deckId);
    
    // Check if user owns deck or is admin
    if (currentUser.role !== Role.ADMIN && currentUser.id !== deck.userId) {
      throw new ForbiddenException('You do not have permission to modify this deck');
    }
    
    // Get the user card
    const userCard = await this.userCardRepository.findOne({
      where: { id: userCardId }
    });
    
    if (!userCard) {
      throw new NotFoundException(`UserCard with ID ${userCardId} not found`);
    }
    
    // Check if the user card belongs to the current user
    if (userCard.userId !== currentUser.id && currentUser.role !== Role.ADMIN) {

      throw new ForbiddenException('You do not have permission to add this card');
    }
    
    // Check if the user card is already in the deck
    const isUserCardInDeck = deck.userCards.some(uc => uc.id === userCardId);

    if (!isUserCardInDeck) {
      if (!deck.userCards) {
        deck.userCards = [];
      }

      deck.userCards.push(userCard);
      await this.deckRepository.save(deck);
    }
  
    return deck;
  }

  async removeUserCardFromDeck(
    currentUser: User,
    deckId: string,
    userCardId: string,
  ): Promise<Deck> {
    const deck = await this.findOne(deckId);
    
    // Check if user owns deck or is admin
    if (currentUser.role !== Role.ADMIN && currentUser.id !== deck.userId) {
      throw new ForbiddenException('You do not have permission to modify this deck');
    }
    
    // Filter out the user card to remove
    deck.userCards = deck.userCards.filter(userCard => userCard.id !== userCardId);
    
    return this.deckRepository.save(deck);
  }
}
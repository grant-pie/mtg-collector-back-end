// src/user-card/user-card.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCard } from './entities/user-card.entity';
import { User } from '../user/entities/user.entity';
import { Role } from '../user/enums/role.enum';
import { CardService } from '../card/card.service';

// Add pagination interfaces
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

@Injectable()
export class UserCardService {
  constructor(
    @InjectRepository(UserCard)
    private userCardRepository: Repository<UserCard>,
    private cardService: CardService,
  ) {}

  async findAllByUserId(
    userId: string, 
    paginationParams?: PaginationParams
  ): Promise<PaginatedResult<UserCard>> {
    const page = paginationParams?.page || 1;
    const limit = paginationParams?.limit || 10;
    const skip = (page - 1) * limit;

    const [items, totalItems] = await this.userCardRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: ['card'],
      skip,
      take: limit,
    });

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  async findById(id: string): Promise<UserCard | null> {
    const userCard = await this.userCardRepository.findOne({
      where: { id },
      relations: ['card'],
    });
    
    return userCard;
  }

  async searchUserCards(
    userId: string, 
    query: any, 
    paginationParams?: PaginationParams
  ): Promise<PaginatedResult<UserCard>> {
    const page = paginationParams?.page || 1;
    const limit = paginationParams?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userCardRepository.createQueryBuilder('userCard')
      .leftJoinAndSelect('userCard.card', 'card')
      .where('userCard.userId = :userId', { userId });
    
    // Apply date filter for createdAt in yyyy-mm-dd format
    if (query.createdAt) {
      const dateStr = query.createdAt;
      // Validate date format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        // Create start and end of the specified day
        const startDate = new Date(`${dateStr}T00:00:00.000Z`);
        const endDate = new Date(`${dateStr}T23:59:59.999Z`);
        
        queryBuilder.andWhere('userCard.createdAt >= :startDate', { startDate })
                   .andWhere('userCard.createdAt <= :endDate', { endDate });
      }
    }
    
    // Apply date range filter if start and end dates are provided
    if (query.createdAtStart && query.createdAtEnd) {
      const startDateStr = query.createdAtStart;
      const endDateStr = query.createdAtEnd;
      
      if (/^\d{4}-\d{2}-\d{2}$/.test(startDateStr) && /^\d{4}-\d{2}-\d{2}$/.test(endDateStr)) {
        const startDate = new Date(`${startDateStr}T00:00:00.000Z`);
        const endDate = new Date(`${endDateStr}T23:59:59.999Z`);
        
        queryBuilder.andWhere('userCard.createdAt >= :startDate', { startDate })
                   .andWhere('userCard.createdAt <= :endDate', { endDate });
      }
    }
    
    // Apply filters based on card properties
    if (query.name) {
      queryBuilder.andWhere('card.name LIKE :name', { name: `%${query.name}%` });
    }
    
    if (query.type) {
      queryBuilder.andWhere('card.type LIKE :type', { type: `%${query.type}%` });
    }
    
    if (query.colors) {
      const colors = Array.isArray(query.colors) ? query.colors : [query.colors];
      colors.forEach((color, index) => {
        queryBuilder.andWhere(`card.colors LIKE :color${index}`, { [`color${index}`]: `%${color}%` });
      });
    }
    
    if (query.rarity) {
      queryBuilder.andWhere('card.rarity = :rarity', { rarity: query.rarity });
    }
    
    if (query.set) {
      queryBuilder.andWhere('card.set = :set', { set: query.set });
    }
    
    if (query.manaCost) {
      queryBuilder.andWhere('card.manaCost LIKE :manaCost', { manaCost: `%${query.manaCost}%` });
    }
    
    if (query.artist) {
      queryBuilder.andWhere('card.artist LIKE :artist', { artist: `%${query.artist}%` });
    }
    
    // Convert mana cost filter to number for comparison
    if (query.convertedManaCost) {
      queryBuilder.andWhere('card.convertedManaCost = :cmc', { cmc: Number(query.convertedManaCost) });
    }
    
    // Filter for cards with power equal to or greater than specified
    if (query.minPower) {
      queryBuilder.andWhere('CAST(card.power AS DECIMAL) >= :minPower', { minPower: Number(query.minPower) });
    }
    
    // Filter for cards with toughness equal to or greater than specified
    if (query.minToughness) {
      queryBuilder.andWhere('CAST(card.toughness AS DECIMAL) >= :minToughness', { minToughness: Number(query.minToughness) });
    }
    
    // Advanced text search in card text
    if (query.text) {
      queryBuilder.andWhere('card.text LIKE :text', { text: `%${query.text}%` });
    }

    // Order results
    if (query.orderBy) {
      const direction = query.orderDirection === 'DESC' ? 'DESC' : 'ASC';
      queryBuilder.orderBy(`card.${query.orderBy}`, direction);
    } else {
      queryBuilder.orderBy('userCard.createdAt', 'DESC');
    }
    
    // Apply pagination
    queryBuilder.skip(skip).take(limit);
    
    // Get results and count
    const [items, totalItems] = await queryBuilder.getManyAndCount();
    
    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  async addCardToUser(currentUser: User, userId: string, scryfallId: string): Promise<UserCard> {
    // Only admins can add cards to any user
    // Regular users can only add cards to themselves (optional functionality)
    if (currentUser.role !== Role.ADMIN && currentUser.id !== userId) {
      throw new ForbiddenException('Only admins can add cards to other users');
    }

    // Create or find the card in our database
    const card = await this.cardService.createOrUpdate(scryfallId);

    // Create the user-card association
    const userCard = new UserCard();
    userCard.userId = userId;
    userCard.cardId = card.id;

    return this.userCardRepository.save(userCard);
  }

  async removeCardFromUser(currentUser: User, cardId: string): Promise<void> {
    const card = await this.userCardRepository.findOne({
      where: { id: cardId },
      relations: ['user', 'card'],
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    // Only admins or the card owner can remove the card
    if (currentUser.role !== Role.ADMIN && currentUser.id !== card.userId) {
      throw new ForbiddenException('You do not have permission to remove this card');
    }

    await this.userCardRepository.remove(card);
  }
}
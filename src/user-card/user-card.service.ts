// src/user-card/user-card.service.ts (Updated)
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
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

// Valid page size options
const VALID_PAGE_SIZES = [10, 20, 50];
const DEFAULT_PAGE_SIZE = 10;

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
    let limit = paginationParams?.limit || DEFAULT_PAGE_SIZE;
    
    // Validate and sanitize the limit parameter
    limit = this.validatePageSize(limit);
    
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
    let limit = paginationParams?.limit || DEFAULT_PAGE_SIZE;
    
    // Validate and sanitize the limit parameter
    limit = this.validatePageSize(limit);
    
    const skip = (page - 1) * limit;

    const queryBuilder = this.userCardRepository.createQueryBuilder('userCard')
      .leftJoinAndSelect('userCard.card', 'card')
      .where('userCard.userId = :userId', { userId });
    
    // Filter by revealed status if provided
    if (query.revealed !== undefined) {
      const revealed = query.revealed === 'true' || query.revealed === true;
      queryBuilder.andWhere('userCard.revealed = :revealed', { revealed });
    }
    
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
      queryBuilder.andWhere('card.name ILIKE :name', { name: `%${query.name}%` });
    }
    
    if (query.type) {
      queryBuilder.andWhere('card.type ILIKE :type', { type: `%${query.type}%` });
    }

    if (query.hideBasicLands === 'true' || query.hideBasicLands === true) {
      queryBuilder.andWhere('card.type NOT ILIKE :basicLandType', { basicLandType: '%Basic Land%' });
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

    // Filter by willingToTrade status if provided
    if (query.willingToTrade !== undefined) {
      const willingToTrade = query.willingToTrade === 'true' || query.willingToTrade === true;
      queryBuilder.andWhere('userCard.willingToTrade = :willingToTrade', { willingToTrade });
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
    userCard.revealed = false; // Default value, could also be omitted as entity has default

    return this.userCardRepository.save(userCard);
  }

  async revealCard(currentUser: User, cardId: string): Promise<UserCard> {
    const userCard = await this.userCardRepository.findOne({
      where: { id: cardId },
    });

    if (!userCard) {
      throw new NotFoundException('Card not found');
    }

    // Only admins or the card owner can reveal the card
    if (currentUser.role !== Role.ADMIN && currentUser.id !== userCard.userId) {
      throw new ForbiddenException('You do not have permission to reveal this card');
    }

    // Update the revealed status
    userCard.revealed = true;
    return this.userCardRepository.save(userCard);
  }

  async setWillingToTrade(currentUser: User, cardId: string, willingToTrade: boolean): Promise<UserCard> {
    const userCard = await this.userCardRepository.findOne({
      where: { id: cardId },
    });

    if (!userCard) {
      throw new NotFoundException('Card not found');
    }

    // Only admins or the card owner can reveal the card
    if (currentUser.role !== Role.ADMIN && currentUser.id !== userCard.userId) {
      throw new ForbiddenException('You do not have permission to reveal this card');
    }

    // Update the revealed status
    userCard.willingToTrade = willingToTrade;
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

  private validatePageSize(limit: number): number {
    // Convert string to number if needed
    const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    
    // Check if the limit is one of the valid options
    if (isNaN(parsedLimit) || !VALID_PAGE_SIZES.includes(parsedLimit)) {
      // Return default page size if invalid
      return DEFAULT_PAGE_SIZE;
    }
    
    return parsedLimit;
  }

  async transferCard(cardId: string, fromUserId: string, toUserId: string): Promise<UserCard> {
    const userCard = await this.findById(cardId);
    
    if (!userCard) {
      throw new NotFoundException(`UserCard with id ${cardId} not found`);
    }
    
    if (userCard.userId !== fromUserId) {
      throw new ForbiddenException(`Card with ID ${cardId} does not belong to user ${fromUserId}`);
    }
    
    // Update the userId to transfer ownership
    userCard.userId = toUserId;
    
    // Use the repository to save the entity instead of calling save() on the entity
    return await this.userCardRepository.save(userCard);
  }

  async findAllWillingToTrade(
    query: any,
    paginationParams?: PaginationParams
  ): Promise<PaginatedResult<UserCard>> {
    const page = paginationParams?.page || 1;
    let limit = paginationParams?.limit || DEFAULT_PAGE_SIZE;
    
    // Validate and sanitize the limit parameter
    limit = this.validatePageSize(limit);
    
    const skip = (page - 1) * limit;
  
    const queryBuilder = this.userCardRepository.createQueryBuilder('userCard')
      .leftJoinAndSelect('userCard.card', 'card')
      .leftJoinAndSelect('userCard.user', 'user')
      .where('userCard.willingToTrade = :willingToTrade', { willingToTrade: true });
    
    // Apply filters based on card properties (similar to searchUserCards)
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

    if (query.hideBasicLands === 'true' || query.hideBasicLands === true) {
      queryBuilder.andWhere('card.type NOT LIKE :basicLandType', { basicLandType: '%Basic Land%' });
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
    
    // Filter by username if provided
    if (query.username) {
      queryBuilder.andWhere('user.username LIKE :username', { username: `%${query.username}%` });
    }
    
    // Order results
    if (query.orderBy) {
      const direction = query.orderDirection === 'DESC' ? 'DESC' : 'ASC';
      if (query.orderBy.startsWith('card.')) {
        // If the orderBy already includes the table prefix
        queryBuilder.orderBy(query.orderBy, direction);
      } else if (query.orderBy.startsWith('user.')) {
        // If ordering by user fields
        queryBuilder.orderBy(query.orderBy, direction);
      } else {
        // Default to ordering by card fields
        queryBuilder.orderBy(`card.${query.orderBy}`, direction);
      }
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
}
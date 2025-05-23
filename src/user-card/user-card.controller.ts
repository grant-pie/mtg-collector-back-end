// src/user-card/user-card.controller.ts (Updated)
import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req, Query, NotFoundException, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserCardService, PaginationParams } from './user-card.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../user/enums/role.enum';
import { UserService } from '../user/user.service';

// Valid page size options
const VALID_PAGE_SIZES = [10, 20, 50];
const DEFAULT_PAGE_SIZE = 10;

@Controller('user-cards')
export class UserCardController {
  constructor(
    private userCardService: UserCardService,
    private userService: UserService,
  ) {}

  @Get(':id')
  async getCardById(@Req() req, @Param('id') id: string) {
    console.log('attempting to find card with id: ' + id);
    const userCard = await this.userCardService.findById(id);
    
    if (!userCard) {
      throw new NotFoundException(`Card with id ${id} not found`);
    }
    
    return {
      userCard: {
        id: userCard.id,
        userId: userCard.userId,
        cardDetails: userCard.card,
        revealed: userCard.revealed,
        willingToTrade: userCard.willingToTrade,
        createdAt: userCard.createdAt
      }
    };
  }

  @Get('username/:username')
  async getCardsByUsername(
    @Param('username') username: string, 
    @Query() query
  ) {
    // Extract pagination parameters
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : DEFAULT_PAGE_SIZE;
    
    // Validate limit parameter
    const validatedLimit = this.validatePageSize(limit);
    
    const paginationParams: PaginationParams = { 
      page, 
      limit: validatedLimit 
    };
    
    // Remove pagination params from query to use for filtering
    const { page: _, limit: __, ...filterParams } = query;

    // Find the user by username
    const user = await this.userService.findByUsername(username);
    
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }
    
    // Get user's cards with pagination
    let response;
    if (Object.keys(filterParams).length > 0) {
      response = await this.userCardService.searchUserCards(user.id, filterParams, paginationParams);
    } else {
      response = await this.userCardService.findAllByUserId(user.id, paginationParams);
    }
    
    // Format the response to include card details
    const cards = response.items.map(userCard => ({
      id: userCard.id,
      userId: userCard.userId,
      cardDetails: userCard.card,
      revealed: userCard.revealed,
      willingToTrade: userCard.willingToTrade,
      createdAt: userCard.createdAt
    }));
    
    return { 
      cards,
      pagination: response.meta
    };
  }
  
  @Get('user/:userId')
  @UseGuards(AuthGuard('jwt'))
  async getUserCards(
    @Req() req, 
    @Param('userId') userId: string, 
    @Query() query
  ) {
    // If not admin and not requesting own cards, throw error
    if (req.user.role !== Role.ADMIN && req.user.id !== userId) {
      return { error: 'Access denied' };
    }
    
    // Extract pagination parameters
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : DEFAULT_PAGE_SIZE;
    
    // Validate limit parameter
    const validatedLimit = this.validatePageSize(limit);
    
    const paginationParams: PaginationParams = { 
      page, 
      limit: validatedLimit 
    };
    
    // Remove pagination params from query to use for filtering
    const { page: _, limit: __, ...filterParams } = query;
    
    // If there are search parameters, use search function
    let response;
    if (Object.keys(filterParams).length > 0) {
      response = await this.userCardService.searchUserCards(userId, filterParams, paginationParams);
    } else {
      response = await this.userCardService.findAllByUserId(userId, paginationParams);
    }
    
    // Format the response to include card details
    const cards = response.items.map(userCard => ({
      id: userCard.id,
      userId: userCard.userId,
      cardDetails: userCard.card,
      revealed: userCard.revealed,
      willingToTrade: userCard.willingToTrade,
      createdAt: userCard.createdAt
    }));
    
    return { 
      cards,
      pagination: response.meta
    };
  }

  @Post(':userId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  async addCardToUser(
    @Req() req,
    @Param('userId') userId: string,
    @Body() body: {scryfallId: string }
  ) {
    
    const userCard = await this.userCardService.addCardToUser(
      req.user,
      userId,
      body.scryfallId
    );
    
    return { 
      userCard: {
        id: userCard.id,
        userId: userCard.userId,
        cardId: userCard.cardId,
        revealed: userCard.revealed,
        willingToTrade: userCard.willingToTrade,
        createdAt: userCard.createdAt
      }
    };
  }

  @Patch(':cardId/reveal')
  @UseGuards(AuthGuard('jwt'))
  async revealCard(@Req() req, @Param('cardId') cardId: string) {
    const updatedCard = await this.userCardService.revealCard(req.user, cardId);
    return { 
      success: true, 
      userCard: {
        id: updatedCard.id,
        userId: updatedCard.userId,
        cardId: updatedCard.cardId,
        revealed: updatedCard.revealed,
        willingToTrade: updatedCard.willingToTrade,
        createdAt: updatedCard.createdAt
      }
    };
  }

  @Patch(':cardId/trade-willing')
  @UseGuards(AuthGuard('jwt'))
  async setWillingToTrade(
    @Req() req, 
    @Param('cardId') cardId: string,
    @Body() body: {willingToTrade: boolean }) {
    console.log('attempting to set willing to trade')
    const updatedCard = await this.userCardService.setWillingToTrade(req.user, cardId, body.willingToTrade);
    console.log( updatedCard);
    return { 
      success: true, 
      userCard: {
        id: updatedCard.id,
        userId: updatedCard.userId,
        cardId: updatedCard.cardId,
        revealed: updatedCard.revealed,
        willingToTrade: updatedCard.willingToTrade,
        createdAt: updatedCard.createdAt
      }
    };
  }

  @Delete(':cardId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async removeCard(@Req() req, @Param('cardId') cardId: string) {
    await this.userCardService.removeCardFromUser(req.user, cardId);
    return { success: true };
  }

  private validatePageSize(limit: number): number {
    // Check if the limit is one of the valid options
    if (isNaN(limit) || !VALID_PAGE_SIZES.includes(limit)) {
      // Return default page size if invalid
      return DEFAULT_PAGE_SIZE;
    }
    
    return limit;
  }

  @Get('trading/marketplace')
  async getTradingMarketplace(@Query() query) {
    // Extract pagination parameters
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : DEFAULT_PAGE_SIZE;
    
    // Validate limit parameter
    const validatedLimit = this.validatePageSize(limit);
    
    const paginationParams: PaginationParams = { 
      page, 
      limit: validatedLimit 
    };
    
    // Remove pagination params from query to use for filtering
    const { page: _, limit: __, ...filterParams } = query;
    
    // Get all cards willing to trade with search parameters
    const response = await this.userCardService.findAllWillingToTrade(filterParams, paginationParams);
    
    // Format the response to include card details and user information
    const tradingCards = response.items.map(userCard => ({
      id: userCard.id,
      userId: userCard.userId,
      username: userCard.user?.username,
      cardDetails: userCard.card,
      revealed: userCard.revealed,
      willingToTrade: userCard.willingToTrade,
      createdAt: userCard.createdAt
    }));
    
    return { 
      tradingCards,
      pagination: response.meta
    };
  }
}
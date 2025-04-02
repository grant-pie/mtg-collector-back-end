// src/trade/trade.controller.ts
import { Controller, Get, Post, Body, Param, Patch, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TradeService } from './trade.service';
import { CreateTradeDto } from './dto/create-trade.dto';
import { RespondTradeDto } from './dto/respond-trade.dto';

@Controller('trades')
@UseGuards(AuthGuard('jwt'))
export class TradeController {
  constructor(private readonly tradeService: TradeService) {}

  @Post()
  async create(@Req() req, @Body() createTradeDto: CreateTradeDto) {
    const trade = await this.tradeService.create(req.user, createTradeDto);
    return { trade };
  }

  @Get()
  async findAll(@Req() req) {
    const trades = await this.tradeService.findAll(req.user.id);
    return { trades };
  }

  @Get('pending')
  async findPending(@Req() req) {
    const trades = await this.tradeService.findPending(req.user.id);
    return { trades };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const trade = await this.tradeService.findOne(id);
    return { trade };
  }

  @Patch(':id/respond')
  async respondToTrade(
    @Req() req,
    @Param('id') id: string,
    @Body() respondTradeDto: RespondTradeDto
  ) {
    const trade = await this.tradeService.respondToTrade(req.user, id, respondTradeDto);
    return { trade };
  }

  @Patch(':id/cancel')
  async cancelTrade(@Req() req, @Param('id') id: string) {
    const trade = await this.tradeService.cancelTrade(req.user, id);
    return { trade };
  }
}
// src/card/card.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Card } from './entities/card.entity';
import axios from 'axios';

@Injectable()
export class CardService {
  constructor(
    @InjectRepository(Card)
    private cardRepository: Repository<Card>,
  ) {}

  async findAll(): Promise<Card[]> {
    return this.cardRepository.find();
  }

  async findOne(id: string): Promise<Card> {
    const card = await this.cardRepository.findOne({ where: { id } });
    if (!card) {
      throw new NotFoundException(`Card with ID ${id} not found`);
    }
    return card;
  }

  async findByScryfallId(scryfallId: string): Promise<Card | null> {
    const card = await this.cardRepository.findOne({ where: { scryfallId } });
    return card;
  }

  async createOrUpdate(scryfallId: string): Promise<Card> {
    // Check if card already exists in our database
    let card = await this.findByScryfallId(scryfallId);
    
    // If card exists, return it
    if (card) {
      return card;
    }
    
    // If card doesn't exist, fetch data from Scryfall API
    try {
      const response = await axios.get(`https://api.scryfall.com/cards/${scryfallId}`);
      const cardData = response.data;
      
      // Create new card with data from Scryfall API
      card = new Card();
      card.scryfallId = scryfallId;
      card.name = cardData.name;
      card.manaCost = cardData.mana_cost || '';
      card.convertedManaCost = cardData.cmc || 0;
      card.type = cardData.type_line;
      card.colors = cardData.colors || [];
      card.rarity = cardData.rarity;
      card.set = cardData.set;
      card.setName = cardData.set_name;
      card.text = cardData.oracle_text;
      card.artist = cardData.artist;
      card.power = cardData.power;
      card.toughness = cardData.toughness;
      card.imageUrl = cardData.image_uris?.normal || cardData.image_uris?.png || '';
      
      return this.cardRepository.save(card);
    } catch (error) {
      console.log(`Card with scryfall ID ${scryfallId} could not be found or fetched from Scryfall API`);
      throw new NotFoundException(`Card with scryfall ID ${scryfallId} could not be found or fetched from Scryfall API`);
    }
  }

  async search(query: any): Promise<Card[]> {
    const queryBuilder = this.cardRepository.createQueryBuilder('card');
    
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
    
    return queryBuilder.getMany();
  }
}
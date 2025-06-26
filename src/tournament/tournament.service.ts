// src/tournament/tournament.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from './entities/tournament.entity';
import { TournamentResult } from './entities/tournament-result.entity';
import { User } from '../user/entities/user.entity';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { UpdateTournamentResultDto } from './dto/update-tournament-result.dto';
import { BulkUpdateResultsDto } from './dto/bulk-update-results.dto';

@Injectable()
export class TournamentService {
  constructor(
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
    @InjectRepository(TournamentResult)
    private tournamentResultRepository: Repository<TournamentResult>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createTournamentDto: CreateTournamentDto): Promise<Tournament> {
    const tournament = this.tournamentRepository.create({
      ...createTournamentDto,
      date: new Date(createTournamentDto.date),
    });

    return this.tournamentRepository.save(tournament);
  }

  async findAll(): Promise<Tournament[]> {
    return this.tournamentRepository.find({
      relations: ['results', 'results.user'],
      order: { date: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id },
      relations: ['results', 'results.user'],
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${id} not found`);
    }

    // Calculate win rates for all results
    tournament.results.forEach(result => result.calculateWinRate());

    // Sort results by win rate (descending) then by wins (descending)
    tournament.results.sort((a, b) => {
      if (b.winRate !== a.winRate) {
        return b.winRate - a.winRate;
      }
      return b.wins - a.wins;
    });

    return tournament;
  }

  async update(id: string, updateTournamentDto: UpdateTournamentDto): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findOne({ where: { id } });
    
    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${id} not found`);
    }

    // Build update object with proper types
    const updateFields: Partial<Tournament> = {};
    
    if (updateTournamentDto.name !== undefined) {
      updateFields.name = updateTournamentDto.name;
    }
    
    if (updateTournamentDto.description !== undefined) {
      updateFields.description = updateTournamentDto.description;
    }
    
    if (updateTournamentDto.date !== undefined) {
      updateFields.date = new Date(updateTournamentDto.date);
    }
    
    if (updateTournamentDto.isActive !== undefined) {
      updateFields.isActive = updateTournamentDto.isActive;
    }

    await this.tournamentRepository.update(id, updateFields);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const tournament = await this.tournamentRepository.findOne({ where: { id } });
    
    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${id} not found`);
    }

    await this.tournamentRepository.remove(tournament);
  }

  async updateResult(
    tournamentId: string,
    updateResultDto: UpdateTournamentResultDto,
  ): Promise<TournamentResult> {
    // Verify tournament exists
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);
    }

    // Verify user exists
    const user = await this.userRepository.findOne({
      where: { id: updateResultDto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${updateResultDto.userId} not found`);
    }

    // Find existing result or create new one
    let result = await this.tournamentResultRepository.findOne({
      where: {
        tournamentId,
        userId: updateResultDto.userId,
      },
      relations: ['user', 'tournament'],
    });

    if (result) {
      // Update existing result
      result.wins = updateResultDto.wins;
      result.losses = updateResultDto.losses;
    } else {
      // Create new result
      result = this.tournamentResultRepository.create({
        tournamentId,
        userId: updateResultDto.userId,
        wins: updateResultDto.wins,
        losses: updateResultDto.losses,
        tournament,
        user,
      });
    }

    result.calculateWinRate();
    return this.tournamentResultRepository.save(result);
  }

  async bulkUpdateResults(
    tournamentId: string,
    bulkUpdateDto: BulkUpdateResultsDto,
  ): Promise<TournamentResult[]> {
    // Verify tournament exists
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);
    }

    const results: TournamentResult[] = [];

    for (const resultDto of bulkUpdateDto.results) {
      const result = await this.updateResult(tournamentId, resultDto);
      results.push(result);
    }

    return results;
  }

  async getTournamentStandings(tournamentId: string) {
    const tournament = await this.findOne(tournamentId);
    
    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        description: tournament.description,
        date: tournament.date,
        isActive: tournament.isActive,
      },
      standings: tournament.results.map((result, index) => ({
        rank: index + 1,
        user: {
          id: result.user.id,
          username: result.user.username,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          picture: result.user.picture,
        },
        wins: result.wins,
        losses: result.losses,
        winRate: result.winRate,
        totalGames: result.wins + result.losses,
      })),
    };
  }

  async getAllStandings() {
    const tournaments = await this.findAll();
    
    return tournaments.map(tournament => ({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        description: tournament.description,
        date: tournament.date,
        isActive: tournament.isActive,
      },
      standings: tournament.results
        .sort((a, b) => {
          a.calculateWinRate();
          b.calculateWinRate();
          if (b.winRate !== a.winRate) {
            return b.winRate - a.winRate;
          }
          return b.wins - a.wins;
        })
        .map((result, index) => ({
          rank: index + 1,
          user: {
            id: result.user.id,
            username: result.user.username,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            picture: result.user.picture,
          },
          wins: result.wins,
          losses: result.losses,
          winRate: result.winRate,
          totalGames: result.wins + result.losses,
        })),
    }));
  }
}
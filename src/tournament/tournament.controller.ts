// src/tournament/tournament.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TournamentService } from './tournament.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { UpdateTournamentResultDto } from './dto/update-tournament-result.dto';
import { BulkUpdateResultsDto } from './dto/bulk-update-results.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../user/enums/role.enum';

@Controller('tournaments')
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body(ValidationPipe) createTournamentDto: CreateTournamentDto) {
    return this.tournamentService.create(createTournamentDto);
  }

  @Get()
  findAll() {
    return this.tournamentService.findAll();
  }

  @Get('standings')
  getAllStandings() {
    return this.tournamentService.getAllStandings();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tournamentService.findOne(id);
  }

  @Get(':id/standings')
  getTournamentStandings(@Param('id') id: string) {
    return this.tournamentService.getTournamentStandings(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateTournamentDto: UpdateTournamentDto,
  ) {
    return this.tournamentService.update(id, updateTournamentDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.tournamentService.remove(id);
  }

  @Patch(':id/results/user')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  updateResult(
    @Param('id') tournamentId: string,
    @Body(ValidationPipe) updateResultDto: UpdateTournamentResultDto,
  ) {
    return this.tournamentService.updateResult(tournamentId, updateResultDto);
  }

  @Patch(':id/results/bulk')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  bulkUpdateResults(
    @Param('id') tournamentId: string,
    @Body(ValidationPipe) bulkUpdateDto: BulkUpdateResultsDto,
  ) {
    return this.tournamentService.bulkUpdateResults(tournamentId, bulkUpdateDto);
  }
}
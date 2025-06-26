// src/tournament/entities/tournament-result.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Tournament } from './tournament.entity';
import { User } from '../../user/entities/user.entity';

@Entity('tournament_results')
@Unique(['tournament', 'user']) // Ensure one result per user per tournament
export class TournamentResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 0 })
  wins: number;

  @Column({ default: 0 })
  losses: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  winRate: number;

  @ManyToOne(() => Tournament, tournament => tournament.results, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournamentId' })
  tournament: Tournament;

  @Column()
  tournamentId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Calculate win rate after loading
  calculateWinRate() {
    const totalGames = this.wins + this.losses;
    this.winRate = totalGames > 0 ? this.wins / totalGames : 0;
  }
}
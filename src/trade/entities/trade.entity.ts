// src/trade/entities/trade.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { UserCard } from '../../user-card/entities/user-card.entity';

export enum TradeStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELED = 'canceled'
}

@Entity('trades')
export class Trade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  initiatorId: string;

  @Column()
  receiverId: string;

  @Column('simple-array')
  initiatorCards: string[];

  @Column('simple-array')
  receiverCards: string[];

  @Column({
    type: 'enum',
    enum: TradeStatus,
    default: TradeStatus.PENDING
  })
  status: TradeStatus;

  @Column({ type: 'timestamp', nullable: true, default: null })
  respondedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'initiatorId' })
  initiator: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'receiverId' })
  receiver: User;
}
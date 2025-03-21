// src/deck/entities/deck.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { UserCard } from '../../user-card/entities/user-card.entity';

@Entity('decks')
export class Deck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, user => user.decks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToMany(() => UserCard)
  @JoinTable({
    name: 'deck_user_cards',
    joinColumn: { name: 'deckId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userCardId', referencedColumnName: 'id' },
  })
  userCards: UserCard[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
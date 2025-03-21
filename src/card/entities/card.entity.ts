// src/card/entities/card.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { UserCard } from '../../user-card/entities/user-card.entity';

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  scryfallId: string;

  @Column()
  name: string;

  @Column()
  manaCost: string;

  @Column()
  convertedManaCost: number;

  @Column({ nullable: true })
  type: string;

  @Column('simple-array', { nullable: true })
  colors: string[];

  @Column({ nullable: true })
  rarity: string;

  @Column({ nullable: true })
  set: string;

  @Column({ nullable: true })
  setName: string;

  @Column('text', { nullable: true })
  text: string;

  @Column({ nullable: true })
  artist: string;

  @Column({ nullable: true })
  power: string;

  @Column({ nullable: true })
  toughness: string;

  @Column({ nullable: true })
  imageUrl: string;

  @OneToMany(() => UserCard, userCard => userCard.card)
  userCards: UserCard[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
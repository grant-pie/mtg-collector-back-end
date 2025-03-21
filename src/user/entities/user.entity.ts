// src/user/entities/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Role } from '../enums/role.enum';
import { UserCard } from '../../user-card/entities/user-card.entity';
import { Deck } from '../../deck/entities/deck.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  picture: string;

  @Column({ unique: true })
  googleId: string;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER
  })
  role: Role;

  @OneToMany(() => UserCard, userCard => userCard.user)
  cards: UserCard[];

  @OneToMany(() => Deck, deck => deck.user)
  decks: Deck[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
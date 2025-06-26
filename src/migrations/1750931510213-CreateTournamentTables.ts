// src/migrations/XXXXXXXXXXXXXX-CreateTournamentTables.ts
import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateTournamentTables1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tournaments table
    await queryRunner.createTable(
      new Table({
        name: 'tournaments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // Create tournament_results table
    await queryRunner.createTable(
      new Table({
        name: 'tournament_results',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'wins',
            type: 'integer',
            default: 0,
          },
          {
            name: 'losses',
            type: 'integer',
            default: 0,
          },
          {
            name: 'winRate',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'tournamentId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // Create foreign key for tournament
    await queryRunner.createForeignKey(
      'tournament_results',
      new TableForeignKey({
        columnNames: ['tournamentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tournaments',
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign key for user
    await queryRunner.createForeignKey(
      'tournament_results',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create unique index to ensure one result per user per tournament
    await queryRunner.createIndex(
      'tournament_results',
      new TableIndex({
        name: 'IDX_tournament_user_unique',
        columnNames: ['tournamentId', 'userId'],
        isUnique: true,
      }),
    );

    // Create index for better query performance
    await queryRunner.createIndex(
      'tournament_results',
      new TableIndex({
        name: 'IDX_tournament_results_tournament',
        columnNames: ['tournamentId'],
      }),
    );

    await queryRunner.createIndex(
      'tournament_results',
      new TableIndex({
        name: 'IDX_tournament_results_user',
        columnNames: ['userId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const table = await queryRunner.getTable('tournament_results');
    if (table) {
      const tournamentForeignKey = table.foreignKeys.find(
        fk => fk.columnNames.indexOf('tournamentId') !== -1,
      );
      const userForeignKey = table.foreignKeys.find(
        fk => fk.columnNames.indexOf('userId') !== -1,
      );

      if (tournamentForeignKey) {
        await queryRunner.dropForeignKey('tournament_results', tournamentForeignKey);
      }
      if (userForeignKey) {
        await queryRunner.dropForeignKey('tournament_results', userForeignKey);
      }
    }

    // Drop tables
    await queryRunner.dropTable('tournament_results');
    await queryRunner.dropTable('tournaments');
  }
}
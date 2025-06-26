// src/tournament/tournament.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';

describe('TournamentController', () => {
  let controller: TournamentController;
  let service: TournamentService;

  const mockTournamentService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateResult: jest.fn(),
    bulkUpdateResults: jest.fn(),
    getTournamentStandings: jest.fn(),
    getAllStandings: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TournamentController],
      providers: [
        {
          provide: TournamentService,
          useValue: mockTournamentService,
        },
      ],
    }).compile();

    controller = module.get<TournamentController>(TournamentController);
    service = module.get<TournamentService>(TournamentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a tournament', async () => {
    const createTournamentDto = {
      name: 'Test Tournament',
      description: 'A test tournament',
      date: '2024-12-01',
      isActive: true,
    };

    const expectedResult = {
      id: '1',
      ...createTournamentDto,
      date: new Date(createTournamentDto.date),
      results: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockTournamentService.create.mockResolvedValue(expectedResult);

    const result = await controller.create(createTournamentDto);

    expect(service.create).toHaveBeenCalledWith(createTournamentDto);
    expect(result).toEqual(expectedResult);
  });

  it('should find all tournaments', async () => {
    const expectedResult = [
      {
        id: '1',
        name: 'Tournament 1',
        description: 'First tournament',
        date: new Date(),
        isActive: true,
        results: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockTournamentService.findAll.mockResolvedValue(expectedResult);

    const result = await controller.findAll();

    expect(service.findAll).toHaveBeenCalled();
    expect(result).toEqual(expectedResult);
  });

  it('should find one tournament', async () => {
    const tournamentId = '1';
    const expectedResult = {
      id: tournamentId,
      name: 'Tournament 1',
      description: 'First tournament',
      date: new Date(),
      isActive: true,
      results: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockTournamentService.findOne.mockResolvedValue(expectedResult);

    const result = await controller.findOne(tournamentId);

    expect(service.findOne).toHaveBeenCalledWith(tournamentId);
    expect(result).toEqual(expectedResult);
  });

  it('should update tournament result', async () => {
    const tournamentId = '1';
    const updateResultDto = {
      userId: 'user1',
      wins: 5,
      losses: 2,
    };

    const expectedResult = {
      id: 'result1',
      tournamentId,
      userId: updateResultDto.userId,
      wins: updateResultDto.wins,
      losses: updateResultDto.losses,
      winRate: 0.7143,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockTournamentService.updateResult.mockResolvedValue(expectedResult);

    const result = await controller.updateResult(tournamentId, updateResultDto);

    expect(service.updateResult).toHaveBeenCalledWith(tournamentId, updateResultDto);
    expect(result).toEqual(expectedResult);
  });
});
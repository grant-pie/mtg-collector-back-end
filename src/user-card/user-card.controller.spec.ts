import { Test, TestingModule } from '@nestjs/testing';
import { UserCardController } from './user-card.controller';

describe('UserCardController', () => {
  let controller: UserCardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserCardController],
    }).compile();

    controller = module.get<UserCardController>(UserCardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

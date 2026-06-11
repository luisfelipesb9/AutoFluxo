import { createMockUser } from "../fixtures/users.fixture";

export const mockAppDataSource = {
  isInitialized: true,
  initialize: jest.fn().mockResolvedValue(undefined),
  getRepository: jest.fn(),
  // Usado pelo código de estoque (AppDataSource.transaction(cb)).
  // Tests podem sobrescrever a implementação, ex.:
  //   mockAppDataSource.transaction.mockImplementation((cb) => cb(mockManager));
  transaction: jest.fn(),
};

/**
 * Reseta todos os jest.fn() do mockAppDataSource entre testes.
 * Chame em beforeEach quando precisar isolar o estado do transaction/getRepository.
 */
export const resetMockAppDataSource = () => {
  mockAppDataSource.initialize.mockReset().mockResolvedValue(undefined);
  mockAppDataSource.getRepository.mockReset();
  mockAppDataSource.transaction.mockReset();
};

export const mockUserRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};

export const mockRefreshTokenRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

export const createMockUserRepository = () => ({
  findOne: jest
    .fn()
    .mockResolvedValue(createMockUser({ login: "testuser" })),
  save: jest.fn().mockResolvedValue(createMockUser()),
});

export const createMockRefreshTokenRepository = () => ({
  findOne: jest.fn().mockResolvedValue({
    id: 1,
    token: "mock_token",
    userId: 1,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    criadoEm: new Date(),
  }),
  save: jest.fn(),
  update: jest.fn(),
});

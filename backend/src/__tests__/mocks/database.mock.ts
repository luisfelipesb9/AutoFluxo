import { createMockUser } from "../fixtures/users.fixture";

export const mockAppDataSource = {
  isInitialized: true,
  initialize: jest.fn().mockResolvedValue(undefined),
  getRepository: jest.fn(),
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

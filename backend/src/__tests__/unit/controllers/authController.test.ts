import request from "supertest";
import express from "express";
import authRouter from "../../../routes/auth";
import * as userService from "../../../services/userService";
import * as authService from "../../../services/authService";

jest.mock("../../../services/userService");
jest.mock("../../../services/authService");

const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve retornar 401 quando usuário não existe", async () => {
    (userService.findUserByLogin as jest.Mock).mockResolvedValue(null);

    const res = await request(app).post("/api/auth/login").send({ login: "noone", senha: "password123" });

    expect(res.status).toBe(401);
  });

  it("deve retornar 200 com tokens quando credenciais corretas", async () => {
    const mockUser = {
      id: 1,
      login: "testuser",
      senhaHash: "$2b$12$mocked",
      perfil: "USER",
    } as any;

    (userService.findUserByLogin as jest.Mock).mockResolvedValue(mockUser);
    (userService.verifyPassword as jest.Mock).mockResolvedValue(true);
    (authService.generateAccessToken as jest.Mock).mockReturnValue("access.token.mock");
    (authService.issueRefreshToken as jest.Mock).mockResolvedValue("refresh_token_mock");

    const res = await request(app).post("/api/auth/login").send({ login: "testuser", senha: "password" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body).toHaveProperty("refreshToken");
  });
});

import { listarLogs } from "../../../services/logQueryService";
import { AppDataSource } from "../../../lib/database";

jest.mock("../../../lib/database", () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

describe("logQueryService.listarLogs", () => {
  const findAndCount = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    findAndCount.mockReset().mockResolvedValue([[{ id: 1 }], 1]);
    (AppDataSource.getRepository as jest.Mock).mockReturnValue({ findAndCount });
  });

  it("retorna data/total e aplica skip/take a partir da paginação", async () => {
    const res = await listarLogs({ page: 2, pageSize: 10 } as never);

    expect(res).toMatchObject({ page: 2, pageSize: 10, total: 1 });
    expect(findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    );
  });

  it("filtra por usuario_id", async () => {
    await listarLogs({ usuario_id: 5, page: 1, pageSize: 50 } as never);

    expect(findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ usuario_id: 5 }),
      })
    );
  });

  it("usa Between quando inicio e fim são informados", async () => {
    await listarLogs({
      inicio: new Date("2026-01-01"),
      fim: new Date("2026-01-31"),
      page: 1,
      pageSize: 50,
    } as never);

    const arg = findAndCount.mock.calls[0][0];
    expect(arg.where.criado_em).toBeDefined();
  });

  it("aceita filtro só por inicio e só por fim", async () => {
    await listarLogs({
      inicio: new Date("2026-01-01"),
      page: 1,
      pageSize: 50,
    } as never);
    await listarLogs({
      fim: new Date("2026-01-31"),
      page: 1,
      pageSize: 50,
    } as never);

    expect(findAndCount).toHaveBeenCalledTimes(2);
    expect(findAndCount.mock.calls[0][0].where.criado_em).toBeDefined();
    expect(findAndCount.mock.calls[1][0].where.criado_em).toBeDefined();
  });
});

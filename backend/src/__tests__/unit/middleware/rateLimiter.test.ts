import { loginLimiter, apiLimiter } from "../../../middleware/rateLimiter";

describe("rateLimiter middlewares", () => {
  it("deve pular limitações quando NODE_ENV=test (loginLimiter)", (done) => {
    process.env.NODE_ENV = "test";

    const req = {} as any;
    const res = {} as any;

    const next = () => {
      done();
    };

    // loginLimiter e apiLimiter retornam uma função middleware
    (loginLimiter as any)(req, res, next);
  });

  it("deve chamar next quando não for test (apiLimiter)", (done) => {
    process.env.NODE_ENV = "production";

    const req = {} as any;
    const res = { setHeader: jest.fn() } as any;

    const next = () => {
      done();
    };

    (apiLimiter as any)(req, res, next);
  });
});

import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import jwt from "jsonwebtoken";
import { authenticateToken } from "../../middleware/auth.middleware";

const SECRET = "test-secret";

// ---- Helpers ----
const makeRes = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const makeReq = (authorization?: string) =>
  ({ headers: authorization === undefined ? {} : { authorization } }) as any;

const run = (authorization?: string) => {
  const req = makeReq(authorization);
  const res = makeRes();
  const next = jest.fn();
  authenticateToken(req, res, next);
  return { req, res, next };
};

describe("authenticateToken", () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  describe("valid token", () => {
    it("calls next and attaches the decoded payload to req.user", () => {
      const token = jwt.sign({ userId: "user-1" }, SECRET, { expiresIn: "1h" });

      const { req, res, next } = run(`Bearer ${token}`);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user.userId).toBe("user-1");
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("missing token", () => {
    it("returns 401 when there is no Authorization header", () => {
      const { res, next } = run(undefined);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Access token missing.",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when the header is only the word 'Bearer'", () => {
      const { res, next } = run("Bearer");

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Access token missing.",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when the header is an empty string", () => {
      const { res, next } = run("");

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("bad token", () => {
    it("returns 401 for a malformed token", () => {
      const { res, next } = run("Bearer not-a-real-token");

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid or expired access token.",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 for an expired token", () => {
      const token = jwt.sign({ userId: "user-1" }, SECRET, { expiresIn: -10 });

      const { res, next } = run(`Bearer ${token}`);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid or expired access token.",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 for a token signed with a different secret", () => {
      const token = jwt.sign({ userId: "user-1" }, "some-other-secret", {
        expiresIn: "1h",
      });

      const { res, next } = run(`Bearer ${token}`);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 when the payload has been tampered with", () => {
      const token = jwt.sign({ userId: "user-1" }, SECRET, { expiresIn: "1h" });
      const [header, , signature] = token.split(".");
      const forgedPayload = Buffer.from(
        JSON.stringify({
          userId: "admin",
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ).toString("base64url");

      const { res, next } = run(
        `Bearer ${header}.${forgedPayload}.${signature}`,
      );

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 401 for an unsigned token (alg: none)", () => {
      const header = Buffer.from(
        JSON.stringify({ alg: "none", typ: "JWT" }),
      ).toString("base64url");
      const payload = Buffer.from(
        JSON.stringify({ userId: "user-1" }),
      ).toString("base64url");

      const { res, next } = run(`Bearer ${header}.${payload}.`);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("server configuration", () => {
    it("throws when JWT_SECRET is not defined, and never calls next", () => {
      delete process.env.JWT_SECRET;
      const token = jwt.sign({ userId: "user-1" }, SECRET);
      const req = makeReq(`Bearer ${token}`);
      const res = makeRes();
      const next = jest.fn();

      expect(() => authenticateToken(req, res, next)).toThrow(
        "JWT secret not defined.",
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  // The middleware takes the second word of the header without checking the first,
  // so "Token <jwt>" or "Basic <jwt>" is accepted today. Decide whether that should be a 401.
  it.todo(
    "rejects an Authorization header that does not use the Bearer scheme",
  );
});

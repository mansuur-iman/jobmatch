import {
  registerSchema,
  loginSchema,
} from "../../validators/auth.validator.js";

describe("registerSchema", () => {
  it("accepts valid registration data", () => {
    const result = registerSchema.safeParse({
      username: "Example0",
      email: "example738@gmail.com",
      password: "Example0000",
    });

    expect(result.success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("accepts valid login data", () => {
    const result = loginSchema.safeParse({
      email: "example739@gmail.com",
      password: "Example0000",
    });

    expect(result.success).toBe(true);
  });
});

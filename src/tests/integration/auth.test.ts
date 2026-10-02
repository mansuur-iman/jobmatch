import { app } from "../../app";
import request from "supertest";
import { db } from "../../prisma/db";
import { jest } from "@jest/globals";

jest.setTimeout(15000);

describe("authentication routes", () => {
  beforeEach(async () => {
    // Clear the users table before each test
    await db.orm.public.Profile.where((p) => p.id.isNotNull()).deleteAll();
    await db.orm.public.User.where((u) => u.id.isNotNull()).deleteAll();
  });
  it("successfully registers user", async () => {
    // Test data for registration//
    const registrationData = {
      email: "example@12.gmail.com",
      username: "Example1",
      password: "Example0000",
    };

    const register = await request(app)
      .post("/api/v1/auth/register")
      .send(registrationData);

    expect(register.statusCode).toBe(201);
    expect(register.body.user.username).toBe(registrationData.username);
  });

  it("successfully logs in user", async () => {
    //Register first//
    const userData = {
      email: "example1@gmail.com",
      username: "Example1",
      password: "Example0000",
    };

    const registerUser = await request(app)
      .post("/api/v1/auth/register")
      .send(userData);

    //inspect user registration//
    expect(registerUser.statusCode).toBe(201);

    //login user//
    const res = await request(app).post("/api/v1/auth/login").send({
      email: userData.email,
      password: userData.password,
    });

    //inspect user login//
    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe(userData.email);
  });
});

afterAll(async () => {
  await db.close();
});

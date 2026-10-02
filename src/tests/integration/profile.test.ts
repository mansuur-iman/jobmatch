import { app } from "../../app";
import request from "supertest";
import { db } from "../../prisma/db";
import { jest } from "@jest/globals";

jest.setTimeout(15000);

describe("profile routes", () => {
  beforeEach(async () => {
    // Clear the users table before each test
    await db.orm.public.User.where((u) => u.id.isNotNull()).deleteAll();
  });
  it("successfully creates a profile", async () => {
    //register user//
    const userData = {
      email: "example1@gmail.com",
      username: "Example0",
      password: "Qubyy1234",
    };
    const res = await request(app).post("/api/v1/auth/register").send(userData);
    expect(res.statusCode).toBe(201);
    expect(res.body.user?.id).toBeDefined();

    console.log("REGISTER RESPONSE:", res.body);

    const savedUser = await db.orm.public.User.where({
      email: userData.email,
    }).first();

    console.log("USER AFTER REGISTER:", { ...savedUser, password: undefined });

    //login user//
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: userData?.email, password: userData?.password });

    console.log("login response:", login.body);

    expect(login.statusCode).toBe(200);
    const token = login.body?.token;
    expect(token).toBeDefined();

    //grab user id//
    const userId = login.body?.user?.id;
    expect(userId).toBeDefined();

    //create profile//
    const profileData = {
      skills: ["JavaScript", "TypeScript"],
      experience: { years: 5, companies: ["Company A", "Company B"] },
      university: "Example University",
      degree: "Bachelor's in Computer Science",
      certifications: ["AWS Certified Developer"],
      projects: { project1: "Project A", project2: "Project B" },
      workEnvironment: "Remote",
      languages: ["English", "Spanish"],
      workLocation: "USA",
      jobLevel: "Senior",
      availability: "Full-time",
      roles: ["Frontend Developer", "Backend Developer"],
    };

    const profile = await request(app)
      .post(`/api/v1/profile/${userId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(profileData);

    console.log("PROFILE STATUS:", profile.statusCode);
    console.log("PROFILE RESPONSE:", profile.body);

    //expect profile response//
    expect(profile.statusCode).toBe(201);
    expect(profile.body.profile?.userId).toBe(userId);
  });
});

afterAll(async () => {
  await db.close();
});

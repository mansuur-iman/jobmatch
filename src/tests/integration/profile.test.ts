import { app } from "../../app";
import request from "supertest";
import { db } from "../../prisma/db";
import { jest } from "@jest/globals";

jest.setTimeout(15000);

describe("profile routes", () => {
  beforeEach(async () => {
    // Clear the users table before each test
    await db.orm.public.Profile.where((p) => p.id.isNotNull()).deleteAll();
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

    //login user//
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: userData?.email, password: userData?.password });
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

    //expect profile response//
    expect(profile.statusCode).toBe(201);
    expect(profile.body.profile?.userId).toBe(userId);
  });
  it("fails to create profile with invalid data", async () => {
    //register user//
    const userData = {
      email: "myemail1@gmail.com",
      username: "Uvvyjg12",
      password: "Qubyy1234",
    };
    const res = await request(app).post("/api/v1/auth/register").send(userData);
    expect(res.statusCode).toBe(201);
    expect(res.body.user?.id).toBeDefined();

    //login user//
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: userData?.email, password: userData?.password });

    expect(login.statusCode).toBe(200);
    const token = login.body?.token;
    expect(token).toBeDefined();

    //grab user id//
    const userId = login.body?.user?.id;
    expect(userId).toBeDefined();

    //create profile with invalid data//
    const invalidProfileData = {
      skills: ["J", "TypeScript"],
      university: "Example University",
      degree: "Bachelor's Degree",
      experience: "None",
      projects: { project1: "Project A", project2: "Project B" },
      workEnvironment: "Remote",
      languages: ["English", "Spanish"],
      workLocation: "New York",
      jobLevel: "Senior",
      availability: "Full-time",
      roles: ["Developer", "Team Lead"],
    };

    const invalidProfile = await request(app)
      .post(`/api/v1/profile/${userId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(invalidProfileData);

    //expect invalid profile response//
    expect(invalidProfile.statusCode).toBe(404);
  });

  it("successfully returns profile data", async () => {
    //register user//
    const userData = {
      email: "johnyy1@gmail.com",
      password: "Johnnnyy1122",
      username: "john",
    };

    const res = await request(app).post("/api/v1/auth/register").send(userData);
    expect(res.statusCode).toBe(201);
    expect(res.body.user?.username).toBe(userData.username);

    //login user//
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: userData?.email, password: userData?.password });

    //grab user id//
    const userId = login?.body?.user.id;
    expect(userId).toBeDefined();

    //grap token//
    const token = login?.body?.token;
    expect(token).toBeDefined();

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
    expect(profile.statusCode).toBe(201);
    expect(profile.body.profile?.userId).toBe(userId);

    //get profile//
    const getProfile = await request(app)
      .get(`/api/v1/profile/${userId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(getProfile.statusCode).toBe(200);
    expect(getProfile.body.profile?.userId).toBe(userId);
  });

  it("fails to return profile data for non-existent user", async () => {
    //register user//
    const userData = {
      email: "example12@gmail.com",
      username: "Example12",
      password: "Example0000",
    };

    const res = await request(app).post("/api/v1/auth/register").send(userData);
    expect(res.statusCode).toBe(201);
    expect(res.body.user?.id).toBeDefined();

    //login user//
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: userData?.email, password: userData?.password });

    expect(login.statusCode).toBe(200);
    const token = login.body?.token;
    expect(token).toBeDefined();

    //grab user id//
    const userId = login.body?.user?.id;
    expect(userId).toBeDefined();

    //get profile for non-existent user//
    const getProfile = await request(app)
      .get(`/api/v1/profile/nonexistentuserid`)
      .set("Authorization", `Bearer ${token}`);
    expect(getProfile.statusCode).toBe(400);
  });

  it("sucessfully update profile data", async () => {
    //register user//
    const userData = {
      email: "example12@gmail.com",
      username: "Example12",
      password: "Example0000",
    };
    const res = await request(app).post("/api/v1/auth/register").send(userData);
    expect(res.statusCode).toBe(201);
    expect(res.body.user?.id).toBeDefined();

    //login user//
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: userData?.email, password: userData?.password });

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
    expect(profile.statusCode).toBe(201);
    expect(profile.body.profile?.userId).toBe(userId);

    //update profile//
    const updatedProfileData = {
      skills: ["Python", "Django"],
    };

    const updateProfile = await request(app)
      .patch(`/api/v1/profile/${userId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(updatedProfileData);

    expect(updateProfile.statusCode).toBe(200);
    expect(updateProfile.body.profile?.skills).toEqual(
      updatedProfileData.skills,
    );
  });
});

afterAll(async () => {
  await db.close();
});

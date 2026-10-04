import { app } from "../../app";
import request from "supertest";
import { db } from "../../prisma/db";
import { jest } from "@jest/globals";
import { createAuthenticatedUser } from "../../helpers/test-user";

jest.setTimeout(15000);

const userData = {
  email: "examplemail@gmaiil.com",
  password: "Myemail11",
  username: "Example01",
};

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

describe("profile routes", () => {
  beforeEach(async () => {
    // Clear the users table before each test
    await db.orm.public.Profile.where((p) => p.id.isNotNull()).deleteAll();
    await db.orm.public.User.where((u) => u.id.isNotNull()).deleteAll();
  });
  it("successfully creates a profile", async () => {
    const { userId, token } = await createAuthenticatedUser(userData);

    //create profile//
    const createProfile = profileData;

    const profile = await request(app)
      .post(`/api/v1/profile/${userId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(createProfile);

    //expect profile response//
    expect(profile.statusCode).toBe(201);
    expect(profile.body.profile?.userId).toBe(userId);
  });
  it("fails to create profile with invalid data", async () => {
    const { userId, token } = await createAuthenticatedUser(userData);

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
    const { userId, token } = await createAuthenticatedUser(userData);

    //create profile//
    const createProfile = profileData;

    const profile = await request(app)
      .post(`/api/v1/profile/${userId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(createProfile);
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
    const { token } = await createAuthenticatedUser(userData);

    //get profile for non-existent user//
    const getProfile = await request(app)
      .get(`/api/v1/profile/nonexistentuserid`)
      .set("Authorization", `Bearer ${token}`);
    expect(getProfile.statusCode).toBe(400);
  });

  it("sucessfully update profile data", async () => {
    const { userId, token } = await createAuthenticatedUser(userData);

    //create profile//
    const createProfile = profileData;

    const profile = await request(app)
      .post(`/api/v1/profile/${userId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(createProfile);
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

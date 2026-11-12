import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterAll,
} from "@jest/globals";
import request from "supertest";

jest.setTimeout(15000);

// ---- Mock the background pipeline services (must be registered BEFORE app is imported) ----
const mockFetchJobs =
  jest.fn<(role: string, location?: string) => Promise<void>>();
const mockPushJobs = jest.fn<() => Promise<void>>();
const mockGenerate = jest.fn<(userId: string) => Promise<void>>();

jest.unstable_mockModule("../../services/jobIngestion", () => ({
  fetchAndStoreJobsForProfile: mockFetchJobs,
}));
jest.unstable_mockModule("../../services/aiIndexer", () => ({
  pushUnindexedJobs: mockPushJobs,
}));
jest.unstable_mockModule("../../services/recommender", () => ({
  generateRecommendations: mockGenerate,
}));

// Everything that (directly or indirectly) imports the controller must load AFTER the mocks.
const { app } = await import("../../app");
const { db } = await import("../../prisma/db");
const { createAuthenticatedUser } = await import("../../helpers/test-user");

// ---- Routes (from app.ts and profile.routes.ts) ----
const profileUrl = (userId: string) => `/api/v1/profile/${userId}`;
const RECOMMENDATIONS_URL = "/api/v1/profile/recommendations";

// ---- Test data ----
const makeUser = (n: number) => ({
  email: `examplemail${n}@gmaiil.com`,
  password: "Myemail11",
  username: `Example0${n}`,
});

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

// ---- Helpers ----
// Insert a profile directly in the DB (no API call, so no background pipeline fires).
const seedProfile = (userId: string, overrides: Record<string, unknown> = {}) =>
  db.orm.public.Profile.create({ userId, ...profileData, ...overrides } as any);

let jobCounter = 0;
const seedJob = (overrides: Record<string, unknown> = {}) => {
  jobCounter++;
  return db.orm.public.Job.create({
    externalJobId: `ext-${jobCounter}`,
    title: `Job ${jobCounter}`,
    description: "Build things",
    location: "Nairobi KE",
    applyUrl: "https://example.com/apply",
    employmentType: "FULLTIME",
    minSalary: 0,
    maxSalary: 0,
    requiredSkills: [],
    company: "Acme",
    companyLogo: "",
    companyWebsite: "",
    postedAt: Temporal.Instant.from("2026-11-01T10:00:00Z"),
    aiIndexed: true,
    ...overrides,
  } as any);
};

const seedRecommendation = (
  userId: string,
  jobId: string,
  score: number,
  status: string = "new",
) =>
  db.orm.public.Recommendation.create({ userId, jobId, score, status } as any);

// The pipeline runs after the response is sent, so poll until the assertion holds.
const waitFor = async (assertion: () => void, timeoutMs = 2000) => {
  const start = Date.now();
  for (;;) {
    try {
      assertion();
      return;
    } catch (err) {
      if (Date.now() - start > timeoutMs) throw err;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
};

describe("profile routes", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockFetchJobs.mockResolvedValue(undefined);
    mockPushJobs.mockResolvedValue(undefined);
    mockGenerate.mockResolvedValue(undefined);
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});

    // Delete in FK-safe order (children first). Make sure this points at the TEST database.
    await db.orm.public.Recommendation.where((r) =>
      r.id.isNotNull(),
    ).deleteAll();
    await db.orm.public.Profile.where((p) => p.id.isNotNull()).deleteAll();
    await db.orm.public.Job.where((j) => j.id.isNotNull()).deleteAll();
    await db.orm.public.User.where((u) => u.id.isNotNull()).deleteAll();
  });

  // ---------------------------------------------------------------- POST
  describe("POST /profile/:id", () => {
    it("creates a profile", async () => {
      const { userId, token } = await createAuthenticatedUser(makeUser(1));

      const res = await request(app)
        .post(profileUrl(userId))
        .set("Authorization", `Bearer ${token}`)
        .send(profileData);

      expect(res.statusCode).toBe(201);
      expect(res.body.profile?.userId).toBe(userId);
      expect(res.body.recommendationStatus).toBe("processing");
    });

    it("runs the background pipeline with the first role and the work location", async () => {
      const { userId, token } = await createAuthenticatedUser(makeUser(1));

      await request(app)
        .post(profileUrl(userId))
        .set("Authorization", `Bearer ${token}`)
        .send(profileData);

      await waitFor(() => {
        expect(mockFetchJobs).toHaveBeenCalledWith("Frontend Developer", "USA");
        expect(mockPushJobs).toHaveBeenCalledTimes(1);
        expect(mockGenerate).toHaveBeenCalledWith(userId);
      });
    });

    it("still returns 201 when the background pipeline fails", async () => {
      mockFetchJobs.mockRejectedValue(new Error("JSearch down"));
      const { userId, token } = await createAuthenticatedUser(makeUser(1));

      const res = await request(app)
        .post(profileUrl(userId))
        .set("Authorization", `Bearer ${token}`)
        .send(profileData);

      expect(res.statusCode).toBe(201);
      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith(
          "Background pipeline failed.",
          expect.any(Error),
        );
      });
      expect(mockGenerate).not.toHaveBeenCalled(); // pipeline stopped at the failed step
    });

    it("returns 400 with validation errors for invalid data", async () => {
      const { userId, token } = await createAuthenticatedUser(makeUser(1));

      const res = await request(app)
        .post(profileUrl(userId))
        .set("Authorization", `Bearer ${token}`)
        .send({
          ...profileData,
          skills: ["J", "TypeScript"],
          experience: "None",
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(mockFetchJobs).not.toHaveBeenCalled();
    });

    it("returns 401 without a token", async () => {
      const { userId } = await createAuthenticatedUser(makeUser(1));

      const res = await request(app).post(profileUrl(userId)).send(profileData);

      expect(res.statusCode).toBe(401);
    });

    it("returns 403 when creating a profile for another user", async () => {
      const { token } = await createAuthenticatedUser(makeUser(1));
      const other = await createAuthenticatedUser(makeUser(2));

      const res = await request(app)
        .post(profileUrl(other.userId))
        .set("Authorization", `Bearer ${token}`)
        .send(profileData);

      expect(res.statusCode).toBe(403);
      const stored = await db.orm.public.Profile.where({
        userId: other.userId,
      }).first();
      expect(stored).toBeNull();
    });

    it("returns 409 when the profile already exists", async () => {
      const { userId, token } = await createAuthenticatedUser(makeUser(1));
      await seedProfile(userId);

      const res = await request(app)
        .post(profileUrl(userId))
        .set("Authorization", `Bearer ${token}`)
        .send(profileData);

      expect(res.statusCode).toBe(409);
    });
  });

  // ---------------------------------------------------------------- GET
  describe("GET /profile/:id", () => {
    it("returns the profile", async () => {
      const { userId, token } = await createAuthenticatedUser(makeUser(1));
      await seedProfile(userId);

      const res = await request(app)
        .get(profileUrl(userId))
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.profile?.userId).toBe(userId);
      expect(res.body.profile?.skills).toEqual(profileData.skills);
    });

    it("returns 404 when the user has no profile yet", async () => {
      const { userId, token } = await createAuthenticatedUser(makeUser(1));

      const res = await request(app)
        .get(profileUrl(userId))
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
    });

    it("returns 400 for a non-existent user", async () => {
      const { token } = await createAuthenticatedUser(makeUser(1));

      const res = await request(app)
        .get(profileUrl("nonexistentuserid"))
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(400);
    });

    it("returns 401 without a token", async () => {
      const { userId } = await createAuthenticatedUser(makeUser(1));

      const res = await request(app).get(profileUrl(userId));

      expect(res.statusCode).toBe(401);
    });

    // getProfile currently has no ownership check, so any logged-in user can read any profile.
    it.todo("returns 403 when reading another user's profile");
  });

  // ---------------------------------------------------------------- PATCH
  describe("PATCH /profile/:id", () => {
    it("updates the given fields and leaves the others unchanged", async () => {
      const { userId, token } = await createAuthenticatedUser(makeUser(1));
      await seedProfile(userId);

      const res = await request(app)
        .patch(profileUrl(userId))
        .set("Authorization", `Bearer ${token}`)
        .send({ skills: ["Python", "Django"] });

      expect(res.statusCode).toBe(200);
      expect(res.body.profile?.skills).toEqual(["Python", "Django"]);
      expect(res.body.profile?.university).toBe(profileData.university);
      expect(res.body.profile?.roles).toEqual(profileData.roles);
      expect(res.body.recommendationStatus).toBe("processing");
    });

    // EXPECTED TO FAIL until the controller handles `projects` (it is not destructured or copied
    // into updateData today, so the request returns 200 but nothing changes).
    it("updates projects", async () => {
      const { userId, token } = await createAuthenticatedUser(makeUser(1));
      await seedProfile(userId);

      const res = await request(app)
        .patch(profileUrl(userId))
        .set("Authorization", `Bearer ${token}`)
        .send({ projects: { project3: "Project C" } });

      expect(res.statusCode).toBe(200);
      expect(res.body.profile?.projects).toEqual({ project3: "Project C" });
    });

    it("re-runs job discovery when roles or workLocation change", async () => {
      const { userId, token } = await createAuthenticatedUser(makeUser(1));
      await seedProfile(userId);

      await request(app)
        .patch(profileUrl(userId))
        .set("Authorization", `Bearer ${token}`)
        .send({ roles: ["Data Engineer"] });

      await waitFor(() => {
        expect(mockFetchJobs).toHaveBeenCalledWith("Data Engineer", "USA");
        expect(mockPushJobs).toHaveBeenCalledTimes(1);
        expect(mockGenerate).toHaveBeenCalledWith(userId);
      });
    });

    it("only regenerates recommendations when discovery preferences are unchanged", async () => {
      const { userId, token } = await createAuthenticatedUser(makeUser(1));
      await seedProfile(userId);

      await request(app)
        .patch(profileUrl(userId))
        .set("Authorization", `Bearer ${token}`)
        .send({ skills: ["Python"] });

      await waitFor(() => {
        expect(mockGenerate).toHaveBeenCalledWith(userId);
      });
      expect(mockFetchJobs).not.toHaveBeenCalled();
      expect(mockPushJobs).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid data", async () => {
      const { userId, token } = await createAuthenticatedUser(makeUser(1));
      await seedProfile(userId);

      const res = await request(app)
        .patch(profileUrl(userId))
        .set("Authorization", `Bearer ${token}`)
        .send({ skills: ["J"], experience: "None" });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("returns 404 when the profile does not exist", async () => {
      const { userId, token } = await createAuthenticatedUser(makeUser(1));

      const res = await request(app)
        .patch(profileUrl(userId))
        .set("Authorization", `Bearer ${token}`)
        .send({ skills: ["Python"] });

      expect(res.statusCode).toBe(404);
    });

    it("returns 401 without a token", async () => {
      const { userId } = await createAuthenticatedUser(makeUser(1));

      const res = await request(app)
        .patch(profileUrl(userId))
        .send({ skills: ["Python"] });

      expect(res.statusCode).toBe(401);
    });

    it("returns 403 when updating another user's profile", async () => {
      const { token } = await createAuthenticatedUser(makeUser(1));
      const other = await createAuthenticatedUser(makeUser(2));
      await seedProfile(other.userId);

      const res = await request(app)
        .patch(profileUrl(other.userId))
        .set("Authorization", `Bearer ${token}`)
        .send({ skills: ["Hacked"] });

      expect(res.statusCode).toBe(403);
      const stored = await db.orm.public.Profile.where({
        userId: other.userId,
      }).first();
      expect(stored?.skills).toEqual(profileData.skills);
    });
  });

  // ---------------------------------------------------------------- Recommendations
  describe("GET recommendations", () => {
    it("returns an empty array when the user has none", async () => {
      const { token } = await createAuthenticatedUser(makeUser(1));

      const res = await request(app)
        .get(RECOMMENDATIONS_URL)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns { job, matchScore } sorted by score, highest first", async () => {
      const { userId, token } = await createAuthenticatedUser(makeUser(1));
      const low = await seedJob({ title: "Low" });
      const high = await seedJob({ title: "High" });
      const mid = await seedJob({ title: "Mid" });
      await seedRecommendation(userId, low.id, 40);
      await seedRecommendation(userId, high.id, 95);
      await seedRecommendation(userId, mid.id, 70);

      const res = await request(app)
        .get(RECOMMENDATIONS_URL)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.map((r: any) => r.matchScore)).toEqual([95, 70, 40]);
      expect(res.body.map((r: any) => r.job.title)).toEqual([
        "High",
        "Mid",
        "Low",
      ]);
    });

    it("only returns recommendations with status 'new'", async () => {
      const { userId, token } = await createAuthenticatedUser(makeUser(1));
      const fresh = await seedJob();
      const applied = await seedJob();
      const dismissed = await seedJob();
      await seedRecommendation(userId, fresh.id, 50, "new");
      await seedRecommendation(userId, applied.id, 99, "applied");
      await seedRecommendation(userId, dismissed.id, 98, "dismissed");

      const res = await request(app)
        .get(RECOMMENDATIONS_URL)
        .set("Authorization", `Bearer ${token}`);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].job.id).toBe(fresh.id);
    });

    it("returns at most 10, keeping the highest scores", async () => {
      const { userId, token } = await createAuthenticatedUser(makeUser(1));
      for (let score = 1; score <= 12; score++) {
        const job = await seedJob();
        await seedRecommendation(userId, job.id, score);
      }

      const res = await request(app)
        .get(RECOMMENDATIONS_URL)
        .set("Authorization", `Bearer ${token}`);

      expect(res.body).toHaveLength(10);
      expect(res.body[0].matchScore).toBe(12);
      expect(res.body[9].matchScore).toBe(3);
    });

    it("does not return another user's recommendations", async () => {
      const { token } = await createAuthenticatedUser(makeUser(1));
      const other = await createAuthenticatedUser(makeUser(2));
      const job = await seedJob();
      await seedRecommendation(other.userId, job.id, 90);

      const res = await request(app)
        .get(RECOMMENDATIONS_URL)
        .set("Authorization", `Bearer ${token}`);

      expect(res.body).toEqual([]);
    });

    it("returns 401 without a token", async () => {
      const res = await request(app).get(RECOMMENDATIONS_URL);

      expect(res.statusCode).toBe(401);
    });
  });
});

afterAll(async () => {
  await db.close();
});

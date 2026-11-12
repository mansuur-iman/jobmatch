import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterAll,
} from "@jest/globals";
import request from "supertest";
import { app } from "../../app";
import { db } from "../../prisma/db";
import { createAuthenticatedUser } from "../../helpers/test-user";

jest.setTimeout(15000);

// ---- Route (from app.ts and recommendation.routes.ts) ----
const statusUrl = (recommendationId: string) =>
  `/api/v1/recommendation/${recommendationId}/status`;

// ---- Test data ----
const makeUser = (n: number) => ({
  email: `examplemail${n}@gmaiil.com`,
  password: "Myemail11",
  username: `Example0${n}`,
});

let jobCounter = 0;
// postedAt is optional in the contract (DateTime()?), so it is left out here.
const seedJob = () => {
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
    aiIndexed: true,
  } as any);
};

const seedRecommendation = async (
  userId: string,
  score = 80,
  status = "new",
) => {
  const job = await seedJob();
  return db.orm.public.Recommendation.create({
    userId,
    jobId: job.id,
    score,
    status,
  } as any);
};

const getStoredStatus = async (recommendationId: string) => {
  const row = await db.orm.public.Recommendation.where({
    id: recommendationId,
  }).first();
  return row?.status;
};

describe("PATCH /recommendation/:recommendationId/status", () => {
  beforeEach(async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    // Delete in FK-safe order (children first). Make sure this points at the TEST database.
    await db.orm.public.Recommendation.where((r) =>
      r.id.isNotNull(),
    ).deleteAll();
    await db.orm.public.Profile.where((p) => p.id.isNotNull()).deleteAll();
    await db.orm.public.Job.where((j) => j.id.isNotNull()).deleteAll();
    await db.orm.public.User.where((u) => u.id.isNotNull()).deleteAll();
  });

  describe("success", () => {
    it.each(["applied", "dismissed"])(
      "updates the status to '%s'",
      async (status) => {
        const { userId, token } = await createAuthenticatedUser(makeUser(1));
        const recommendation = await seedRecommendation(userId);

        const res = await request(app)
          .patch(statusUrl(recommendation.id))
          .set("Authorization", `Bearer ${token}`)
          .send({ status });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe(
          "recommendation status updated successfully.",
        );
        expect(res.body.data?.status).toBe(status);
        expect(await getStoredStatus(recommendation.id)).toBe(status);
      },
    );

    it("changes only the status and leaves the score alone", async () => {
      const { userId, token } = await createAuthenticatedUser(makeUser(1));
      const recommendation = await seedRecommendation(userId, 87);

      const res = await request(app)
        .patch(statusUrl(recommendation.id))
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "applied" });

      expect(res.statusCode).toBe(200);
      expect(res.body.data?.score).toBe(87);
      expect(res.body.data?.jobId).toBe(recommendation.jobId);
    });

    it("does not touch the user's other recommendations", async () => {
      const { userId, token } = await createAuthenticatedUser(makeUser(1));
      const target = await seedRecommendation(userId);
      const untouched = await seedRecommendation(userId);

      await request(app)
        .patch(statusUrl(target.id))
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "dismissed" });

      expect(await getStoredStatus(untouched.id)).toBe("new");
    });
  });

  describe("validation", () => {
    it("returns 400 for a status value that is not allowed", async () => {
      const { userId, token } = await createAuthenticatedUser(makeUser(1));
      const recommendation = await seedRecommendation(userId);

      const res = await request(app)
        .patch(statusUrl(recommendation.id))
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "not-a-status" });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(await getStoredStatus(recommendation.id)).toBe("new");
    });

    it("returns 400 when status is missing", async () => {
      const { userId, token } = await createAuthenticatedUser(makeUser(1));
      const recommendation = await seedRecommendation(userId);

      const res = await request(app)
        .patch(statusUrl(recommendation.id))
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(await getStoredStatus(recommendation.id)).toBe("new");
    });

    it("returns 400 when status is not a string", async () => {
      const { userId, token } = await createAuthenticatedUser(makeUser(1));
      const recommendation = await seedRecommendation(userId);

      const res = await request(app)
        .patch(statusUrl(recommendation.id))
        .set("Authorization", `Bearer ${token}`)
        .send({ status: 123 });

      expect(res.statusCode).toBe(400);
      expect(await getStoredStatus(recommendation.id)).toBe("new");
    });
  });

  describe("auth and ownership", () => {
    it("returns 401 without a token", async () => {
      const { userId } = await createAuthenticatedUser(makeUser(1));
      const recommendation = await seedRecommendation(userId);

      const res = await request(app)
        .patch(statusUrl(recommendation.id))
        .send({ status: "applied" });

      expect(res.statusCode).toBe(401);
      expect(await getStoredStatus(recommendation.id)).toBe("new");
    });

    it("returns 404 for a recommendation that does not exist", async () => {
      const { token } = await createAuthenticatedUser(makeUser(1));

      const res = await request(app)
        .patch(statusUrl("nonexistent-recommendation-id"))
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "applied" });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe("recommendation not found.");
    });

    it("returns 404 and changes nothing for another user's recommendation", async () => {
      const { token } = await createAuthenticatedUser(makeUser(1));
      const other = await createAuthenticatedUser(makeUser(2));
      const othersRecommendation = await seedRecommendation(other.userId);

      const res = await request(app)
        .patch(statusUrl(othersRecommendation.id))
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "dismissed" });

      expect(res.statusCode).toBe(404);
      expect(await getStoredStatus(othersRecommendation.id)).toBe("new");
    });
  });
});

afterAll(async () => {
  await db.close();
});

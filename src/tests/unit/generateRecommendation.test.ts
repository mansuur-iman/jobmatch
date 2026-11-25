import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";

// ---- Mocks (must be registered before the module under test is imported) ----
// Profile.where({ userId }).first()
const profileFirst = jest.fn<() => Promise<any>>();
const profileWhere = jest.fn<
  (filter: unknown) => { first: typeof profileFirst }
>(() => ({ first: profileFirst }));

// Recommendation.where(...).all() / .first() / .update(...)  and  Recommendation.create(...)
const recAll = jest.fn<() => Promise<any[]>>();
const recFirst = jest.fn<() => Promise<any>>();
const recUpdate = jest.fn<(data: unknown) => Promise<unknown>>();
const recCreate = jest.fn<(data: unknown) => Promise<unknown>>();
const recWhere = jest.fn<
  (filter: unknown) => {
    all: typeof recAll;
    first: typeof recFirst;
    update: typeof recUpdate;
  }
>(() => ({ all: recAll, first: recFirst, update: recUpdate }));

// Job.where({ id }).first()
const jobFirst = jest.fn<() => Promise<any>>();
const jobWhere = jest.fn<(filter: unknown) => { first: typeof jobFirst }>(
  () => ({ first: jobFirst }),
);

jest.unstable_mockModule("../../prisma/db", () => ({
  db: {
    orm: {
      public: {
        Profile: { where: profileWhere },
        Recommendation: { where: recWhere, create: recCreate },
        Job: { where: jobWhere },
      },
    },
  },
}));

// Adjust this path to wherever the function lives (relative to src/tests/unit).
const { generateRecommendations } = await import("../../services/recommender");

const mockFetch = jest.fn<(...args: any[]) => Promise<any>>();

// ---- Helpers ----
const USER_ID = "user-1";
const profile = {
  id: "profile-1",
  userId: USER_ID,
  primaryRole: "Backend Developer",
};

const mockAiResponse = (body: unknown, ok = true, status = 200) => {
  mockFetch.mockResolvedValue({ ok, status, json: async () => body });
};

describe("generateRecommendations", () => {
  let warnSpy: jest.SpiedFunction<typeof console.warn>;
  const originalUrl = process.env.AI_SERVICE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_SERVICE_URL = "http://ai.test";
    process.env.AI_SERVICE_API_KEY = "test-key";
    mockFetch.mockReset();
    globalThis.fetch = mockFetch as any;

    profileFirst.mockResolvedValue(profile);
    recAll.mockResolvedValue([]);
    recFirst.mockResolvedValue(null); // no existing (user, job) pair
    recUpdate.mockResolvedValue({});
    recCreate.mockResolvedValue({});
    jobFirst.mockResolvedValue({ id: "job-1" }); // job exists
    mockAiResponse({ recommendations: [{ job_id: "job-1", score: 80 }] });

    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.AI_SERVICE_URL;
    else process.env.AI_SERVICE_URL = originalUrl;
    jest.restoreAllMocks();
  });

  describe("preconditions", () => {
    it("throws when the profile is not found and never calls the AI service", async () => {
      profileFirst.mockResolvedValue(null);

      await expect(generateRecommendations(USER_ID)).rejects.toThrow(
        "Profile not found.",
      );

      expect(profileWhere).toHaveBeenCalledWith({ userId: USER_ID });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("throws when AI_SERVICE_URL is not defined", async () => {
      delete process.env.AI_SERVICE_URL;

      await expect(generateRecommendations(USER_ID)).rejects.toThrow(
        "Ai service url not defined.",
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("request to the AI service", () => {
    it("loads the user's existing recommendations", async () => {
      await generateRecommendations(USER_ID);

      expect(recWhere).toHaveBeenCalledWith({ userId: USER_ID });
      expect(recAll).toHaveBeenCalledTimes(1);
    });

    it("POSTs the profile and excludeJobIds with the right URL, headers and timeout", async () => {
      await generateRecommendations(USER_ID);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0] ?? [];
      expect(url).toBe("http://ai.test/api/v1/recommendations");
      expect(options).toEqual(
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: expect.any(AbortSignal),
        }),
      );
      expect(JSON.parse(options.body as string)).toEqual({
        profile,
        excludeJobIds: [],
      });
    });

    it("excludes only applied and dismissed jobs", async () => {
      recAll.mockResolvedValue([
        { id: "r1", jobId: "applied-job", status: "applied" },
        { id: "r2", jobId: "dismissed-job", status: "dismissed" },
        { id: "r3", jobId: "new-job", status: "new" },
      ]);

      await generateRecommendations(USER_ID);

      const [, options] = mockFetch.mock.calls[0] ?? [];
      expect(JSON.parse(options.body as string).excludeJobIds).toEqual([
        "applied-job",
        "dismissed-job",
      ]);
    });
  });

  describe("AI response validation", () => {
    it("throws when the AI service responds with a non-OK status", async () => {
      mockAiResponse({}, false, 503);

      await expect(generateRecommendations(USER_ID)).rejects.toThrow(
        "AI service responded with status: 503",
      );

      expect(recCreate).not.toHaveBeenCalled();
    });

    it("throws when recommendations is not an array", async () => {
      mockAiResponse({ recommendations: "nope" });

      await expect(generateRecommendations(USER_ID)).rejects.toThrow(
        "Invalid AI recommendation response.",
      );
    });

    it("throws when recommendations is missing", async () => {
      mockAiResponse({});

      await expect(generateRecommendations(USER_ID)).rejects.toThrow(
        "Invalid AI recommendation response.",
      );
    });

    it("propagates network errors from fetch", async () => {
      mockFetch.mockRejectedValue(new Error("timeout"));

      await expect(generateRecommendations(USER_ID)).rejects.toThrow("timeout");
    });

    it("does nothing when the AI service returns no recommendations", async () => {
      mockAiResponse({ recommendations: [] });

      await generateRecommendations(USER_ID);

      expect(recCreate).not.toHaveBeenCalled();
      expect(recUpdate).not.toHaveBeenCalled();
    });
  });

  describe("saving recommendations", () => {
    it("creates a new recommendation with status 'new'", async () => {
      await generateRecommendations(USER_ID);

      expect(jobWhere).toHaveBeenCalledWith({ id: "job-1" });
      expect(recWhere).toHaveBeenCalledWith({
        userId: USER_ID,
        jobId: "job-1",
      });
      expect(recCreate).toHaveBeenCalledWith({
        userId: USER_ID,
        jobId: "job-1",
        score: 80,
        status: "new",
      });
      expect(recUpdate).not.toHaveBeenCalled();
    });

    it("updates the score when the (user, job) pair already exists", async () => {
      recFirst.mockResolvedValue({ id: "rec-9", status: "new" });

      await generateRecommendations(USER_ID);

      expect(recWhere).toHaveBeenCalledWith({ id: "rec-9" });
      expect(recUpdate).toHaveBeenCalledWith({ score: 80 });
      expect(recCreate).not.toHaveBeenCalled();
    });

    it.each([0, 100])("accepts the boundary score %d", async (score) => {
      mockAiResponse({ recommendations: [{ job_id: "job-1", score }] });

      await generateRecommendations(USER_ID);

      expect(recCreate).toHaveBeenCalledWith(
        expect.objectContaining({ score }),
      );
    });

    it("saves every valid recommendation in a batch", async () => {
      mockAiResponse({
        recommendations: [
          { job_id: "job-1", score: 90 },
          { job_id: "job-2", score: 70 },
        ],
      });

      await generateRecommendations(USER_ID);

      expect(recCreate).toHaveBeenCalledTimes(2);
      expect(recCreate).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: "job-1", score: 90 }),
      );
      expect(recCreate).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: "job-2", score: 70 }),
      );
    });
  });

  describe("skipping bad recommendations", () => {
    it.each([
      ["non-string job_id", { job_id: 123, score: 50 }],
      ["missing job_id", { score: 50 }],
      ["string score", { job_id: "job-1", score: "50" }],
      ["missing score", { job_id: "job-1" }],
      ["NaN score", { job_id: "job-1", score: NaN }],
      ["Infinity score", { job_id: "job-1", score: Infinity }],
      ["negative score", { job_id: "job-1", score: -1 }],
      ["score above 100", { job_id: "job-1", score: 101 }],
    ])("skips a recommendation with %s", async (_label, bad) => {
      mockAiResponse({ recommendations: [bad] });

      await generateRecommendations(USER_ID);

      expect(warnSpy).toHaveBeenCalledWith(
        "Skipping invalid recommendation:",
        bad,
      );
      expect(jobWhere).not.toHaveBeenCalled();
      expect(recCreate).not.toHaveBeenCalled();
    });

    it("skips jobs the user already applied to or dismissed", async () => {
      recAll.mockResolvedValue([
        { id: "r1", jobId: "job-1", status: "applied" },
      ]);

      await generateRecommendations(USER_ID);

      expect(warnSpy).toHaveBeenCalledWith(
        "Skipping malformed AI output (existing recommendations)",
      );
      expect(jobWhere).not.toHaveBeenCalled();
      expect(recCreate).not.toHaveBeenCalled();
    });

    it("skips job IDs that do not exist in the database", async () => {
      jobFirst.mockResolvedValue(null);

      await generateRecommendations(USER_ID);

      expect(warnSpy).toHaveBeenCalledWith("Skipping unknown job ID: job-1");
      expect(recCreate).not.toHaveBeenCalled();
      expect(recUpdate).not.toHaveBeenCalled();
    });

    it.each(["applied", "dismissed"])(
      "does not overwrite a pair that became %s after the initial lookup",
      async (status) => {
        // Not in the initial exclude list, but the per-pair lookup finds it (race condition guard).
        recFirst.mockResolvedValue({ id: "rec-9", status });

        await generateRecommendations(USER_ID);

        expect(warnSpy).toHaveBeenCalledWith(
          "Skipping applied or dismissed (user,job) pair",
        );
        expect(recUpdate).not.toHaveBeenCalled();
        expect(recCreate).not.toHaveBeenCalled();
      },
    );

    it("keeps processing after skipping a bad item", async () => {
      jobFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "job-2" });
      mockAiResponse({
        recommendations: [
          { job_id: "unknown", score: 60 },
          { job_id: "job-2", score: 75 },
        ],
      });

      await generateRecommendations(USER_ID);

      expect(recCreate).toHaveBeenCalledTimes(1);
      expect(recCreate).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: "job-2", score: 75 }),
      );
    });
  });
});

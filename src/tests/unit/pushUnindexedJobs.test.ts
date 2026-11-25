import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";

// ---- Mocks (must be registered before the module under test is imported) ----
const mockAll = jest.fn<() => Promise<any[]>>();
const mockLimit = jest.fn<(n: number) => { all: typeof mockAll }>(() => ({
  all: mockAll,
}));
const mockUpdateAll = jest.fn<(data: unknown) => Promise<unknown>>();
const mockWhere = jest.fn<
  (filter: unknown) => {
    limit: typeof mockLimit;
    updateAll: typeof mockUpdateAll;
  }
>(() => ({ limit: mockLimit, updateAll: mockUpdateAll }));

jest.unstable_mockModule("../../prisma/db", () => ({
  db: {
    orm: {
      public: {
        Job: { where: mockWhere },
      },
    },
  },
}));

const { pushUnindexedJobs } = await import("../../services/aiIndexer");

const mockFetch = jest.fn<(...args: any[]) => Promise<any>>();

// ---- Helpers ----
const makeJob = (overrides: Record<string, unknown> = {}) => ({
  id: "job-1",
  title: "Backend Developer",
  description: "Build APIs",
  employmentType: "FULLTIME",
  requiredSkills: ["node", "postgres"],
  company: "Acme",
  location: "Nairobi KE",
  // fields that must NOT be sent to the AI service
  applyUrl: "https://example.com/apply",
  minSalary: 1000,
  aiIndexed: false,
  ...overrides,
});

const mockAiResponse = (body: unknown, ok = true, status = 200) => {
  mockFetch.mockResolvedValue({ ok, status, json: async () => body });
};

describe("pushUnindexedJobs", () => {
  let warnSpy: jest.SpiedFunction<typeof console.warn>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;
  const originalUrl = process.env.AI_SERVICE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_SERVICE_URL = "http://ai.test";
    process.env.AI_SERVICE_API_KEY = "test-key";
    mockFetch.mockReset();
    globalThis.fetch = mockFetch as any;
    mockAll.mockResolvedValue([makeJob()]);
    mockUpdateAll.mockResolvedValue({});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.AI_SERVICE_URL = originalUrl;
    jest.restoreAllMocks();
  });

  describe("fetching unindexed jobs", () => {
    it("queries for up to 10 jobs with aiIndexed false", async () => {
      mockAiResponse({ indexed: ["job-1"], failed: [] });

      await pushUnindexedJobs();

      expect(mockWhere).toHaveBeenCalledWith({ aiIndexed: false });
      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it("does not call the AI service when there is nothing to index", async () => {
      mockAll.mockResolvedValue([]);

      await pushUnindexedJobs();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockUpdateAll).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe("request to the AI service", () => {
    it("POSTs only the expected job fields as JSON", async () => {
      mockAll.mockResolvedValue([
        makeJob({ id: "job-1" }),
        makeJob({ id: "job-2" }),
      ]);
      mockAiResponse({ indexed: ["job-1", "job-2"], failed: [] });

      await pushUnindexedJobs();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0] ?? [];
      expect(url).toBe("http://ai.test/api/v1/jobs/index");
      expect(options).toEqual(
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: expect.any(AbortSignal),
        }),
      );

      const body = JSON.parse(options.body as string);
      expect(body.jobs).toHaveLength(2);
      expect(body.jobs[0]).toEqual({
        id: "job-1",
        title: "Backend Developer",
        description: "Build APIs",
        employmentType: "FULLTIME",
        requiredSkills: ["node", "postgres"],
        company: "Acme",
        location: "Nairobi KE",
      });
    });
  });

  describe("marking jobs as indexed", () => {
    it("marks each indexed job as aiIndexed: true", async () => {
      mockAll.mockResolvedValue([makeJob({ id: "a" }), makeJob({ id: "b" })]);
      mockAiResponse({ indexed: ["a", "b"], failed: [] });

      await pushUnindexedJobs();

      expect(mockWhere).toHaveBeenCalledWith({ id: "a" });
      expect(mockWhere).toHaveBeenCalledWith({ id: "b" });
      expect(mockUpdateAll).toHaveBeenCalledTimes(2);
      expect(mockUpdateAll).toHaveBeenCalledWith({ aiIndexed: true });
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("warns about failed jobs but still marks the indexed ones", async () => {
      mockAll.mockResolvedValue([makeJob({ id: "a" }), makeJob({ id: "b" })]);
      mockAiResponse({ indexed: ["a"], failed: ["b"] });

      await pushUnindexedJobs();

      expect(warnSpy).toHaveBeenCalledWith(
        "AI service failed to index 1 jobs:",
        ["b"],
      );
      expect(mockWhere).toHaveBeenCalledWith({ id: "a" });
      expect(mockWhere).not.toHaveBeenCalledWith({ id: "b" });
      expect(mockUpdateAll).toHaveBeenCalledTimes(1);
    });

    it("does not warn when failed is missing or empty", async () => {
      mockAiResponse({ indexed: ["job-1"] });

      await pushUnindexedJobs();

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("stops and logs if a database update fails", async () => {
      mockAll.mockResolvedValue([makeJob({ id: "a" }), makeJob({ id: "b" })]);
      mockAiResponse({ indexed: ["a", "b"], failed: [] });
      mockUpdateAll.mockRejectedValueOnce(new Error("db down"));

      await expect(pushUnindexedJobs()).resolves.toBeUndefined();

      expect(mockUpdateAll).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        "Error in pushing unindexed jobs:",
        expect.any(Error),
      );
    });
  });

  describe("error handling", () => {
    it("logs and does not update when the AI service returns a non-OK status", async () => {
      mockAiResponse({}, false, 500);

      await pushUnindexedJobs();

      expect(mockUpdateAll).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        "Error in pushing unindexed jobs:",
        expect.any(Error),
      );
      expect((errorSpy.mock.calls[0]?.[1] as Error).message).toBe(
        "AI service responded with 500",
      );
    });

    it("throws internally and does not update when indexed is empty", async () => {
      mockAiResponse({ indexed: [], failed: ["job-1"] });

      await pushUnindexedJobs();

      expect(mockUpdateAll).not.toHaveBeenCalled();
      expect((errorSpy.mock.calls[0]?.[1] as Error).message).toContain(
        "AI service indexed nothing",
      );
    });

    it("throws internally and does not update when indexed is not an array", async () => {
      mockAiResponse({ failed: [] });

      await pushUnindexedJobs();

      expect(mockUpdateAll).not.toHaveBeenCalled();
      expect((errorSpy.mock.calls[0]?.[1] as Error).message).toContain(
        "AI service indexed nothing",
      );
    });

    it("logs and resolves when fetch rejects (e.g. timeout or network error)", async () => {
      mockFetch.mockRejectedValue(new Error("timeout"));

      await expect(pushUnindexedJobs()).resolves.toBeUndefined();

      expect(mockUpdateAll).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        "Error in pushing unindexed jobs:",
        expect.any(Error),
      );
    });

    it("logs and resolves when the database query fails", async () => {
      mockAll.mockRejectedValue(new Error("query failed"));

      await expect(pushUnindexedJobs()).resolves.toBeUndefined();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        "Error in pushing unindexed jobs:",
        expect.any(Error),
      );
    });
  });

  describe("concurrency guard", () => {
    it("ignores a second call while the first is still running", async () => {
      let resolveFetch!: (value: unknown) => void;
      mockFetch.mockReturnValue(
        new Promise((resolve) => (resolveFetch = resolve)),
      );

      const first = pushUnindexedJobs();
      await pushUnindexedJobs(); // returns immediately because `running` is true

      expect(mockAll).toHaveBeenCalledTimes(1);

      resolveFetch({
        ok: true,
        status: 200,
        json: async () => ({ indexed: ["job-1"], failed: [] }),
      });
      await first;

      expect(mockUpdateAll).toHaveBeenCalledTimes(1);
    });

    it("releases the lock after a failure so the next run can proceed", async () => {
      mockFetch.mockRejectedValueOnce(new Error("boom"));
      await pushUnindexedJobs();

      mockAiResponse({ indexed: ["job-1"], failed: [] });
      await pushUnindexedJobs();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockUpdateAll).toHaveBeenCalledTimes(1);
    });

    it("releases the lock after an empty run", async () => {
      mockAll.mockResolvedValueOnce([]);
      await pushUnindexedJobs();

      mockAiResponse({ indexed: ["job-1"], failed: [] });
      await pushUnindexedJobs();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});

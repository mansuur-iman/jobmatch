import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";

// ---- Mocks (must be registered before the module under test is imported) ----
const mockFirst = jest.fn<() => Promise<unknown>>();
const mockWhere = jest.fn<(filter: unknown) => { first: typeof mockFirst }>(
  () => ({ first: mockFirst }),
);
const mockCreate = jest.fn<(data: any) => Promise<unknown>>();

jest.unstable_mockModule("../../prisma/db", () => ({
  db: {
    orm: {
      public: {
        Job: {
          where: mockWhere,
          create: mockCreate,
        },
      },
    },
  },
}));

// Temporal may not exist in every Node build; stub it so the test is deterministic.
(globalThis as any).Temporal = {
  Instant: { from: jest.fn((s: string) => ({ iso: s })) },
};

const { fetchAndStoreJobsForProfile } =
  await import("../../services/jobIngestion");

const mockFetch = jest.fn<(...args: any[]) => Promise<any>>();

// ---- Helpers ----
const makeJob = (overrides: Record<string, unknown> = {}) => ({
  job_id: "job-1",
  job_title: "Backend Developer",
  job_description: "Build APIs",
  job_city: "Nairobi",
  job_country: "KE",
  job_apply_link: "https://example.com/apply",
  job_employment_type: "FULLTIME",
  job_min_salary: 1000,
  job_max_salary: 2000,
  required_technologies: ["node", "postgres"],
  employer_name: "Acme",
  employer_logo: "https://example.com/logo.png",
  employer_website: "https://acme.com",
  job_posted_at_datetime_utc: "2026-11-01T10:00:00.000Z",
  ...overrides,
});

const mockFetchResponse = (body: unknown, ok = true, status = 200) => {
  mockFetch.mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
};

describe("fetchAndStoreJobsForProfile", () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let warnSpy: jest.SpiedFunction<typeof console.warn>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;
  const originalKey = process.env.JSEARCH_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JSEARCH_API_KEY = "test-key";
    mockFetch.mockReset();
    globalThis.fetch = mockFetch as any;
    mockFirst.mockResolvedValue(null); // job does not exist by default
    mockCreate.mockResolvedValue({});
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.JSEARCH_API_KEY = originalKey;
    jest.restoreAllMocks();
  });

  describe("validation", () => {
    it("returns early and logs when primaryRole is empty", async () => {
      await fetchAndStoreJobsForProfile("");

      expect(errorSpy).toHaveBeenCalledWith("Params not provided.");
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("returns early and logs when location is empty", async () => {
      await fetchAndStoreJobsForProfile("Developer", "");

      expect(errorSpy).toHaveBeenCalledWith("Params not provided.");
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("returns early and logs when the API key is missing", async () => {
      delete process.env.JSEARCH_API_KEY;

      await fetchAndStoreJobsForProfile("Developer");

      expect(errorSpy).toHaveBeenCalledWith("API KEY not found.");
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  describe("request", () => {
    it("calls JSearch with the encoded query and correct headers", async () => {
      mockFetchResponse({ data: [] });

      await fetchAndStoreJobsForProfile("Backend Developer", "Nairobi");

      expect(globalThis.fetch).toHaveBeenCalledWith(
        `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent("Backend Developer Nairobi")}&num_pages=1`,
        {
          method: "GET",
          headers: {
            "X-RapidAPI-Key": "test-key",
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
          },
        },
      );
    });

    it('defaults location to "Remote"', async () => {
      mockFetchResponse({ data: [] });

      await fetchAndStoreJobsForProfile("Developer");

      const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain(encodeURIComponent("Developer Remote"));
    });
  });

  describe("saving jobs", () => {
    it("maps API fields and creates a new job", async () => {
      mockFetchResponse({ data: [makeJob()] });

      await fetchAndStoreJobsForProfile("Developer");

      expect(mockWhere).toHaveBeenCalledWith({ externalJobId: "job-1" });
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith({
        externalJobId: "job-1",
        title: "Backend Developer",
        description: "Build APIs",
        location: "Nairobi KE",
        applyUrl: "https://example.com/apply",
        employmentType: "FULLTIME",
        minSalary: 1000,
        maxSalary: 2000,
        requiredSkills: ["node", "postgres"],
        company: "Acme",
        companyLogo: "https://example.com/logo.png",
        companyWebsite: "https://acme.com",
        postedAt: { iso: "2026-11-01T10:00:00.000Z" },
        aiIndexed: false,
      });
      expect(logSpy).toHaveBeenCalledWith("Suceessfully saved 1 jobs in db.");
    });

    it("applies fallbacks for missing optional fields", async () => {
      mockFetchResponse({
        data: [
          makeJob({
            job_min_salary: null,
            job_max_salary: undefined,
            required_technologies: null,
            employer_logo: null,
            employer_website: undefined,
          }),
        ],
      });

      await fetchAndStoreJobsForProfile("Developer");

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          minSalary: 0,
          maxSalary: 0,
          requiredSkills: [],
          companyLogo: "",
          companyWebsite: "",
        }),
      );
    });

    it("uses only the country when there is no city", async () => {
      mockFetchResponse({
        data: [makeJob({ job_city: null, job_country: "KE" })],
      });

      await fetchAndStoreJobsForProfile("Developer");

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ location: "KE" }),
      );
    });

    it("falls back to the requested location when city and country are missing", async () => {
      mockFetchResponse({
        data: [makeJob({ job_city: null, job_country: null })],
      });

      await fetchAndStoreJobsForProfile("Developer", "Berlin");

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ location: "Berlin" }),
      );
    });

    it("skips jobs that already exist", async () => {
      mockFirst.mockResolvedValue({ id: 1 });
      mockFetchResponse({ data: [makeJob()] });

      await fetchAndStoreJobsForProfile("Developer");

      expect(mockCreate).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith("Skipping existing job.");
      expect(logSpy).toHaveBeenCalledWith("Suceessfully saved 0 jobs in db.");
    });

    it("skips jobs without a job_id", async () => {
      mockFetchResponse({ data: [makeJob({ job_id: undefined })] });

      await fetchAndStoreJobsForProfile("Developer");

      expect(mockWhere).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("saves only new jobs from a mixed batch", async () => {
      mockFirst
        .mockResolvedValueOnce({ id: 1 }) // job-1 exists
        .mockResolvedValueOnce(null); // job-2 is new
      mockFetchResponse({
        data: [makeJob({ job_id: "job-1" }), makeJob({ job_id: "job-2" })],
      });

      await fetchAndStoreJobsForProfile("Developer");

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ externalJobId: "job-2" }),
      );
      expect(logSpy).toHaveBeenCalledWith("Suceessfully saved 1 jobs in db.");
    });

    it("processes at most 10 jobs", async () => {
      const jobs = Array.from({ length: 15 }, (_, i) =>
        makeJob({ job_id: `job-${i}` }),
      );
      mockFetchResponse({ data: jobs });

      await fetchAndStoreJobsForProfile("Developer");

      expect(mockCreate).toHaveBeenCalledTimes(10);
    });

    it("handles a response with no data field", async () => {
      mockFetchResponse({});

      await fetchAndStoreJobsForProfile("Developer");

      expect(mockCreate).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith("Suceessfully saved 0 jobs in db.");
    });
  });

  describe("error handling", () => {
    it("logs and does not save when the API responds with a non-OK status", async () => {
      mockFetchResponse({}, false, 429);

      await fetchAndStoreJobsForProfile("Developer");

      expect(mockCreate).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        "Error while fetching jobs:",
        expect.any(Error),
      );
      expect((errorSpy.mock.calls[0]?.[1] as Error).message).toContain("429");
    });

    it("logs and does not throw when fetch rejects", async () => {
      mockFetch.mockRejectedValue(new Error("network down"));

      await expect(
        fetchAndStoreJobsForProfile("Developer"),
      ).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledWith(
        "Error while fetching jobs:",
        expect.any(Error),
      );
    });

    it("logs and does not throw when the database create fails", async () => {
      mockCreate.mockRejectedValue(new Error("db error"));
      mockFetchResponse({ data: [makeJob()] });

      await expect(
        fetchAndStoreJobsForProfile("Developer"),
      ).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledWith(
        "Error while fetching jobs:",
        expect.any(Error),
      );
    });
  });
});

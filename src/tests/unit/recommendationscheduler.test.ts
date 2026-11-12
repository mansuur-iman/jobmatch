import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";

// ---- Mocks (must be registered before the module under test is imported) ----
const mockSchedule = jest.fn<(...args: any[]) => unknown>();
jest.unstable_mockModule("node-cron", () => ({
  default: { schedule: mockSchedule },
}));

const profileAll = jest.fn<() => Promise<any[]>>();
jest.unstable_mockModule("../../prisma/db", () => ({
  db: { orm: { public: { Profile: { all: profileAll } } } },
}));

const mockGenerate = jest.fn<(userId: string) => Promise<void>>();
jest.unstable_mockModule("../../services/recommender", () => ({
  generateRecommendations: mockGenerate,
}));

// Adjust this path to wherever the scheduler lives (relative to src/tests/unit).
const { recommendationScheduler } =
  await import("../../schedulers/recommendation.scheduler");

// ---- Helper: register the scheduler and grab the function cron would run ----
const getScheduledJob = () => {
  recommendationScheduler();
  const [expression, callback, options] = mockSchedule.mock.calls[0] ?? [];
  return { expression, options, run: callback as () => Promise<void> };
};

describe("recommendationScheduler", () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    jest.clearAllMocks();
    profileAll.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);
    mockGenerate.mockResolvedValue(undefined);
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("scheduling", () => {
    it("schedules daily at 3 AM in the Africa/Nairobi timezone", () => {
      const { expression, options } = getScheduledJob();

      expect(mockSchedule).toHaveBeenCalledTimes(1);
      expect(expression).toBe("0 3 * * *");
      expect(options).toEqual({ timezone: "Africa/Nairobi" });
    });

    it("does not run anything until cron fires", () => {
      getScheduledJob();

      expect(profileAll).not.toHaveBeenCalled();
      expect(mockGenerate).not.toHaveBeenCalled();
    });
  });

  describe("a run", () => {
    it("generates recommendations for every profile, in order", async () => {
      const { run } = getScheduledJob();

      await run();

      expect(mockGenerate).toHaveBeenCalledTimes(2);
      expect(mockGenerate).toHaveBeenNthCalledWith(1, "u1");
      expect(mockGenerate).toHaveBeenNthCalledWith(2, "u2");
      expect(logSpy).toHaveBeenCalledWith(
        "Recommendations generated for userId: u1",
      );
      expect(logSpy).toHaveBeenCalledWith(
        "Recommendations generated for userId: u2",
      );
      expect(logSpy).toHaveBeenCalledWith(
        "Recommendation scheduler completed.",
      );
    });

    it("completes cleanly when there are no profiles", async () => {
      profileAll.mockResolvedValue([]);
      const { run } = getScheduledJob();

      await run();

      expect(mockGenerate).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        "Recommendation scheduler completed.",
      );
    });

    it("keeps going when one user fails", async () => {
      const failure = new Error("AI down");
      mockGenerate
        .mockRejectedValueOnce(failure)
        .mockResolvedValueOnce(undefined);
      const { run } = getScheduledJob();

      await run();

      expect(mockGenerate).toHaveBeenCalledTimes(2);
      expect(errorSpy).toHaveBeenCalledWith(
        "Error generating recommendations for userId: u1",
        failure,
      );
      expect(logSpy).toHaveBeenCalledWith(
        "Recommendations generated for userId: u2",
      );
      expect(logSpy).not.toHaveBeenCalledWith(
        "Recommendations generated for userId: u1",
      );
    });

    it("logs and stops when loading profiles fails", async () => {
      const failure = new Error("db down");
      profileAll.mockRejectedValueOnce(failure);
      const { run } = getScheduledJob();

      await expect(run()).resolves.toBeUndefined();

      expect(mockGenerate).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        "Error in recommendation scheduler:",
        failure,
      );
    });
  });

  describe("overlap guard", () => {
    it("skips a run that starts while the previous one is still active", async () => {
      let resolveGenerate!: () => void;
      mockGenerate.mockReturnValueOnce(
        new Promise<void>((resolve) => (resolveGenerate = resolve)),
      );
      const { run } = getScheduledJob();

      const first = run();
      await run(); // second trigger while the first is still running

      expect(logSpy).toHaveBeenCalledWith(
        "Previous recommendation run is still active.",
      );
      expect(profileAll).toHaveBeenCalledTimes(1);

      resolveGenerate();
      await first; // let the first run finish so the lock is released for later tests
    });

    it("releases the lock after a run that failed", async () => {
      profileAll.mockRejectedValueOnce(new Error("db down"));
      const { run } = getScheduledJob();

      await run(); // fails
      await run(); // must not be blocked

      expect(logSpy).not.toHaveBeenCalledWith(
        "Previous recommendation run is still active.",
      );
      expect(mockGenerate).toHaveBeenCalledTimes(2); // second run processed both users
    });

    it("releases the lock after a successful run", async () => {
      const { run } = getScheduledJob();

      await run();
      await run();

      expect(logSpy).not.toHaveBeenCalledWith(
        "Previous recommendation run is still active.",
      );
      expect(profileAll).toHaveBeenCalledTimes(2);
    });
  });
});

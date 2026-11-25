import { db } from ".././prisma/db";
import { aiFetch } from "./aiClient";
let running = false;
export const pushUnindexedJobs = async () => {
  if (running) return;
  running = true;
  try {
    const unIndexedJobs = await db.orm.public.Job.where({ aiIndexed: false })
      .limit(10)
      .all();
    if (unIndexedJobs.length === 0) return;

    const payload = unIndexedJobs.map((job) => ({
      id: job.id,
      title: job.title,
      description: job.description,
      employmentType: job.employmentType,
      requiredSkills: job.requiredSkills,
      company: job.company,
      location: job.location,
    }));

    const res = await aiFetch("/api/v1/jobs/index", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobs: payload }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      throw new Error(`AI service responded with ${res.status}`);
    }

    const { indexed, failed } = await res.json();

    if (failed?.length) {
      console.warn(`AI service failed to index ${failed.length} jobs:`, failed);
    }

    if (!Array.isArray(indexed) || indexed?.length === 0) {
      throw new Error("AI service indexed nothing:stopping to a void a loop.");
    }

    for (const id of indexed) {
      await db.orm.public.Job.where({ id }).updateAll({ aiIndexed: true });
    }
  } catch (err) {
    console.error("Error in pushing unindexed jobs:", err);
  } finally {
    running = false;
  }
};

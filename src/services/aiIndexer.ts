import { db } from ".././prisma/db";
let running = false;
const pushUnindexedJobs = async () => {
  if (running) return;
  running = true;
  try {
    const unIndexedJobs = await db.orm.public.Job.where({ aiIndexed: false })
      .limit(100)
      .all();
    if (unIndexedJobs.length === 0) return;

    const res = await fetch(`${process.env.AISERVICE_URL}/jobs/index`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobs: unIndexedJobs }),
    });

    if (!res.ok) {
      throw new Error(`AI service responded with ${res.status}`);
    }

    const { indexed } = await res.json();

    if (indexed.length > 0) {
      await db.orm.public.Job.where({ id: indexed.id }).updateAll({
        aiIndexed: true,
      });
    }
  } catch (err) {
    console.error("Error in pushing unindexed jobs:", err);
  } finally {
    running = false;
  }
};

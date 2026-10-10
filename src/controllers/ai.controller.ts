import { db } from ".././prisma/db";
import type { Request, Response, NextFunction } from "express";
export const getRecommendations = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.userId as string;
  try {
    //validate user//
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized user." });
    }

    const profile = await db.orm.public.Profile.where({ userId }).first();
    if (!profile) {
      return res.status(400).json({ error: "Profile not found." });
    }

    const response = await fetch(
      `${process.env.AISERVICE_URL}/reccomendation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile,
        }),
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!response.ok) {
      throw new Error(`recommending AI returned: ${response.status}`);
    }

    const { job_ids } = await response.json();

    if (job_ids.length === 0) {
      return res.status(200).json({ reccomendations: [] });
    }

    const recommendedJobs = await db.orm.public.Job.where({
      id: job_ids.id,
    }).all();

    return res.status(200).json({ recommendations: recommendedJobs });
  } catch (err) {
    console.error("Error in recommending jobs: ", err);
    next(err);
  }
};

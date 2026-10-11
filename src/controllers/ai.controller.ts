import { db } from "../prisma/db";
import type { Request, Response, NextFunction } from "express";

export const getRecommendations = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 1. Identify the authenticated user.
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized user.",
      });
    }

    // 2. Read this user's active recommendations.
    const recommendations = await db.orm.public.Recommendation.where({
      userId,
      status: "new",
    }).all();

    // 3. Sort by score, highest first.
    recommendations.sort((a, b) => b.score - a.score);

    // 4. Select the top 10.
    const topRecommendations = recommendations.slice(0, 10);

    // 5. Load the corresponding job records.
    const jobs = await Promise.all(
      topRecommendations.map(async (recommendation) => {
        const job = await db.orm.public.Job.where({
          id: recommendation.jobId,
        }).first();

        if (!job) {
          return null;
        }

        return {
          ...job,
          matchScore: recommendation.score,
        };
      }),
    );

    // 6. Remove missing jobs and respond.
    return res.status(200).json({
      recommendations: jobs.filter((job) => job !== null),
    });
  } catch (err) {
    next(err);
  }
};

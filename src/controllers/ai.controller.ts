import { db } from ".././prisma/db";
import type { Request, Response, NextFunction } from "express";

export const getRecommendations = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    //get authenticated user//
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized user." });
    }
    //get active recommendations//
    const activeRecommendations = await db.orm.public.Recommendation.where({
      userId,
      status: "new",
    }).all();

    //select top 10 only//
    const topRecommendations = [...activeRecommendations]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    //select the jobs//
    const jobIds = topRecommendations.map((r) => r.jobId);
    const jobsFound = jobIds.length
      ? await db.orm.public.Job.where({ id: { in: jobIds } }).all()
      : [];

    const jobsById = new Map(jobsFound.map((job) => [job.id, job]));

    const recommendations = topRecommendations.flatMap((recommendation) => {
      const job = jobsById.get(recommendation.jobId);
      return job ? [{ job, matchScore: recommendation.score }] : [];
    });

    return res.status(200).json(recommendations);
  } catch (err) {
    console.error("Error in fetching recommendations:", err);
    next(err);
  }
};

import { db } from ".././prisma/db";
import type { Request, Response, NextFunction } from "express";
export const getUnindexedJobs = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const unindexedJobs = await db.orm.public.Job.where({
      aiIndexed: false,
    }).all();
    return unindexedJobs;
  } catch (err) {
    console.error("Error while fetching unindexed jobs:", err);
    next(err);
  }
};

import { db } from ".././prisma/db";
import type { Request, Response, NextFunction } from "express";

export const analyzeJob = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    //get job description from the body//
    const { job_description } = req.body;
    //validate//
    if (typeof job_description !== "string") {
      return res.status(400).json({ error: "Job description not provided." });
    }
    //get authenticated user//
    const userId = req.user?.userId as string;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized user." });
    }
    //get user profile//
    const profile = await db.orm.public.Profile.where({ userId }).first();

    if (!profile) {
      return res.status(403).json({ error: "User profile not found." });
    }
    //call the AI for analyzing//
    const aiCall = await fetch("http://localhost:8000/api/v1/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        job: job_description,
        profile: profile,
      }),
    });

    if (!aiCall.ok) {
      return res.status(aiCall.status).json({
        error: `Error in calling external AI service API: ${aiCall.statusText}`,
      });
    }

    //grap the response//
    const aiResult = await aiCall.json();

    // create the jobanalysis//
    await db.orm.public.JobAnalysis.create({
      userId: userId,
      jobText: job_description,
      result: aiResult,
    });

    //give feedback to client//
    return res.status(200).json({ success: true, data: aiResult });
  } catch (err) {
    console.error("Error while analyzing job", err);
    next(err);
  }
};

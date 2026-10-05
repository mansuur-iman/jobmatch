import { db } from ".././prisma/db";
import type { Request, Response, NextFunction } from "express";
import { jobSchema } from "../validators/job.validator";

export const analyzeJob = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    //get job description from the body//
    const result = jobSchema.safeParse(req.body);
    //validate//
    if (!result.success) {
      return res.status(400).json({ error: "Invalid job description." });
    }

    const { job } = result.data;
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

    const {
      skills,
      experience,
      certifications,
      workEnvironment,
      workLocation,
      roles,
      jobLevel,
      projects,
      degree,
      languages,
      availability,
      university,
    } = profile;
    //call the AI for analyzing//

    let aiResult: any;
    try {
      const aiRes = await fetch(`${process.env.AI_SERVICE_URL}/api/v1/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job: job,
          profile: {
            skills,
            experience,
            certifications,
            workEnvironment,
            workLocation,
            roles,
            jobLevel,
            projects,
            degree,
            languages,
            availability,
            university,
          },
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!aiRes.ok) {
        console.error("AI service error", aiRes.status, await aiRes.text());
        return res.status(502).json({ error: "Analysis service failed." });
      }
      aiResult = await aiRes.json();
    } catch (err) {
      console.error("AI service unreachable", err);
      return res.status(504).json({ error: "Analysis service unavailable." });
    }

    // create the jobanalysis//
    await db.orm.public.JobAnalysis.create({
      userId: userId,
      jobText: job,
      result: aiResult,
    });

    //give feedback to client//
    return res.status(200).json({ success: true, data: aiResult });
  } catch (err) {
    console.error("Error while analyzing job", err);
    next(err);
  }
};

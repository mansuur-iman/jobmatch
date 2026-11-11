import { db } from "../prisma/db";
import type { Request, Response, NextFunction } from "express";
import { profileSchema } from "../validators/profile.validator";
import { generateRecommendations } from "../services/recommender";
import { fetchAndStoreJobsForProfile } from "../services/jobIngestion";
import { pushUnindexedJobs } from "../services/aiIndexer";

import { z } from "zod";

export const createProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 1. Get the authenticated user's ID.
    const authenticatedUserId = req.user?.userId;

    if (!authenticatedUserId) {
      return res.status(401).json({
        error: "Unauthorized user.",
      });
    }

    // 2. Ensure the route ID matches the authenticated user.
    const { id } = req.params;

    if (id !== authenticatedUserId) {
      return res.status(403).json({
        error: "You cannot create a profile for another user.",
      });
    }

    // 3. Validate the incoming profile data.
    const result = profileSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: z.treeifyError(result.error),
      });
    }

    // 4. Confirm the user exists.
    const user = await db.orm.public.User.where({
      id: authenticatedUserId,
    }).first();

    if (!user) {
      return res.status(404).json({
        error: "User not found.",
      });
    }

    // 5. Check whether the profile already exists.
    const existingProfile = await db.orm.public.Profile.where({
      userId: authenticatedUserId,
    }).first();

    if (existingProfile) {
      return res.status(409).json({
        error: "Profile already exists. Use the update endpoint.",
      });
    }

    // 6. Create the profile.
    const {
      skills,
      experience,
      university,
      degree,
      certifications,
      workEnvironment,
      languages,
      workLocation,
      jobLevel,
      availability,
      roles,
      projects,
    } = result.data;

    const profile = await db.orm.public.Profile.create({
      userId: authenticatedUserId,
      skills,
      university,
      degree,
      certifications,
      workEnvironment,
      languages,
      workLocation,
      jobLevel,
      availability,
      roles,
      projects,
      ...(experience !== undefined && { experience }),
    });

    // 7. Start recommendation generation without waiting for it.
    void (async () => {
      try {
        const primaryRole = roles?.[0] || "AI Engineer";
        const location = workLocation || "Remote";

        await fetchAndStoreJobsForProfile(primaryRole, location);

        await pushUnindexedJobs();

        await generateRecommendations(authenticatedUserId);

        console.log(`Background pipeline finished for: ${authenticatedUserId}`);
      } catch (err) {
        console.log("Background pipeline failed.", err);
      }
    })();

    // 8. Return the created profile.
    return res.status(201).json({
      message: "Profile created successfully.",
      profile,
      recommendationStatus: "processing",
    });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    //get user id from params//
    const { id } = req.params;
    //validate user id//
    if (typeof id !== "string") {
      return res.status(400).json({ error: "Invalid user id." });
    }
    //check if user exists//
    const user = await db.orm.public.User.where({ id }).first();
    if (!user) {
      return res.status(400).json({ error: "User not found." });
    }
    /// get user profile from db//
    const profile = await db.orm.public.Profile.where({ userId: id }).first();
    if (!profile) {
      return res
        .status(404)
        .json({ error: "Profile not found.pleae create profile first." });
    }
    //give response to client//
    return res
      .status(200)
      .json({ message: "Profile retrieved successfully.", profile });
  } catch (err) {
    console.error("error in getting profile:", err);
    next(err);
  }
};

export const updateProfile = async (
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

    //get user id from params//
    const { id } = req.params;
    //validate user id //
    if (id !== userId) {
      return res.status(403).json({
        error: "You cannot create a profile for another user.",
      });
    }
    // validate user//
    const user = await db.orm.public.User.where({ id }).first();
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    //update profile schema//
    const updateprofileSchema = profileSchema.partial();

    //validate profile updating data//
    const result = updateprofileSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: z.treeifyError(result.error) });
    }

    const {
      skills,
      experience,
      university,
      degree,
      certifications,
      workEnvironment,
      jobLevel,
      availability,
      roles,
      languages,
      workLocation,
    } = result?.data;

    //update profile data//
    const updateData = {
      ...(skills !== undefined && { skills }),
      ...(university !== undefined && { university }),
      ...(degree !== undefined && { degree }),
      ...(workEnvironment !== undefined && { workEnvironment }),
      ...(languages !== undefined && { languages }),
      ...(workLocation !== undefined && { workLocation }),
      ...(jobLevel !== undefined && { jobLevel }),
      ...(availability !== undefined && { availability }),
      ...(roles !== undefined && { roles }),
      ...(experience !== undefined && { experience }),
      ...(certifications !== undefined && { certifications }),
    };

    //update user profile in db//
    const updatedProfile = await db.orm.public.Profile.where({
      userId: id,
    }).update({
      ...updateData,
    });

    void (async () => {
      try {
        const primaryRole = roles?.[0] || "AI Engineer";
        const location = workLocation || "Remote";

        await fetchAndStoreJobsForProfile(primaryRole, location);

        await pushUnindexedJobs();

        await generateRecommendations(userId);

        console.log(`Background pipeline finished for: ${userId}`);
      } catch (err) {
        console.log("Background pipeline failed.", err);
      }
    })();

    //give response to client//
    return res.status(200).json({
      message: "Profile updated successfully.",
      profile: updatedProfile,
      recommendationStatus: "processing",
    });
  } catch (err) {
    console.error("Error in updating profile.", err);
    next(err);
  }
};

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
      ? await db.orm.public.Job.where((job) => job.id.in(jobIds)).all()
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

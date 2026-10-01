import { db } from ".././prisma/db";
import type { Request, Response, NextFunction } from "express";
import { profileSchema } from "../validators/profile.validator";

export const createProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    //validate user id//
    if (typeof id !== "string") {
      return res.status(400).json({ error: "Invalid user id." });
    }
    //validate profile data//
    const result = profileSchema.safeParse(req.body);

    if (!result.success) {
      return res
        .status(404)
        .json({ error: result.error?.flatten().fieldErrors });
    }

    //validate if user exists//
    const user = await db.orm.public.User.where({ id }).first();

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    //create profile//

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
    } = result.data;

    const profile = await db.orm.public.Profile.create({
      userId: id,
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
    });

    //give resonse to the client//
    return res
      .status(201)
      .json({ message: "Profile created successfully.", profile });
  } catch (err) {
    console.error("error in getting profile:", err);
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
    //get user id from params//
    const { id } = req.params;
    //validate user id //
    if (typeof id !== "string") {
      return res.status(404).json({ error: "Invalid user id." });
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
      return res
        .status(400)
        .json({ error: result.error?.flatten().fieldErrors });
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

    //give response to client//
    return res.status(200).json({
      message: "Profile updated successfully.",
      profile: updatedProfile,
    });
  } catch (err) {
    console.error("Error in updating profile.", err);
    next(err);
  }
};

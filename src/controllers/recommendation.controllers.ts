import { db } from "../prisma/db";
import type { Request, Response, NextFunction } from "express";
import { recommendationStatusSchema } from "../validators/job.validator";
import { z } from "zod";

export const updateRecommendationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const recommendationId = req.params.recommendationId;

    if (typeof recommendationId !== "string") {
      return res.status(400).json({
        error: "Invalid recommendation ID.",
      });
    }
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "unauthorized user." });
    }

    const result = recommendationStatusSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: z.treeifyError(result.error),
      });
    }

    const { status } = result.data;

    const recommendation = await db.orm.public.Recommendation.where({
      id: recommendationId,
      userId,
    }).first();

    if (!recommendation) {
      return res.status(404).json({
        error: "recommendation not found.",
      });
    }

    const updatedRecommendation = await db.orm.public.Recommendation.where({
      id: recommendationId,
      userId,
    }).update({
      status: status,
    });

    return res.json({
      message: "recommendation status updated successfully.",
      data: updatedRecommendation,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

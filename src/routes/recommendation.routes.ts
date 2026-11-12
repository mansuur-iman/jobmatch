import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { updateRecommendationStatus } from "../controllers/recommendation.controllers";

const recommendationRouter = Router();
recommendationRouter.patch(
  "/:recommendationId/status",
  authenticateToken,
  updateRecommendationStatus,
);

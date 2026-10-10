import { Router } from "express";
import { getRecommendations } from "../controllers/ai.controller";
import { authenticateToken } from "../middleware/auth.middleware";

export const aiRouter = Router();

aiRouter.get("/recommendations", authenticateToken, getRecommendations);

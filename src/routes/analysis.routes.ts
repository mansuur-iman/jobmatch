import { Router } from "express";

import { authenticateToken } from "../middleware/auth.middleware";
import { analyzeJob } from "../controllers/analysis.controller";

export const analysisRouter = Router();

analysisRouter.post("/analyze", authenticateToken, analyzeJob);

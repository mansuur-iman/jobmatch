import { Router } from "express";
export const analysisRouter = Router();
import { authenticateToken } from "../middleware/auth.middleware";

analysisRouter.post("/", authenticateToken, analyzeJob);

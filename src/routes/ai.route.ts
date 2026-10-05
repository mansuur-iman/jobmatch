import { Router } from "express";
import { getUnindexedJobs } from "../controllers/ai.controller";

export const aiRouter = Router();

aiRouter.get("/ai/jobs", getUnindexedJobs);

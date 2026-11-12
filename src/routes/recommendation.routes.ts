import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";

const recommendationRouter = Router();
recommendationRouter.patch("/:recommendationId/status", authenticateToken);

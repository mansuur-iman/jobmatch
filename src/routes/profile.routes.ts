import { Router } from "express";
import {
  getProfile,
  createProfile,
  updateProfile,
  getRecommendations,
} from "../controllers/profile.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const profileRouter = Router();
profileRouter.get("/recommendations", authenticateToken, getRecommendations);
profileRouter.get("/:id", authenticateToken, getProfile);
profileRouter.post("/:id", authenticateToken, createProfile);
profileRouter.patch("/:id", authenticateToken, updateProfile);

export default profileRouter;

import { Router } from "express";
import {
  getProfile,
  createProfile,
  updateProfile,
} from "../controllers/profile.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const profileRouter = Router();

profileRouter.get("/:id", authenticateToken, getProfile);
profileRouter.post("/:id", authenticateToken, createProfile);
profileRouter.patch("/:id", authenticateToken, updateProfile);

export default profileRouter;

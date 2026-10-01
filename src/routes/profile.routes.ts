import { Router } from "express";
import {
  getProfile,
  createProfile,
  updateProfile,
} from "../controllers/profile.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const profileRouter = Router();

profileRouter.get("/profile:id", authenticateToken, getProfile);
profileRouter.post("/profile:id", authenticateToken, createProfile);
profileRouter.patch("/profile:id", authenticateToken, updateProfile);

export default profileRouter;

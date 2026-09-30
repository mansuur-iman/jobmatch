import { Router } from "express";
const authRouter = Router();
import { login, register } from "../controllers/auth.controller";

authRouter.post("/register", register);
authRouter.post("/login", login);

export default authRouter;

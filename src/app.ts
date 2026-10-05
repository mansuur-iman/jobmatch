import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import authRouter from "./routes/auth.routes";
import profileRouter from "./routes/profile.routes";
import { analysisRouter } from "./routes/analysis.routes";

const app = express();

//middleware//
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/profile", profileRouter);
app.use("/api/v1/job", analysisRouter);

//error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Universal error:", err);
  res.status(500).json({ error: err });
});

export { app };

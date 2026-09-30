import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT secret not defined.");
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Access token missing.",
    });
  }

  try {
    const decoded = jwt.verify(token, secret);

    req.user = decoded as { userId: string };

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired access token.",
    });
  }
}

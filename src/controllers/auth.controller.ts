import bcrypt from "bcrypt";
import type { Request, Response, NextFunction } from "express";
import { db } from "../prisma/db";
import { registerSchema, loginSchema } from "../validators/auth.validator";
import jwt from "jsonwebtoken";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ error: result.error?.flatten().fieldErrors });
  }

  const { username, email, password } = result.data;
  try {
    //checking if user already exists//
    const existingUser = await db.orm.public.User.where({ email }).first();

    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    //hashing the user password//
    const hashedPassword = await bcrypt.hash(password, 10);

    //creating user in the database//
    const newUser = await db.orm.public.User.create({
      username,
      email,
      password: hashedPassword,
    });

    //giving response to the client//
    return res.status(201).json({
      message: "New user successfully created.",
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
      },
    });
  } catch (err) {
    console.error("error ocuured:", err);
    next(err);
  }
}

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten().fieldErrors });
  }

  const { email, password } = result.data;
  try {
    //get user password from db//
    const user = await db.orm.public.User.where({ email }).first();

    if (!user) {
      return res.status(400).json({ error: "User not exist." });
    }

    //compare pasword//
    const match = await bcrypt.compare(password, user?.password);

    if (!match) {
      return res.status(403).json({ error: "wrong user credentials." });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) throw new Error("JWT_SECRET is undefined.");

    //generate user token//
    const token = jwt.sign({ userId: user?.id }, secret, {
      expiresIn: "1h",
    });

    //give feedback to client//

    return res.status(200).json({
      message: "successfully logged in",
      user: { id: user?.id, email: user?.email, username: user?.username },
      token,
    });
  } catch (err) {
    console.log("Error in login", err);
    next(err);
  }
};

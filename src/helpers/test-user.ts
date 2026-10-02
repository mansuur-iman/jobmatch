import { app } from "../app";
import request from "supertest";
import type { RegisterInput } from ".././validators/auth.validator";

export const createAuthenticatedUser = async (userData: RegisterInput) => {
  //register user//
  const registerUser = await request(app)
    .post("/api/v1/auth/register")
    .send(userData);

  if (registerUser.statusCode !== 201) {
    throw new Error(
      `user registration failed: ${registerUser.statusCode}
    ${JSON.stringify(registerUser.body)}`,
    );
  }
  //grap login data//
  const { email, password } = userData;
  //login user//
  const loginUser = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password });

  if (loginUser.statusCode !== 200) {
    throw new Error(`user login failed: ${loginUser.statusCode}
         ${JSON.stringify(loginUser.body)}`);
  }
  //grap userId and token//
  const token = loginUser?.body?.token;
  const userId = loginUser?.body?.user?.id;

  if (!token || !userId) {
    throw new Error("token and userId not vailable.");
  }

  return {
    userId,
    token,
  };
};

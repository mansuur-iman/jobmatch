import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Inavlid email.").toLowerCase().trim(),
  username: z
    .string()
    .min(3, "Username MUST be atleast 3 characters long.")
    .trim(),
  password: z
    .string()
    .min(8, "Password MUSTbe atleast 8 characters long.")
    .max(12, "Password Must be between 8-12 characters.")
    .regex(/[A-Z]/, "Password MUST contain at least one uppercase letter")
    .regex(/[0-9]/, "Password MUST contain atleast one number."),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("inavlid email.").trim().toLowerCase(),
  password: z.string().min(8),
});

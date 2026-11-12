import { z } from "zod";

export const jobSchema = z.object({
  job: z.string().trim().min(50),
});

export const recommendationStatusSchema = z.object({
  status: z.enum(["applied", "dismissed"]),
});

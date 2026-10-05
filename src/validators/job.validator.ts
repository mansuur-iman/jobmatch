import { z } from "zod";

export const jobSchema = z.object({
  job: z.string().trim().min(50),
});

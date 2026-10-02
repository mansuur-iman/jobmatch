import { z } from "zod";

export const profileSchema = z.object({
  skills: z.array(
    z
      .string()
      .min(2, "Minimum skills length is 2 .")
      .max(20, "Maximum skills length is 20."),
  ),
  university: z.string(),
  degree: z.string(),
  experience: z.json().optional(),
  projects: z.json(),
  workEnvironment: z.string(),
  languages: z.array(
    z
      .string()
      .min(1, "Minimum language length is 1.")
      .max(7, "Maximum language length is 7."),
  ),
  workLocation: z.string(),
  jobLevel: z.string(),
  availability: z.string(),
  roles: z.array(z.string()),
  certifications: z.array(z.string()),
});

export type profileInput = z.infer<typeof profileSchema>;

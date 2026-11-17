import { z } from "zod";

// Keep these in sync with the dropdowns in client/src/pages/ProfileForm.tsx
export const JOB_LEVELS = [
  "Intern",
  "Entry level",
  "Junior",
  "Mid level",
  "Senior",
  "Lead",
] as const;
export const WORK_ENVIRONMENTS = ["Remote", "Hybrid", "On-site"] as const;
export const AVAILABILITY = [
  "Immediately",
  "Within 2 weeks",
  "Within 1 month",
  "Within 3 months",
] as const;

// A short tag-style item, e.g. a skill or a language
const tag = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `Each ${label} must be at least ${min} characters.`)
    .max(max, `Each ${label} can be at most ${max} characters.`);

const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required.")
    .max(100, "Project name is too long (max 100)."),
  description: z
    .string()
    .trim()
    .max(1000, "Project description is too long (max 1000)."),
  link: z
    .string()
    .trim()
    .max(300, "Project link is too long (max 300).")
    .regex(
      /^$|^https?:\/\/\S+$/,
      "Project link must start with http:// or https://",
    ),
});

const experienceSchema = z.object({
  company: z.string().trim().max(100, "Company name is too long (max 100)."),
  title: z.string().trim().max(100, "Job title is too long (max 100)."),
  duration: z.string().trim().max(50, "Duration is too long (max 50)."),
  description: z
    .string()
    .trim()
    .max(1000, "Experience description is too long (max 1000)."),
});

export const profileSchema = z.object({
  // Education
  university: z
    .string()
    .trim()
    .min(2, "University is required.")
    .max(100, "University name is too long (max 100)."),
  degree: z
    .string()
    .trim()
    .min(2, "Degree is required.")
    .max(100, "Degree is too long (max 100)."),

  // Skills & credentials
  skills: z
    .array(tag("skill", 2, 30))
    .min(1, "Add at least one skill.")
    .max(30, "You can add at most 30 skills."),
  certifications: z
    .array(tag("certification", 2, 100))
    .max(20, "You can add at most 20 certifications."),
  languages: z
    .array(tag("language", 2, 30))
    .max(10, "You can add at most 10 languages."),

  // Projects & experience (stored as Json)
  projects: z.array(projectSchema).max(20, "You can add at most 20 projects."),
  experience: z
    .array(experienceSchema)
    .max(20, "You can add at most 20 experience entries.")
    .optional(),

  // Preferences
  roles: z
    .array(tag("role", 2, 50))
    .min(1, "Add at least one target role.")
    .max(10, "You can add at most 10 target roles."),
  jobLevel: z.enum(JOB_LEVELS, {
    message: `Job level must be one of: ${JOB_LEVELS.join(", ")}.`,
  }),
  workEnvironment: z.enum(WORK_ENVIRONMENTS, {
    message: `Work environment must be one of: ${WORK_ENVIRONMENTS.join(", ")}.`,
  }),
  workLocation: z
    .string()
    .trim()
    .min(2, "Work location is required.")
    .max(100, "Work location is too long (max 100)."),
  availability: z.enum(AVAILABILITY, {
    message: `Availability must be one of: ${AVAILABILITY.join(", ")}.`,
  }),
});

// For PATCH: every field optional, but any field you do send is still validated.
export const updateProfileSchema = profileSchema.partial();

export type profileInput = z.infer<typeof profileSchema>;
export type updateProfileInput = z.infer<typeof updateProfileSchema>;

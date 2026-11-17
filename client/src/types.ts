// Shared types. The backend controllers weren't shared, so these shapes are
// assumptions based on the DB schema. Adjust here (and in src/api/*) if they differ.

export type MatchStatus = "PENDING" | "APPLIED" | "DISMISSED";

export interface AuthUser {
  id: string;
  email?: string;
}

export interface Project {
  name: string;
  description: string;
  link: string;
}

export interface WorkExperience {
  company: string;
  title: string;
  duration: string;
  description: string;
}

export interface Profile {
  skills: string[];
  university: string;
  degree: string;
  certifications: string[];
  projects: Project[];
  experience: WorkExperience[];
  roles: string[];
  languages: string[];
  jobLevel: string;
  workEnvironment: string;
  workLocation: string;
  availability: string;
}

export interface Job {
  id?: string;
  title: string;
  company: string;
  description: string;
}

export interface Recommendation {
  id: string; // the id used in PATCH /recommendation/:recommendationId/status
  status: MatchStatus;
  score: number | null; // 0..1 similarity, if the backend returns one
  job: Job;
}

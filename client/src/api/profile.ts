import { api, isNotFound } from "./client";
import type { Profile } from "../types";

const str = (v: unknown): string => (v == null ? "" : String(v));
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String) : [];

function normalize(raw: any): Profile {
  const p = raw?.profile ?? raw ?? {};
  return {
    skills: strArr(p.skills),
    university: str(p.university),
    degree: str(p.degree),
    certifications: strArr(p.certifications),
    projects: Array.isArray(p.projects)
      ? p.projects.map((x: any) => ({
          name: str(x?.name),
          description: str(x?.description),
          link: str(x?.link),
        }))
      : [],
    experience: Array.isArray(p.experience)
      ? p.experience.map((x: any) => ({
          company: str(x?.company),
          title: str(x?.title),
          duration: str(x?.duration),
          description: str(x?.description),
        }))
      : [],
    roles: strArr(p.roles),
    languages: strArr(p.languages),
    jobLevel: str(p.jobLevel),
    workEnvironment: str(p.workEnvironment),
    workLocation: str(p.workLocation),
    availability: str(p.availability),
  };
}

/** Returns null when the user has no profile yet (404). */
export async function getProfile(id: string): Promise<Profile | null> {
  try {
    return normalize(await api.get(`/profile/${id}`));
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function createProfile(
  id: string,
  profile: Profile,
): Promise<Profile> {
  return normalize(await api.post(`/profile/${id}`, profile));
}

export async function updateProfile(
  id: string,
  profile: Profile,
): Promise<Profile> {
  return normalize(await api.patch(`/profile/${id}`, profile));
}

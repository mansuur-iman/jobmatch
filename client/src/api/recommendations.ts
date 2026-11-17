import { api } from "./client";
import type { MatchStatus, Recommendation } from "../types";

// Tolerant of a few plausible response shapes: a bare array, or { recommendations: [...] },
// with the job nested under `job` or flattened onto the match.
function normalize(raw: any): Recommendation {
  const job = raw.job ?? raw;
  const score = raw.score ?? raw.similarity ?? raw.matchScore ?? null;
  return {
    id: String(raw.id ?? raw.recommendationId ?? raw.matchId),
    status: (raw.status ?? "PENDING") as MatchStatus,
    score: typeof score === "number" ? score : null,
    job: {
      id: job.id != null ? String(job.id) : undefined,
      title: job.title ?? "Untitled role",
      company: job.company ?? "Unknown company",
      description: job.description ?? "",
    },
  };
}

export async function getRecommendations(): Promise<Recommendation[]> {
  const data = await api.get("/profile/recommendations");
  const list = Array.isArray(data) ? data : (data?.recommendations ?? data?.matches ?? []);
  return list.map(normalize);
}

export async function updateRecommendationStatus(
  recommendationId: string,
  status: MatchStatus,
): Promise<void> {
  await api.patch(`/recommendation/${recommendationId}/status`, { status });
}

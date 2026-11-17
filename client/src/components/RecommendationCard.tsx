import { useState } from "react";
import type { MatchStatus, Recommendation } from "../types";

interface Props {
  rec: Recommendation;
  busy: boolean;
  onStatus: (id: string, status: MatchStatus) => void;
}

export function RecommendationCard({ rec, busy, onStatus }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { job } = rec;
  const long = job.description.length > 280;
  const text = expanded || !long ? job.description : job.description.slice(0, 280).trimEnd() + "…";
  const pct = rec.score == null ? null : Math.round((rec.score <= 1 ? rec.score * 100 : rec.score));

  return (
    <article className="card rec-card">
      <div className="rec-head">
        <div>
          <h3>{job.title}</h3>
          <p className="muted">{job.company}</p>
        </div>
        {pct !== null && <span className="score">{pct}% match</span>}
      </div>

      <p className="rec-desc">{text}</p>
      {long && (
        <button className="link-btn" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : "Show more"}
        </button>
      )}

      <div className="rec-actions">
        {rec.status === "PENDING" && (
          <>
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => onStatus(rec.id, "APPLIED")}
            >
              Mark as applied
            </button>
            <button
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => onStatus(rec.id, "DISMISSED")}
            >
              Dismiss
            </button>
          </>
        )}
        {rec.status !== "PENDING" && (
          <button
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => onStatus(rec.id, "PENDING")}
          >
            {rec.status === "APPLIED" ? "Undo applied" : "Restore"}
          </button>
        )}
      </div>
    </article>
  );
}

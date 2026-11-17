import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getRecommendations, updateRecommendationStatus } from "../api/recommendations";
import { errorMessage, isNotFound } from "../api/client";
import { RecommendationCard } from "../components/RecommendationCard";
import type { MatchStatus, Recommendation } from "../types";

const TABS: { key: MatchStatus; label: string; empty: string }[] = [
  { key: "PENDING", label: "New", empty: "No new recommendations right now. Check back after the next daily refresh." },
  { key: "APPLIED", label: "Applied", empty: "You haven't marked any jobs as applied yet." },
  { key: "DISMISSED", label: "Dismissed", empty: "Nothing dismissed." },
];

export function Recommendations() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [tab, setTab] = useState<MatchStatus>("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecs(await getRecommendations());
      setNeedsProfile(false);
    } catch (err) {
      if (isNotFound(err)) setNeedsProfile(true);
      else setError(errorMessage(err, "Couldn't load recommendations"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onStatus(id: string, status: MatchStatus) {
    const previous = recs;
    setBusyId(id);
    setError(null);
    // Optimistic update; roll back on failure.
    setRecs((list) => list.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await updateRecommendationStatus(id, status);
    } catch (err) {
      setRecs(previous);
      setError(errorMessage(err, "Couldn't update that job"));
    } finally {
      setBusyId(null);
    }
  }

  const counts = useMemo(() => {
    const c: Record<MatchStatus, number> = { PENDING: 0, APPLIED: 0, DISMISSED: 0 };
    recs.forEach((r) => c[r.status]++);
    return c;
  }, [recs]);

  const visible = useMemo(
    () =>
      recs
        .filter((r) => r.status === tab)
        .sort((a, b) => (b.score ?? -1) - (a.score ?? -1)),
    [recs, tab],
  );

  const current = TABS.find((t) => t.key === tab)!;

  return (
    <div className="container page">
      <div className="page-head">
        <h2>Recommendations</h2>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={tab === t.key ? "tab active" : "tab"}
            onClick={() => setTab(t.key)}
          >
            {t.label} <span className="count">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {needsProfile ? (
        <div className="card empty">
          <p>Create your profile first so we can match you with jobs.</p>
          <Link to="/profile" className="btn btn-primary">
            Create profile
          </Link>
        </div>
      ) : loading ? (
        <p className="muted">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="card empty">
          <p className="muted">{current.empty}</p>
        </div>
      ) : (
        <div className="rec-list">
          {visible.map((r) => (
            <RecommendationCard key={r.id} rec={r} busy={busyId === r.id} onStatus={onStatus} />
          ))}
        </div>
      )}
    </div>
  );
}

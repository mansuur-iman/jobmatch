import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createProfile, getProfile, updateProfile } from "../api/profile";
import { errorMessage } from "../api/client";
import { TagInput } from "../components/TagInput";
import type { Profile, Project, WorkExperience } from "../types";

// Option values are my guess. If your backend validates these, change them to match.
const JOB_LEVELS = [
  "Intern",
  "Entry level",
  "Junior",
  "Mid level",
  "Senior",
  "Lead",
];
const WORK_ENVIRONMENTS = ["Remote", "Hybrid", "On-site"];
const AVAILABILITY = [
  "Immediately",
  "Within 2 weeks",
  "Within 1 month",
  "Within 3 months",
];

const EMPTY: Profile = {
  skills: [],
  university: "",
  degree: "",
  certifications: [],
  projects: [],
  experience: [],
  roles: [],
  languages: [],
  jobLevel: "",
  workEnvironment: "",
  workLocation: "",
  availability: "",
};

const emptyProject = (): Project => ({ name: "", description: "", link: "" });
const emptyJob = (): WorkExperience => ({
  company: "",
  title: "",
  duration: "",
  description: "",
});

function Select(props: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  // Keep a previously saved value selectable even if it isn't in our list.
  const options =
    props.value && !props.options.includes(props.value)
      ? [props.value, ...props.options]
      : props.options;
  return (
    <label>
      {props.label}
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      >
        <option value="" disabled>
          Select…
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ProfileForm() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<Profile>(EMPTY);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getProfile(user.id)
      .then((p) => {
        if (cancelled) return;
        if (p) {
          setForm(p);
          setExists(true);
        }
      })
      .catch(
        (err) =>
          !cancelled &&
          setError(errorMessage(err, "Couldn't load your profile")),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user]);

  function updateProject(i: number, patch: Partial<Project>) {
    set(
      "projects",
      form.projects.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    );
  }

  function updateJob(i: number, patch: Partial<WorkExperience>) {
    set(
      "experience",
      form.experience.map((x, idx) => (idx === i ? { ...x, ...patch } : x)),
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSaved(false);

    if (form.skills.length === 0) return setError("Add at least one skill.");
    if (!form.university.trim() || !form.degree.trim())
      return setError("University and degree are required.");
    if (form.roles.length === 0)
      return setError("Add at least one target role.");
    if (
      !form.jobLevel ||
      !form.workEnvironment ||
      !form.availability ||
      !form.workLocation.trim()
    )
      return setError(
        "Please fill in job level, work environment, work location and availability.",
      );

    // Drop empty rows and trim strings before sending.
    const payload: Profile = {
      ...form,
      university: form.university.trim(),
      degree: form.degree.trim(),
      workLocation: form.workLocation.trim(),
      projects: form.projects
        .filter((p) => p.name.trim())
        .map((p) => ({
          name: p.name.trim(),
          description: p.description.trim(),
          link: p.link.trim(),
        })),
      experience: form.experience
        .filter((x) => x.company.trim() || x.title.trim())
        .map((x) => ({
          company: x.company.trim(),
          title: x.title.trim(),
          duration: x.duration.trim(),
          description: x.description.trim(),
        })),
    };

    setSaving(true);
    try {
      if (exists) {
        await updateProfile(user.id, payload);
        setSaved(true);
      } else {
        await createProfile(user.id, payload);
        navigate("/recommendations", { replace: true });
      }
    } catch (err) {
      setError(errorMessage(err, "Couldn't save your profile"));
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="container page">
        <p className="muted">Loading profile…</p>
      </div>
    );

  return (
    <div className="container page profile-page">
      <h2>{exists ? "Your profile" : "Create your profile"}</h2>
      <p className="muted">
        {exists
          ? "Updating your profile refreshes the jobs we match you with."
          : "We use this to match you with relevant jobs."}
      </p>

      <form className="card form" onSubmit={onSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        {saved && <div className="alert alert-success">Profile saved.</div>}

        <h3 className="form-section first">Education</h3>
        <div className="form-grid">
          <label>
            University
            <input
              value={form.university}
              onChange={(e) => set("university", e.target.value)}
            />
          </label>
          <label>
            Degree
            <input
              value={form.degree}
              onChange={(e) => set("degree", e.target.value)}
              placeholder="e.g. BSc Computer Science"
            />
          </label>
        </div>

        <h3 className="form-section">Skills &amp; credentials</h3>
        <label>
          Skills
          <TagInput
            value={form.skills}
            onChange={(v) => set("skills", v)}
            placeholder="e.g. React, PostgreSQL — press Enter to add"
          />
        </label>
        <label>
          Certifications
          <TagInput
            value={form.certifications}
            onChange={(v) => set("certifications", v)}
            placeholder="Optional — press Enter to add"
          />
        </label>
        <label>
          Languages
          <TagInput
            value={form.languages}
            onChange={(v) => set("languages", v)}
            placeholder="e.g. English, Swahili, German"
          />
        </label>

        <h3 className="form-section">Projects</h3>
        {form.projects.map((p, i) => (
          <div key={i} className="repeat-item">
            <div className="repeat-head">
              <span>Project {i + 1}</span>
              <button
                type="button"
                className="link-btn"
                onClick={() =>
                  set(
                    "projects",
                    form.projects.filter((_, idx) => idx !== i),
                  )
                }
              >
                Remove
              </button>
            </div>
            <label>
              Name
              <input
                value={p.name}
                onChange={(e) => updateProject(i, { name: e.target.value })}
              />
            </label>
            <label>
              Description
              <textarea
                rows={3}
                value={p.description}
                onChange={(e) =>
                  updateProject(i, { description: e.target.value })
                }
              />
            </label>
            <label>
              Link (optional)
              <input
                value={p.link}
                onChange={(e) => updateProject(i, { link: e.target.value })}
              />
            </label>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => set("projects", [...form.projects, emptyProject()])}
        >
          + Add project
        </button>

        <h3 className="form-section">Work experience (optional)</h3>
        {form.experience.map((x, i) => (
          <div key={i} className="repeat-item">
            <div className="repeat-head">
              <span>Role {i + 1}</span>
              <button
                type="button"
                className="link-btn"
                onClick={() =>
                  set(
                    "experience",
                    form.experience.filter((_, idx) => idx !== i),
                  )
                }
              >
                Remove
              </button>
            </div>
            <div className="form-grid">
              <label>
                Company
                <input
                  value={x.company}
                  onChange={(e) => updateJob(i, { company: e.target.value })}
                />
              </label>
              <label>
                Title
                <input
                  value={x.title}
                  onChange={(e) => updateJob(i, { title: e.target.value })}
                />
              </label>
            </div>
            <label>
              Duration
              <input
                value={x.duration}
                onChange={(e) => updateJob(i, { duration: e.target.value })}
                placeholder="e.g. Jun 2025 – Present"
              />
            </label>
            <label>
              Description
              <textarea
                rows={3}
                value={x.description}
                onChange={(e) => updateJob(i, { description: e.target.value })}
              />
            </label>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => set("experience", [...form.experience, emptyJob()])}
        >
          + Add experience
        </button>

        <h3 className="form-section">What you're looking for</h3>
        <label>
          Target roles
          <TagInput
            value={form.roles}
            onChange={(v) => set("roles", v)}
            placeholder="e.g. Backend Engineer, Full-stack Developer"
          />
        </label>
        <div className="form-grid">
          <Select
            label="Job level"
            value={form.jobLevel}
            options={JOB_LEVELS}
            onChange={(v) => set("jobLevel", v)}
          />
          <Select
            label="Work environment"
            value={form.workEnvironment}
            options={WORK_ENVIRONMENTS}
            onChange={(v) => set("workEnvironment", v)}
          />
          <label>
            Work location
            <input
              value={form.workLocation}
              onChange={(e) => set("workLocation", e.target.value)}
              placeholder="e.g. Nairobi, Kenya"
            />
          </label>
          <Select
            label="Availability"
            value={form.availability}
            options={AVAILABILITY}
            onChange={(v) => set("availability", v)}
          />
        </div>

        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : exists ? "Save changes" : "Create profile"}
        </button>
      </form>
    </div>
  );
}

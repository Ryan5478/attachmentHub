import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Search, MapPin, Clock, Calendar, Building2, Users, Award,
  Loader2, Mail, Sparkles, GraduationCap, Upload, X, Copy, Check,
  FileText, DollarSign, Briefcase,
} from "lucide-react";
import api from "../api/client";

type Attachment = {
  id: number;
  title: string;
  description: string;
  company_id: number;
  company_name: string | null;
  company_location: string | null;
  location: string | null;
  duration_weeks: number | null;
  start_date: string | null;
  deadline: string | null;
  required_course: string | null;
  required_skills: string[];
  stipend: string | null;
  positions_available: number;
  credit_offered: boolean;
  status: string;
  posted_at: string | null;
};

type Profile = {
  id: number;
  full_name: string;
  email: string;
  university: string | null;
  course: string | null;
  year_of_study: number | null;
  skills: string[];
  resume_text?: string;
} | null;

/* -------------------- Profile Setup -------------------- */

function ProfileSetup({ onCreated }: { onCreated: (p: any) => void }) {
  const [form, setForm] = useState({
    full_name: "",
    university: "",
    course: "",
    year_of_study: 3,
    phone: "",
    preferred_location: "",
    preferred_duration_weeks: 12,
    summary: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Please upload your resume (PDF, DOCX, or TXT)");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      fd.append("resume", file);
      const { data } = await api.post("/students/upload-resume", fd);
      toast.success("Profile created");
      onCreated(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <span className="chip">
          <GraduationCap size={11} />
          First time here
        </span>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
          Set up your <span className="neon-text">student profile</span>
        </h1>
        <p className="mt-3 text-slate-400">
          Upload your resume and fill in your academic details. We'll use it to
          match you with the right attachments.
        </p>
      </div>

      <form onSubmit={submit} className="rounded-2xl glass-strong p-6 glow-border space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
              Full name *
            </label>
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
              placeholder="Alice Mwangi"
              className="input-dark"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
              Phone
            </label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+254 712 345 678"
              className="input-dark"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
              University
            </label>
            <input
              value={form.university}
              onChange={(e) => setForm({ ...form, university: e.target.value })}
              placeholder="University of Nairobi"
              className="input-dark"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
              Course
            </label>
            <input
              value={form.course}
              onChange={(e) => setForm({ ...form, course: e.target.value })}
              placeholder="BSc Computer Science"
              className="input-dark"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
              Year of study
            </label>
            <select
              value={form.year_of_study}
              onChange={(e) => setForm({ ...form, year_of_study: Number(e.target.value) })}
              className="input-dark"
            >
              {[1, 2, 3, 4, 5, 6].map((y) => (
                <option key={y} value={y}>Year {y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
              Preferred location
            </label>
            <input
              value={form.preferred_location}
              onChange={(e) => setForm({ ...form, preferred_location: e.target.value })}
              placeholder="Nairobi"
              className="input-dark"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
            Short summary
          </label>
          <textarea
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            placeholder="Third-year CS student passionate about backend systems..."
            rows={3}
            className="input-dark text-sm"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
            Resume (PDF, DOCX, or TXT) *
          </label>
          <label className="flex items-center gap-3 rounded-xl border-2 border-dashed border-white/15 hover:border-neon-cyan/50 transition p-5 cursor-pointer">
            <Upload size={20} className="text-neon-cyan shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">
                {file ? file.name : "Click to upload your resume"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                PDF · DOCX · TXT
              </p>
            </div>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? (
            <><Loader2 size={16} className="animate-spin" /> Creating profile…</>
          ) : (
            <><Sparkles size={16} /> Create profile and start browsing</>
          )}
        </button>
      </form>
    </div>
  );
}

/* -------------------- Apply Modal -------------------- */

function ApplyModal({
  attachment,
  profile,
  onClose,
  onApplied,
}: {
  attachment: Attachment;
  profile: Profile;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [coverLetter, setCoverLetter] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function generate() {
    if (!profile?.resume_text) {
      toast.error("Profile resume not available. Re-upload via the profile page.");
      return;
    }
    setGenerating(true);
    try {
      const { data } = await api.post("/ai/cover-letter", {
        job_title: attachment.title,
        company: attachment.company_name ?? "",
        job_description: attachment.description,
        resume_text: profile.resume_text,
      });
      setCoverLetter(data.body);
      toast.success("Cover letter generated");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    try {
      await api.post(`/attachments/${attachment.id}/apply`, {
        cover_letter: coverLetter || null,
      });
      toast.success("Application submitted");
      onApplied();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Could not apply");
    } finally {
      setSubmitting(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(coverLetter);
    toast.success("Copied");
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl glass-strong glow-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-6 border-b border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase size={16} className="text-neon-cyan" />
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                Apply to attachment
              </span>
            </div>
            <h2 className="text-xl font-bold text-white truncate">{attachment.title}</h2>
            <p className="text-sm text-slate-400">
              {attachment.company_name} · {attachment.location ?? "Location not specified"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">
                Cover letter (optional but recommended)
              </label>
              <button
                onClick={generate}
                disabled={generating}
                className="inline-flex items-center gap-1.5 text-xs text-neon-cyan hover:text-white border border-neon-cyan/30 hover:border-neon-cyan/60 rounded-full px-3 py-1.5 transition"
              >
                {generating ? (
                  <><Loader2 size={11} className="animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles size={11} /> Generate with AI</>
                )}
              </button>
            </div>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Write a short note to the company about why you're a great fit… or click 'Generate with AI' to draft one from your resume."
              rows={12}
              className="input-dark font-mono text-sm leading-relaxed"
            />
            {coverLetter && (
              <button
                onClick={copy}
                className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-neon-cyan transition"
              >
                <Copy size={11} /> Copy
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button onClick={onClose} className="btn-ghost !py-2 !px-4 !text-sm">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="btn-primary !py-2 !px-5 !text-sm"
          >
            {submitting ? (
              <><Loader2 size={14} className="animate-spin" /> Submitting…</>
            ) : (
              <><Check size={14} /> Submit application</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Main Dashboard -------------------- */

export default function StudentDashboard() {
  const [profile, setProfile] = useState<Profile>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [appliedIds, setAppliedIds] = useState<Set<number>>(new Set());

  const [applyTarget, setApplyTarget] = useState<Attachment | null>(null);

  async function loadProfile() {
    setLoadingProfile(true);
    try {
      const { data } = await api.get("/students/me");
      setProfile(data);
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        toast.error("Could not load profile");
      }
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }

  async function loadAttachments() {
    setLoadingList(true);
    try {
      const params: any = {};
      if (query) params.q = query;
      if (location) params.location = location;
      const { data } = await api.get("/attachments", { params });
      setAttachments(data);
    } catch (err: any) {
      toast.error("Could not load attachments");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadApplications() {
    try {
      const { data } = await api.get("/students/me/applications");
      setAppliedIds(new Set(data.map((a: any) => a.attachment_id)));
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      loadAttachments();
      loadApplications();
    }
  }, [profile]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    loadAttachments();
  }

  if (loadingProfile) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-white/5 rounded" />
          <div className="h-4 w-96 bg-white/5 rounded" />
          <div className="grid md:grid-cols-2 gap-4 mt-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-52 bg-white/5 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="px-6 py-12">
        <ProfileSetup onCreated={setProfile} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="animate-fade-in-up">
        <span className="chip">
          <GraduationCap size={11} />
          {profile.university ?? "Student"} · {profile.course ?? "—"}
        </span>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
          Attachment <span className="neon-text">opportunities</span>
        </h1>
        <p className="mt-3 text-slate-400 max-w-2xl">
          Browse open industrial attachments posted directly by companies.
          Apply in seconds — generate a tailored cover letter with AI.
        </p>
      </div>

      {/* Search bar */}
      <form
        onSubmit={onSearch}
        className="mt-8 rounded-2xl glass p-3 flex flex-col md:flex-row gap-2"
      >
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search attachments (e.g. software engineering, data analytics)"
            className="input-dark !pl-9"
          />
        </div>
        <div className="md:w-56 relative">
          <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="input-dark !pl-9"
          />
        </div>
        <button type="submit" disabled={loadingList} className="btn-primary md:w-auto">
          {loadingList ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Search
        </button>
      </form>

      {/* Results count */}
      <div className="mt-4 text-xs text-slate-500">
        {loadingList ? "Loading…" : `${attachments.length} open attachment${attachments.length === 1 ? "" : "s"}`}
      </div>

      {/* Attachment grid */}
      {attachments.length === 0 && !loadingList && (
        <div className="mt-10 rounded-2xl glass p-12 text-center">
          <Briefcase size={32} className="mx-auto text-slate-500 mb-4" />
          <p className="text-slate-300 font-medium">No open attachments match your search.</p>
          <p className="text-xs text-slate-500 mt-2">
            Try a broader query or clear the location filter.
          </p>
        </div>
      )}

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {attachments.map((att, i) => {
          const applied = appliedIds.has(att.id);
          return (
            <div
              key={att.id}
              className="rounded-2xl glass p-6 hover:border-neon-indigo/40 transition-all duration-300 animate-fade-in-up flex flex-col"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white text-lg leading-tight">
                    {att.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-400">
                    {att.company_name && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 size={11} /> {att.company_name}
                      </span>
                    )}
                    {att.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={11} /> {att.location}
                      </span>
                    )}
                  </div>
                </div>
                {att.credit_offered && (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider rounded-full px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                    <Award size={10} /> Credit
                  </span>
                )}
              </div>

              <p className="mt-3 text-sm text-slate-300 leading-relaxed line-clamp-3">
                {att.description}
              </p>

              {/* Meta row */}
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                {att.duration_weeks && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock size={12} className="text-neon-cyan shrink-0" />
                    <span>{att.duration_weeks} weeks</span>
                  </div>
                )}
                {att.deadline && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar size={12} className="text-amber-400 shrink-0" />
                    <span>Apply by {att.deadline}</span>
                  </div>
                )}
                {att.positions_available > 0 && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Users size={12} className="text-neon-purple shrink-0" />
                    <span>{att.positions_available} position{att.positions_available === 1 ? "" : "s"}</span>
                  </div>
                )}
                {att.stipend && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <DollarSign size={12} className="text-emerald-400 shrink-0" />
                    <span>{att.stipend}</span>
                  </div>
                )}
              </div>

              {/* Required skills */}
              {att.required_skills?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {att.required_skills.map((s, idx) => (
                    <span key={idx} className="chip">{s}</span>
                  ))}
                </div>
              )}

              {/* Required course */}
              {att.required_course && (
                <p className="mt-3 text-xs text-slate-500">
                  <span className="text-slate-400">Open to:</span> {att.required_course}
                </p>
              )}

              {/* Apply button */}
              <div className="mt-5 pt-4 border-t border-white/5">
                {applied ? (
                  <div className="inline-flex items-center gap-2 text-sm text-emerald-300 font-medium">
                    <Check size={14} /> Already applied
                  </div>
                ) : (
                  <button
                    onClick={() => setApplyTarget(att)}
                    className="btn-primary w-full !py-2.5"
                  >
                    <FileText size={14} /> Apply now
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Apply modal */}
      {applyTarget && (
        <ApplyModal
          attachment={applyTarget}
          profile={profile}
          onClose={() => setApplyTarget(null)}
          onApplied={() => {
            loadApplications();
          }}
        />
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Building2, Briefcase, Users, CheckCircle2, Clock, Star, XCircle,
  Plus, Loader2, Trash2, Edit3, MapPin, Calendar, X, Mail, Phone,
  GraduationCap, FileText, Save, Search, Award, DollarSign, Eye,
} from "lucide-react";
import api from "../api/client";

/* ============================================================
   Types
============================================================ */
type Company = {
  id: number;
  name: string;
  industry: string | null;
  website: string | null;
  location: string | null;
  description: string | null;
  logo_url: string | null;
  verified: boolean;
} | null;

type Attachment = {
  id: number;
  title: string;
  description: string;
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

type Applicant = {
  application_id: number;
  status: "pending" | "shortlisted" | "accepted" | "rejected" | string;
  applied_at: string | null;
  student_id: number;
  full_name: string;
  email: string;
  phone: string | null;
  university: string | null;
  course: string | null;
  year_of_study: number | null;
  summary: string | null;
  skills: string[];
  cover_letter: string | null;
  company_notes: string | null;
};

/* ============================================================
   Status helpers
============================================================ */
const STATUS_META: Record<
  string,
  { label: string; icon: any; classes: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    classes: "bg-slate-500/10 border-slate-500/30 text-slate-300",
  },
  shortlisted: {
    label: "Shortlisted",
    icon: Star,
    classes: "bg-amber-500/10 border-amber-500/30 text-amber-300",
  },
  accepted: {
    label: "Accepted",
    icon: CheckCircle2,
    classes: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    classes: "bg-rose-500/10 border-rose-500/30 text-rose-300",
  },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium rounded-full px-2.5 py-1 border ${meta.classes}`}
    >
      <Icon size={10} />
      {meta.label}
    </span>
  );
}

/* ============================================================
   Company Profile Setup
============================================================ */
function CompanyProfileSetup({ onCreated }: { onCreated: (c: any) => void }) {
  const [form, setForm] = useState({
    name: "",
    industry: "",
    website: "",
    location: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post("/companies/me", form);
      toast.success("Company profile created");
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
          <Building2 size={11} />
          Company onboarding
        </span>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
          Set up your <span className="neon-text">company profile</span>
        </h1>
        <p className="mt-3 text-slate-400">
          This is what students see when they view your attachments.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="rounded-2xl glass-strong p-6 glow-border space-y-5"
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
              Company name *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Safaricom PLC"
              className="input-dark"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
              Industry
            </label>
            <input
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              placeholder="Telecommunications"
              className="input-dark"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
              Location
            </label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Nairobi, Kenya"
              className="input-dark"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
              Website
            </label>
            <input
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://example.com"
              className="input-dark"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
            About the company
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="A short description students will see."
            rows={4}
            className="input-dark text-sm"
          />
        </div>
        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Creating profile…
            </>
          ) : (
            <>
              <Save size={16} /> Save and continue
            </>
          )}
        </button>
      </form>
    </div>
  );
}

/* ============================================================
   Post Attachment Modal
============================================================ */
function PostAttachmentModal({
  onClose,
  onPosted,
}: {
  onClose: () => void;
  onPosted: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    duration_weeks: 12,
    start_date: "",
    deadline: "",
    required_course: "",
    required_skills: "",
    stipend: "",
    positions_available: 1,
    credit_offered: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        title: form.title,
        description: form.description,
        location: form.location || null,
        duration_weeks: Number(form.duration_weeks) || null,
        start_date: form.start_date || null,
        deadline: form.deadline || null,
        required_course: form.required_course || null,
        required_skills: form.required_skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        stipend: form.stipend || null,
        positions_available: Number(form.positions_available) || 1,
        credit_offered: form.credit_offered,
      };
      await api.post("/attachments", payload);
      toast.success("Attachment posted");
      onPosted();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Could not post attachment");
    } finally {
      setSaving(false);
    }
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
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-indigo to-neon-purple flex items-center justify-center">
              <Briefcase size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Post a new attachment</h2>
              <p className="text-xs text-slate-500">
                Visible to students immediately
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
              Title *
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="Software Engineering Attachment"
              className="input-dark"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
              Description *
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              rows={6}
              placeholder="What will the student work on? What will they learn?"
              className="input-dark text-sm font-mono leading-relaxed"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
                Location
              </label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Nairobi, Kenya"
                className="input-dark"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
                Duration (weeks)
              </label>
              <input
                type="number"
                value={form.duration_weeks}
                onChange={(e) =>
                  setForm({ ...form, duration_weeks: Number(e.target.value) })
                }
                min={1}
                max={104}
                className="input-dark"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
                Start date
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="input-dark"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
                Application deadline
              </label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="input-dark"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
                Required course
              </label>
              <input
                value={form.required_course}
                onChange={(e) =>
                  setForm({ ...form, required_course: e.target.value })
                }
                placeholder="Computer Science"
                className="input-dark"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
                Positions available
              </label>
              <input
                type="number"
                value={form.positions_available}
                onChange={(e) =>
                  setForm({ ...form, positions_available: Number(e.target.value) })
                }
                min={1}
                className="input-dark"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
              Required skills (comma-separated)
            </label>
            <input
              value={form.required_skills}
              onChange={(e) =>
                setForm({ ...form, required_skills: e.target.value })
              }
              placeholder="Python, React, Git, PostgreSQL"
              className="input-dark"
            />
            {form.required_skills && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.required_skills
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((s, i) => (
                    <span key={i} className="chip">
                      {s}
                    </span>
                  ))}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
                Stipend (optional)
              </label>
              <input
                value={form.stipend}
                onChange={(e) => setForm({ ...form, stipend: e.target.value })}
                placeholder="KES 30,000/month"
                className="input-dark"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer rounded-xl px-4 py-3 bg-white/[0.03] border border-white/10 hover:border-neon-cyan/40 transition w-full">
                <input
                  type="checkbox"
                  checked={form.credit_offered}
                  onChange={(e) =>
                    setForm({ ...form, credit_offered: e.target.checked })
                  }
                  className="h-4 w-4 accent-neon-cyan"
                />
                <span className="text-sm text-slate-300">
                  University credit offered
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost !py-2 !px-4 !text-sm"
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary !py-2 !px-5 !text-sm">
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Posting…
                </>
              ) : (
                <>
                  <Plus size={14} /> Post attachment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   Applicants Drawer (side panel)
============================================================ */
function ApplicantsPanel({
  attachment,
  onClose,
  onStatusChange,
}: {
  attachment: Attachment;
  onClose: () => void;
  onStatusChange: () => void;
}) {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<number, string>>({});

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(
        `/my-attachments/${attachment.id}/applicants`
      );
      setApplicants(data);
      const drafts: Record<number, string> = {};
      data.forEach((a: Applicant) => {
        drafts[a.application_id] = a.company_notes ?? "";
      });
      setNotesDraft(drafts);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Could not load applicants");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [attachment.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function updateStatus(appId: number, status: string) {
    setUpdating(appId);
    try {
      await api.patch(`/applications/${appId}/status`, {
        status,
        company_notes: notesDraft[appId] || null,
      });
      toast.success(`Marked as ${status}`);
      setApplicants((prev) =>
        prev.map((a) =>
          a.application_id === appId
            ? { ...a, status, company_notes: notesDraft[appId] ?? a.company_notes }
            : a
        )
      );
      onStatusChange();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Could not update status");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex justify-end animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl h-full bg-void-800/95 backdrop-blur-xl border-l border-white/10 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-neon-cyan" />
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                Applicants ({applicants.length})
              </span>
            </div>
            <h2 className="text-lg font-bold text-white truncate">
              {attachment.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && (
            <div className="animate-pulse space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-40 bg-white/5 rounded-2xl" />
              ))}
            </div>
          )}

          {!loading && applicants.length === 0 && (
            <div className="rounded-2xl glass p-10 text-center">
              <Users size={32} className="mx-auto text-slate-500 mb-4" />
              <p className="text-slate-300">No applications yet.</p>
              <p className="text-xs text-slate-500 mt-1">
                Students will appear here when they apply.
              </p>
            </div>
          )}

          {applicants.map((a) => (
            <div key={a.application_id} className="rounded-2xl glass p-5">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-white">{a.full_name}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                    {a.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail size={10} /> {a.email}
                      </span>
                    )}
                    {a.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone size={10} /> {a.phone}
                      </span>
                    )}
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </div>

              {/* Academic info */}
              {(a.university || a.course || a.year_of_study) && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-3">
                  {a.university && (
                    <span className="inline-flex items-center gap-1">
                      <GraduationCap size={11} /> {a.university}
                    </span>
                  )}
                  {a.course && <span>{a.course}</span>}
                  {a.year_of_study && <span>Year {a.year_of_study}</span>}
                </div>
              )}

              {/* Summary */}
              {a.summary && (
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                  {a.summary}
                </p>
              )}

              {/* Skills */}
              {a.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {a.skills.slice(0, 12).map((s, i) => (
                    <span key={i} className="chip">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* Cover letter */}
              {a.cover_letter && (
                <details className="mb-3 group">
                  <summary className="cursor-pointer text-xs text-neon-cyan hover:text-white inline-flex items-center gap-1.5">
                    <FileText size={11} /> View cover letter
                  </summary>
                  <div className="mt-2 rounded-xl bg-white/[0.02] border border-white/10 p-4">
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {a.cover_letter}
                    </p>
                  </div>
                </details>
              )}

              {/* Notes */}
              <div className="mb-3">
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                  Internal notes (saved with status change)
                </label>
                <textarea
                  value={notesDraft[a.application_id] ?? ""}
                  onChange={(e) =>
                    setNotesDraft({
                      ...notesDraft,
                      [a.application_id]: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="e.g. Strong Python background, invite for interview"
                  className="input-dark text-xs"
                />
              </div>

              {/* Status buttons */}
              <div className="flex flex-wrap gap-2">
                {(["shortlisted", "accepted", "rejected", "pending"] as const).map(
                  (s) => {
                    const meta = STATUS_META[s];
                    const Icon = meta.icon;
                    const isCurrent = a.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => updateStatus(a.application_id, s)}
                        disabled={updating === a.application_id || isCurrent}
                        className={`inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 border transition ${
                          isCurrent
                            ? meta.classes + " cursor-default"
                            : "border-white/10 text-slate-300 hover:text-white hover:border-white/30"
                        } disabled:opacity-50`}
                      >
                        {updating === a.application_id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Icon size={11} />
                        )}
                        {meta.label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Main Company Dashboard
============================================================ */
export default function CompanyDashboard() {
  const [company, setCompany] = useState<Company>(null);
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [applicantCounts, setApplicantCounts] = useState<Record<number, number>>(
    {}
  );
  const [postingOpen, setPostingOpen] = useState(false);
  const [viewingApplicants, setViewingApplicants] =
    useState<Attachment | null>(null);

  async function loadCompany() {
    try {
      const { data } = await api.get("/companies/me");
      setCompany(data);
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        toast.error("Could not load company profile");
      }
      setCompany(null);
    }
  }

  async function loadAttachments() {
    try {
      const { data } = await api.get("/my-attachments");
      setAttachments(data);
    } catch {
      setAttachments([]);
    }
  }

  async function loadCounts() {
    // Fetch applicants for each attachment in parallel
    const counts: Record<number, number> = {};
    await Promise.all(
      attachments.map(async (att) => {
        try {
          const { data } = await api.get(
            `/my-attachments/${att.id}/applicants`
          );
          counts[att.id] = data.length;
        } catch {
          counts[att.id] = 0;
        }
      })
    );
    setApplicantCounts(counts);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadCompany();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (company) {
      loadAttachments();
    }
  }, [company]);

  useEffect(() => {
    if (attachments.length > 0) {
      loadCounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments]);

  async function deleteAttachment(id: number) {
    if (!confirm("Delete this attachment? All applications will be removed."))
      return;
    try {
      await api.delete(`/attachments/${id}`);
      toast.success("Attachment deleted");
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Could not delete");
    }
  }

  async function toggleStatus(att: Attachment) {
    const next = att.status === "open" ? "closed" : "open";
    try {
      await api.put(`/attachments/${att.id}`, { status: next });
      toast.success(`Marked as ${next}`);
      loadAttachments();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Could not update");
    }
  }

  /* Loading */
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-white/5 rounded" />
          <div className="grid md:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white/5 rounded-2xl" />
            ))}
          </div>
          <div className="h-52 bg-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  /* Profile setup */
  if (!company) {
    return (
      <div className="px-6 py-12">
        <CompanyProfileSetup onCreated={setCompany} />
      </div>
    );
  }

  /* Main view */
  const totalApplicants = Object.values(applicantCounts).reduce(
    (a, b) => a + b,
    0
  );
  const openCount = attachments.filter((a) => a.status === "open").length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap animate-fade-in-up">
        <div>
          <span className="chip">
            <Building2 size={11} />
            {company.name}
            {company.verified && (
              <CheckCircle2 size={10} className="text-emerald-400 ml-1" />
            )}
          </span>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
            My <span className="neon-text">attachments</span>
          </h1>
          <p className="mt-3 text-slate-400 max-w-2xl">
            Post opportunities, review applicants, and move students through
            your pipeline.
          </p>
        </div>

        <button
          onClick={() => setPostingOpen(true)}
          className="btn-primary"
        >
          <Plus size={16} /> Post attachment
        </button>
      </div>

      {/* KPI row */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in-up">
        {[
          { label: "Total attachments", value: attachments.length, icon: Briefcase },
          { label: "Open", value: openCount, icon: Eye },
          { label: "Applicants", value: totalApplicants, icon: Users },
          { label: "Accepted", value: "—", icon: Award },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl glass p-4">
            <div className="flex items-start justify-between">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                {label}
              </p>
              <Icon size={14} className="text-slate-500" />
            </div>
            <p className="text-2xl font-black mt-1 text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {attachments.length === 0 && (
        <div className="mt-10 rounded-2xl glass p-12 text-center animate-fade-in-up">
          <Briefcase size={40} className="mx-auto text-slate-500 mb-4" />
          <h2 className="text-lg font-semibold text-white">
            No attachments posted yet
          </h2>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Post your first industrial attachment and start receiving
            applications from students.
          </p>
          <button
            onClick={() => setPostingOpen(true)}
            className="btn-primary inline-flex mt-6"
          >
            <Plus size={14} /> Post your first attachment
          </button>
        </div>
      )}

      {/* Attachment list */}
      <div className="mt-6 space-y-4">
        {attachments.map((att, i) => {
          const count = applicantCounts[att.id] ?? 0;
          return (
            <div
              key={att.id}
              className="rounded-2xl glass p-6 hover:border-neon-indigo/40 transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white text-lg">
                      {att.title}
                    </h3>
                    <span
                      className={`text-[10px] uppercase tracking-wider rounded-full px-2.5 py-1 border ${
                        att.status === "open"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-slate-500/10 border-slate-500/30 text-slate-400"
                      }`}
                    >
                      {att.status}
                    </span>
                    {count > 0 && (
                      <span className="chip !bg-neon-cyan/15 !border-neon-cyan/30 !text-neon-cyan">
                        <Users size={10} />
                        {count} applicant{count === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-slate-400 line-clamp-2">
                    {att.description}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {att.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={11} /> {att.location}
                      </span>
                    )}
                    {att.duration_weeks && (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} /> {att.duration_weeks} weeks
                      </span>
                    )}
                    {att.deadline && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={11} /> Deadline {att.deadline}
                      </span>
                    )}
                    {att.stipend && (
                      <span className="inline-flex items-center gap-1">
                        <DollarSign size={11} /> {att.stipend}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => setViewingApplicants(att)}
                    disabled={count === 0}
                    className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-50"
                  >
                    <Users size={12} />
                    {count === 0 ? "No applicants" : `Review ${count}`}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleStatus(att)}
                      className="btn-ghost !py-1.5 !px-3 !text-xs flex-1"
                    >
                      {att.status === "open" ? "Close" : "Reopen"}
                    </button>
                    <button
                      onClick={() => deleteAttachment(att.id)}
                      className="btn-ghost !py-1.5 !px-3 !text-xs text-rose-400 hover:text-rose-300 hover:border-rose-500/40"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {postingOpen && (
        <PostAttachmentModal
          onClose={() => setPostingOpen(false)}
          onPosted={() => {
            loadAttachments();
          }}
        />
      )}

      {viewingApplicants && (
        <ApplicantsPanel
          attachment={viewingApplicants}
          onClose={() => setViewingApplicants(null)}
          onStatusChange={() => {
            loadCounts();
          }}
        />
      )}
    </div>
  );
}

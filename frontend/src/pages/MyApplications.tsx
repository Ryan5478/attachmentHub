import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Loader2, FileText, Clock, CheckCircle2, XCircle, Star,
  Building2, MapPin, Calendar, Trash2, ArrowRight, Inbox,
} from "lucide-react";
import api from "../api/client";

type Application = {
  id: number;
  attachment_id: number;
  status: "pending" | "shortlisted" | "accepted" | "rejected" | string;
  cover_letter: string | null;
  applied_at: string | null;
  updated_at: string | null;
  attachment_title: string | null;
  company_name: string | null;
  company_notes: string | null;
};

const STATUS_META: Record<
  string,
  { label: string; icon: any; classes: string; dot: string }
> = {
  pending: {
    label: "Pending review",
    icon: Clock,
    classes: "bg-slate-500/10 border-slate-500/30 text-slate-300",
    dot: "bg-slate-400",
  },
  shortlisted: {
    label: "Shortlisted",
    icon: Star,
    classes: "bg-amber-500/10 border-amber-500/30 text-amber-300",
    dot: "bg-amber-400",
  },
  accepted: {
    label: "Accepted",
    icon: CheckCircle2,
    classes: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
    dot: "bg-emerald-400",
  },
  rejected: {
    label: "Not selected",
    icon: XCircle,
    classes: "bg-rose-500/10 border-rose-500/30 text-rose-300",
    dot: "bg-rose-400",
  },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1 border ${meta.classes}`}
    >
      <Icon size={11} />
      {meta.label}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function MyApplications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/students/me/applications");
      setApps(data);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setApps([]);
      } else {
        toast.error("Could not load applications");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function withdraw(id: number) {
    if (!confirm("Withdraw this application? This cannot be undone.")) return;
    setWithdrawing(id);
    try {
      await api.delete(`/applications/${id}`);
      toast.success("Application withdrawn");
      setApps((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Could not withdraw");
    } finally {
      setWithdrawing(null);
    }
  }

  // Summary counts
  const counts = apps.reduce(
    (acc, a) => {
      acc.total += 1;
      if (a.status in acc) (acc as any)[a.status] += 1;
      return acc;
    },
    { total: 0, pending: 0, shortlisted: 0, accepted: 0, rejected: 0 } as any
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-white/5 rounded" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-white/5 rounded-2xl" />
            ))}
          </div>
          <div className="h-40 bg-white/5 rounded-2xl" />
          <div className="h-40 bg-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap animate-fade-in-up">
        <div>
          <span className="chip">
            <FileText size={11} />
            Application tracker
          </span>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
            My <span className="neon-text">applications</span>
          </h1>
          <p className="mt-3 text-slate-400 max-w-2xl">
            Track every attachment you've applied to. Statuses update in real
            time as companies review.
          </p>
        </div>
        <Link to="/student" className="btn-ghost !py-2.5 !px-4 !text-sm">
          Browse more <ArrowRight size={14} />
        </Link>
      </div>

      {/* Summary tiles */}
      {apps.length > 0 && (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in-up">
          {[
            { key: "total", label: "Total", value: counts.total, tone: "text-white" },
            { key: "pending", label: "Pending", value: counts.pending, tone: "text-slate-300" },
            { key: "shortlisted", label: "Shortlisted", value: counts.shortlisted, tone: "text-amber-300" },
            { key: "accepted", label: "Accepted", value: counts.accepted, tone: "text-emerald-300" },
          ].map((t) => (
            <div key={t.key} className="rounded-2xl glass p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                {t.label}
              </p>
              <p className={`text-2xl font-black mt-1 ${t.tone}`}>{t.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {apps.length === 0 && (
        <div className="mt-10 rounded-2xl glass p-12 text-center animate-fade-in-up">
          <Inbox size={40} className="mx-auto text-slate-500 mb-4" />
          <h2 className="text-lg font-semibold text-white">
            You haven't applied to any attachments yet
          </h2>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Browse open opportunities and apply — companies will review your
            profile, resume, and cover letter.
          </p>
          <Link to="/student" className="btn-primary inline-flex mt-6">
            Find attachments <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Application list */}
      <div className="mt-6 space-y-4">
        {apps.map((app, i) => {
          const meta = STATUS_META[app.status] ?? STATUS_META.pending;
          const canWithdraw =
            app.status === "pending" || app.status === "shortlisted";

          return (
            <div
              key={app.id}
              className="rounded-2xl glass p-6 hover:border-neon-indigo/40 transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white text-lg">
                      {app.attachment_title ?? "Attachment"}
                    </h3>
                    <StatusBadge status={app.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                    {app.company_name && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 size={11} /> {app.company_name}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={11} /> Applied {formatDate(app.applied_at)}
                    </span>
                    {app.status !== "pending" && (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} /> Updated {formatDate(app.updated_at)}
                      </span>
                    )}
                  </div>
                </div>

                {canWithdraw && (
                  <button
                    onClick={() => withdraw(app.id)}
                    disabled={withdrawing === app.id}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 rounded-full px-3 py-1.5 transition disabled:opacity-40"
                  >
                    {withdrawing === app.id ? (
                      <><Loader2 size={11} className="animate-spin" /> Withdrawing…</>
                    ) : (
                      <><Trash2 size={11} /> Withdraw</>
                    )}
                  </button>
                )}
              </div>

              {/* Company notes (visible to student when present) */}
              {app.company_notes && (
                <div className="mt-4 rounded-xl bg-white/[0.03] border border-white/10 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
                    Note from {app.company_name ?? "the company"}
                  </p>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {app.company_notes}
                  </p>
                </div>
              )}

              {/* Cover letter preview */}
              {app.cover_letter && (
                <details className="mt-3 group">
                  <summary className="cursor-pointer text-xs text-slate-400 hover:text-neon-cyan inline-flex items-center gap-1.5 transition">
                    <FileText size={11} />
                    View submitted cover letter
                  </summary>
                  <div className="mt-3 rounded-xl bg-white/[0.02] border border-white/10 p-4">
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {app.cover_letter}
                    </p>
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from "recharts";
import {
  RefreshCw, Upload, ShieldCheck, Database, Users, FileSpreadsheet,
  AlertTriangle, CheckCircle2, Loader2,
} from "lucide-react";
import api from "../api/client";

function KpiTile({
  label, value, sub, tone = "default", icon: Icon,
}: any) {
  const toneClass =
    tone === "ok" ? "text-emerald-400"
    : tone === "warn" ? "text-amber-400"
    : "text-white";
  return (
    <div className="rounded-2xl glass p-5">
      <div className="flex items-start justify-between">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
        {Icon && <Icon size={14} className="text-slate-500" />}
      </div>
      <p className={`text-3xl font-black mt-2 ${toneClass}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function StatusBadge({ on, yes, no }: { on: boolean; yes: string; no: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 border ${
        on
          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
          : "bg-white/5 text-slate-400 border-white/10"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-emerald-400" : "bg-slate-500"}`} />
      {on ? yes : no}
    </span>
  );
}

function CsvImportCard({ onImported }: { onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/admin/upload-students-csv", form);
      setResult(data);
      toast.success(`${data.saved} candidates imported`);
      onImported();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl glass-strong p-6 glow-border">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-white/10 flex items-center justify-center">
          <FileSpreadsheet size={16} className="text-neon-cyan" />
        </div>
        <div>
          <h2 className="font-semibold text-white">Bulk import students</h2>
          <p className="text-xs text-slate-500">
            CSV with <code className="text-slate-400">full_name</code>,{" "}<code className="text-slate-400">email</code>,{" "}
            <code className="text-slate-400">email</code>,{" "}
            <code className="text-slate-400">resume_text</code>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex-1 min-w-[240px]">
          <div className="input-dark flex items-center gap-2 cursor-pointer hover:border-neon-cyan/40 transition">
            <Upload size={14} className="text-neon-cyan shrink-0" />
            <span className="text-sm text-slate-400 truncate">
              {file ? file.name : "Choose a CSV file…"}
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </label>
        <button
          onClick={upload}
          disabled={!file || busy}
          className="btn-primary"
        >
          {busy ? (
            <><Loader2 size={16} className="animate-spin" /> Importing…</>
          ) : (
            <><Upload size={16} /> Import</>
          )}
        </button>
      </div>

      {result && (
        <div className="mt-4 rounded-xl bg-white/[0.03] border border-white/10 p-4 text-sm">
          <p className="text-slate-200">
            {result.message} —{" "}
            <span className="text-emerald-400 font-medium">{result.saved} saved</span>
            {result.skipped > 0 && (
              <span className="text-amber-400"> · {result.skipped} skipped</span>
            )}
            {result.errors_count > 0 && (
              <span className="text-rose-400"> · {result.errors_count} errors</span>
            )}
          </p>
          {result.errors?.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-slate-500 max-h-40 overflow-y-auto">
              {result.errors.map((e: any, i: number) => (
                <li key={i}>
                  <span className="text-slate-400 font-mono">Row {e.row}:</span>{" "}
                  {e.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [status, setStatus] = useState<any>(null);
  const [fairness, setFairness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [s, f] = await Promise.all([
        api.get("/admin/status"),
        api.get("/admin/fairness"),
      ]);
      setStatus(s.data);
      setFairness(f.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function runAction(name: string, url: string) {
    setActing(name);
    try {
      const { data } = await api.post(url);
      toast.success(data.message ?? "Done");
      await loadAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Action failed");
    } finally {
      setActing(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-white/5 rounded" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-white/5 rounded-2xl" />
            ))}
          </div>
          <div className="h-80 bg-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-6 text-rose-200">
          <p className="font-semibold flex items-center gap-2">
            <AlertTriangle size={16} /> Could not load admin data
          </p>
          <p className="text-sm mt-2">{error}</p>
          <p className="text-xs mt-3 text-rose-300">
            You must be logged in as an <code>admin</code> user.
          </p>
        </div>
      </div>
    );
  }

  if (!status || !fairness) return null;

  const alert = fairness.summary.fairness_alert;
  const chartData = fairness.group_metrics.map((g: any) => ({
    group: g.group,
    selection_rate: g.selection_rate,
    true_positive_rate: g.true_positive_rate,
  }));

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap animate-fade-in-up">
        <div>
          <span className="chip">
            <ShieldCheck size={11} />
            Admin console
          </span>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
            System <span className="neon-text">overview</span>
          </h1>
          <p className="mt-3 text-slate-400">
            Live model health, fairness monitoring, and administrative controls.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge on={status.faiss_ready} yes="FAISS ready" no="FAISS off" />
          <StatusBadge on={status.siamese_ready} yes="Siamese ready" no="Siamese off" />
          <button
            onClick={loadAll}
            className="btn-ghost !py-2 !px-3 !text-sm"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <KpiTile
          label="Jobs loaded"
          value={status.jobs_loaded.toLocaleString()}
          sub={`Shortlist K = ${status.faiss_shortlist_k}`}
          icon={Database}
        />
        <KpiTile
          label="Candidates"
          value={status.candidates_loaded.toLocaleString()}
          sub={`Top-K = ${status.recommendation_top_k}`}
          icon={Users}
        />
        <KpiTile
          label="FAISS index"
          value={status.faiss_ready ? "Ready" : "Off"}
          tone={status.faiss_ready ? "ok" : "warn"}
          sub={`Siamese: ${status.siamese_requested ? "on" : "off"}`}
          icon={CheckCircle2}
        />
        <KpiTile
          label="Fairness alert"
          value={alert ? "Active" : "Clear"}
          tone={alert ? "warn" : "ok"}
          sub={`Threshold ${fairness.summary.threshold}`}
          icon={ShieldCheck}
        />
      </div>

      {/* Fairness alert banner */}
      {alert && (
        <div className="mt-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5 text-amber-100 animate-fade-in-up">
          <p className="font-semibold flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            Fairness alert
          </p>
          <p className="text-sm mt-2">
            One or more groups exceed the {fairness.summary.threshold} threshold.
            Demographic parity diff:{" "}
            <strong>{fairness.summary.demographic_parity_difference}</strong>, equal
            opportunity diff:{" "}
            <strong>{fairness.summary.equal_opportunity_difference}</strong>.
          </p>
        </div>
      )}

      {/* Chart + metrics */}
      <div className="mt-8 grid lg:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
        <div className="lg:col-span-2 rounded-2xl glass p-6">
          <h2 className="font-semibold text-white mb-1">Selection rate by group</h2>
          <p className="text-xs text-slate-500 mb-4">
            Fraction of each group that was selected. Ideally these bars are similar.
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="group" tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <Tooltip
                formatter={(v: any) => (typeof v === "number" ? v.toFixed(3) : v)}
                contentStyle={{
                  background: "rgba(15,15,34,0.95)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  borderRadius: 12,
                  color: "#e2e8f0",
                  fontSize: 12,
                  backdropFilter: "blur(12px)",
                }}
              />
              <Bar dataKey="selection_rate" radius={[8, 8, 0, 0]}>
                {chartData.map((_: any, i: number) => (
                  <Cell key={i} fill="url(#barGrad)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl glass p-6">
          <h2 className="font-semibold text-white mb-4">Fairness metrics</h2>
          <div className="space-y-3 text-sm">
            {[
              ["Demographic parity diff", fairness.summary.demographic_parity_difference],
              ["Equal opportunity diff", fairness.summary.equal_opportunity_difference],
              ["Threshold", fairness.summary.threshold],
              ["Monitoring", status.fairness_monitoring],
              ["Retraining", status.retraining],
            ].map(([label, val]) => (
              <div
                key={label as string}
                className="flex justify-between items-center rounded-xl bg-white/[0.03] border border-white/5 p-3"
              >
                <span className="text-slate-400 text-xs">{label}</span>
                <span className="font-semibold text-white text-sm">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Group table */}
      <div className="mt-8 rounded-2xl glass overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="font-semibold text-white">Group breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-slate-400">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-xs uppercase tracking-wider">Group</th>
                <th className="text-right px-6 py-3 font-medium text-xs uppercase tracking-wider">Selected</th>
                <th className="text-right px-6 py-3 font-medium text-xs uppercase tracking-wider">Total</th>
                <th className="text-right px-6 py-3 font-medium text-xs uppercase tracking-wider">Selection rate</th>
                <th className="text-right px-6 py-3 font-medium text-xs uppercase tracking-wider">True positive rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {fairness.group_metrics.map((g: any) => (
                <tr key={g.group} className="hover:bg-white/[0.02] transition">
                  <td className="px-6 py-3 text-white capitalize">{g.group}</td>
                  <td className="px-6 py-3 text-right text-slate-300">{g.selected}</td>
                  <td className="px-6 py-3 text-right text-slate-300">{g.total}</td>
                  <td className="px-6 py-3 text-right text-slate-300 font-mono">
                    {g.selection_rate.toFixed(3)}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-300 font-mono">
                    {g.true_positive_rate.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions + CSV */}
      <div className="mt-8 space-y-6 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
        <CsvImportCard onImported={loadAll} />

        <div className="rounded-2xl glass-strong p-6 glow-border">
          <h2 className="font-semibold text-white">Admin actions</h2>
          <p className="text-sm text-slate-500 mt-1">
            Rebuild server-side caches after updating the job data on disk.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => runAction("reload", "/admin/reload-jobs")}
              disabled={acting === "reload"}
              className="btn-primary"
            >
              {acting === "reload" ? (
                <><Loader2 size={16} className="animate-spin" /> Reloading…</>
              ) : (
                <><RefreshCw size={16} /> Reload jobs</>
              )}
            </button>
            <button
              onClick={() => runAction("rebuild", "/admin/rebuild-index")}
              disabled={acting === "rebuild"}
              className="btn-ghost"
            >
              {acting === "rebuild" ? (
                <><Loader2 size={16} className="animate-spin" /> Rebuilding…</>
              ) : (
                <><Database size={16} /> Rebuild FAISS index</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

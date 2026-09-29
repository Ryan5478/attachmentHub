import { useState } from "react";
import toast from "react-hot-toast";
import {
  Search, Loader2, ExternalLink, Sparkles, Brain, Building2, Filter,
  Globe, RefreshCw,
} from "lucide-react";
import api from "../api/client";

type Discovered = {
  title: string;
  url: string;
  company: string;
  snippet: string;
  source: string;
};

type ScoreResult = {
  fit_score: number;
  verdict: string;
  reasoning: string;
};

export default function AttachmentDiscovery({ resumeText }: { resumeText: string }) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [scores, setScores] = useState<Record<string, ScoreResult>>({});
  const [scoring, setScoring] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setData(null);
    setScores({});
    try {
      const { data } = await api.post("/attachments/discover", {
        query: query.trim(),
        location: location.trim() || null,
        max_results: 20,
      });
      setData(data);
      const kept = data.results?.length ?? 0;
      toast.success(
        `${kept} live result${kept === 1 ? "" : "s"} found${data.cached ? " (cached)" : ""}`
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function score(job: Discovered) {
    if (!resumeText) {
      toast.error("Upload a resume first to use AI scoring");
      return;
    }
    setScoring(job.url);
    try {
      const { data } = await api.post("/ai/match", {
        job_title: job.title,
        job_description: job.snippet,
        resume_text: resumeText,
      });
      setScores((prev) => ({ ...prev, [job.url]: data }));
      toast.success(`Fit: ${data.fit_score}/100`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Scoring failed");
    } finally {
      setScoring(null);
    }
  }

  const cacheAge = (seconds: number) => {
    if (!seconds) return "";
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="mt-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-indigo/20 border border-white/10 flex items-center justify-center">
          <Globe size={18} className="text-neon-cyan" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Search the web</h2>
          <p className="text-xs text-slate-500">
            Live attachment listings from across the internet — aggregators
            automatically filtered out
          </p>
        </div>
      </div>

      {/* Search form */}
      <form
        onSubmit={search}
        className="rounded-2xl glass p-3 flex flex-col md:flex-row gap-2"
      >
        <div className="flex-1 relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Try "software engineering", "data analytics", "marketing"'
            className="input-dark !pl-9"
          />
        </div>
        <div className="md:w-48 relative">
          <Building2
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City"
            className="input-dark !pl-9"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="btn-primary md:w-auto"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Searching…
            </>
          ) : (
            <>
              <Sparkles size={16} /> Search
            </>
          )}
        </button>
      </form>

      {/* Result meta */}
      {data && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          <span className="chip">
            <Sparkles size={11} />
            {data.results.length} result{data.results.length === 1 ? "" : "s"}
          </span>
          {data.filtered_out > 0 && (
            <span className="text-slate-500 inline-flex items-center gap-1">
              <Filter size={11} /> {data.filtered_out} aggregator
              {data.filtered_out === 1 ? "" : "s"} filtered
            </span>
          )}
          <span className="text-slate-500">
            Searched {data.total_searched} pages
          </span>
          {data.cached && (
            <span className="text-neon-cyan inline-flex items-center gap-1">
              <RefreshCw size={11} /> Cached {cacheAge(data.cache_age_seconds)}
            </span>
          )}
        </div>
      )}

      {/* Empty state */}
      {data && data.results.length === 0 && (
        <div className="mt-6 rounded-2xl glass p-10 text-center">
          <Globe size={32} className="mx-auto text-slate-500 mb-4" />
          <p className="text-slate-300 font-medium">
            No direct listings matched that search.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Try a broader term, or add a city to narrow results.
          </p>
        </div>
      )}

      {/* Not yet searched */}
      {!data && !loading && (
        <div className="mt-6 rounded-2xl glass p-8 text-center border-dashed border-white/10">
          <Globe size={28} className="mx-auto text-slate-500 mb-3 opacity-60" />
          <p className="text-sm text-slate-400">
            Enter a role and location to search live attachment listings from
            the open web.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
            {["software engineering", "data analytics", "marketing", "finance", "HR"].map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQuery(s)}
                  className="text-xs chip hover:border-neon-cyan/60 transition cursor-pointer"
                >
                  {s}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="mt-4 space-y-3">
        {data?.results.map((job: Discovered, i: number) => {
          const score = scores[job.url];
          return (
            <div
              key={i}
              className="rounded-2xl glass p-5 hover:border-neon-cyan/40 transition animate-fade-in-up"
              style={{ animationDelay: `${i * 0.03}s` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white leading-snug">
                    {job.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-400">
                    {job.company && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 size={11} /> {job.company}
                      </span>
                    )}
                    <span className="font-mono text-slate-500">
                      {job.source}
                    </span>
                  </div>
                  {job.snippet && (
                    <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                      {job.snippet}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white border border-white/10 hover:border-white/30 rounded-full px-3 py-1.5 transition"
                >
                  <ExternalLink size={11} /> Open listing
                </a>

                <button
                  onClick={() => score(job)}
                  disabled={scoring === job.url || !resumeText}
                  className="inline-flex items-center gap-1.5 text-xs text-neon-cyan hover:text-white border border-neon-cyan/30 hover:border-neon-cyan/60 rounded-full px-3 py-1.5 transition disabled:opacity-40"
                >
                  {scoring === job.url ? (
                    <>
                      <Loader2 size={11} className="animate-spin" /> Scoring…
                    </>
                  ) : (
                    <>
                      <Brain size={11} /> AI Fit Score
                    </>
                  )}
                </button>

                {!resumeText && (
                  <span className="text-[10px] text-slate-500 italic">
                    Upload a resume to enable AI scoring
                  </span>
                )}
              </div>

              {/* Score result */}
              {score && (
                <div className="mt-4 rounded-xl bg-white/[0.03] border border-white/10 p-4 animate-fade-in-up">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-black neon-text">
                      {score.fit_score}
                    </span>
                    <span className="text-xs text-slate-500">/100</span>
                    <span
                      className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 border ${
                        score.verdict === "strong_match"
                          ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
                          : score.verdict === "moderate_match"
                          ? "text-amber-300 bg-amber-500/10 border-amber-500/30"
                          : "text-slate-300 bg-white/5 border-white/10"
                      }`}
                    >
                      {score.verdict.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {score.reasoning}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      {data && data.results.length > 0 && (
        <p className="mt-6 text-xs text-slate-500 text-center">
          Applications to live listings happen on the company's own site.
          Curated attachments above can be applied to through AttachmentHub.
        </p>
      )}
    </div>
  );
}

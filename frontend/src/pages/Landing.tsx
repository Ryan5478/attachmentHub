import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ArrowRight, Shield, Sparkles, Target, Zap, Brain, FileText, Briefcase, Users,
} from "lucide-react";

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Logged-in users go straight to their dashboard
  useEffect(() => {
    if (user?.role === "candidate") navigate("/student", { replace: true });
    else if (user?.role === "employer") navigate("/company", { replace: true });
    else if (user?.role === "admin") navigate("/admin", { replace: true });
  }, [user, navigate]);
  return (
    <div className="relative">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="animate-fade-in-up">
            <span className="chip animate-glow-pulse">
              <Sparkles size={12} />
              Industrial attachment platform
            </span>

            <h1 className="mt-8 text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]">
              <span className="text-white">Where students </span>
              <br />
              <span className="neon-text">meet companies</span>
            </h1>

            <p className="mt-8 text-lg text-slate-400 max-w-xl leading-relaxed">
              Real attachment opportunities posted by real companies. AI-matched
              to your course, skills, and year of study. Apply in seconds with
              a tailored cover letter.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/register" className="btn-primary">
                <Zap size={18} /> Find your attachment
                <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="btn-ghost">
                Sign in
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-pulse-ring" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                Live opportunities
              </div>
              <div>•</div>
              <div>Direct from companies</div>
              <div>•</div>
              <div>AI-matched</div>
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-neon-indigo/30 via-neon-purple/20 to-neon-cyan/20 rounded-3xl blur-3xl" />
            <div className="relative glass-strong rounded-3xl p-6 glow-border">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-pink-500/70" />
                <div className="h-3 w-3 rounded-full bg-amber-500/70" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
                <div className="ml-3 text-xs text-slate-500 font-mono">
                  attachment-hub --live
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { title: "Software Engineering Attachment", company: "Safaricom PLC", duration: "12 weeks" },
                  { title: "Data Analytics Attachment", company: "Equity Bank", duration: "8 weeks" },
                  { title: "Product Design Attachment", company: "Cellulant", duration: "10 weeks" },
                ].map((att, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4 hover:border-neon-indigo/40 transition group"
                    style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{att.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{att.company}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs text-neon-cyan font-medium">{att.duration}</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">duration</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 font-mono">
                <Brain size={12} className="text-neon-cyan" />
                <span>AI-matched to your resume</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-7xl mx-auto px-6 pb-32">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Target, title: "Course-aware matching", desc: "Attachments ranked by your course, skills, year of study, and preferences.", color: "from-neon-indigo to-neon-purple" },
            { icon: Sparkles, title: "AI cover letters", desc: "Every application gets a tailored cover letter in 30 seconds — grounded in your resume.", color: "from-neon-purple to-neon-pink" },
            { icon: Shield, title: "Real companies only", desc: "No aggregators. Verified employers posting direct industrial attachment opportunities.", color: "from-neon-cyan to-neon-teal" },
            { icon: FileText, title: "Track every application", desc: "See pending, shortlisted, and accepted statuses in real time from your dashboard.", color: "from-neon-indigo to-neon-cyan" },
            { icon: Briefcase, title: "Post in minutes", desc: "Companies publish attachments with structured fields, deadlines, and required skills.", color: "from-neon-pink to-neon-purple" },
            { icon: Users, title: "Review at scale", desc: "Companies see applicants ranked by fit, with AI-generated summaries of each candidate.", color: "from-neon-teal to-neon-cyan" },
          ].map(({ icon: Icon, title, desc, color }, i) => (
            <div
              key={title}
              className="group relative rounded-2xl glass p-6 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className={`inline-flex h-11 w-11 rounded-xl bg-gradient-to-br ${color} p-[1.5px]`}>
                <div className="h-full w-full rounded-[10px] bg-void-800 flex items-center justify-center">
                  <Icon size={20} className="text-white" />
                </div>
              </div>
              <h3 className="mt-5 font-semibold text-white text-lg">{title}</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/[0.06] py-10 text-center text-sm text-slate-500">
        <p className="font-mono">
          © {new Date().getFullYear()} AttachmentHub · connecting students and companies
        </p>
      </footer>
    </div>
  );
}

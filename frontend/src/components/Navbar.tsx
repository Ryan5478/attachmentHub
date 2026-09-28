import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Sparkles, LogOut, User, Briefcase } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] backdrop-blur-xl bg-void-900/60">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="group flex items-center gap-2.5">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-neon-indigo to-neon-purple blur-md opacity-60 group-hover:opacity-100 transition" />
            <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-neon-indigo via-neon-purple to-neon-cyan p-[1.5px]">
              <div className="h-full w-full rounded-[10px] bg-void-800 flex items-center justify-center">
                <Briefcase size={16} className="text-neon-cyan" />
              </div>
            </div>
          </div>
          <span className="font-bold text-lg tracking-tight shimmer-text">
            Attachment<span className="text-white/90">Hub</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm font-medium">
          {user?.role === "candidate" && (
            <>
              <NavLink
                to="/student"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg transition ${isActive ? "text-white bg-white/5" : "text-slate-300 hover:text-white hover:bg-white/5"}`
                }
              >
                Browse Attachments
              </NavLink>
              <NavLink
                to="/student/applications"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg transition ${isActive ? "text-white bg-white/5" : "text-slate-300 hover:text-white hover:bg-white/5"}`
                }
              >
                My Applications
              </NavLink>
            </>
          )}

          {user?.role === "employer" && (
            <>
              <NavLink
                to="/company"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg transition ${isActive ? "text-white bg-white/5" : "text-slate-300 hover:text-white hover:bg-white/5"}`
                }
              >
                My Attachments
              </NavLink>
              <NavLink
                to="/company/post"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg transition ${isActive ? "text-white bg-white/5" : "text-slate-300 hover:text-white hover:bg-white/5"}`
                }
              >
                Post Attachment
              </NavLink>
            </>
          )}

          {user?.role === "admin" && (
            <NavLink
              to="/admin"
              className="px-3 py-2 rounded-lg text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 transition font-semibold"
            >
              Admin
            </NavLink>
          )}

          {user ? (
            <div className="flex items-center gap-3 ml-3 pl-3 border-l border-white/10">
              <span className="inline-flex items-center gap-1.5 text-slate-400 text-xs">
                <User size={13} />
                {user.full_name}
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-pink-400 transition text-xs font-medium"
              >
                <LogOut size={13} /> Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-3">
              <Link
                to="/login"
                className="px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition"
              >
                Login
              </Link>
              <Link to="/register" className="btn-primary !py-2 !px-4 !text-sm">
                Sign up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

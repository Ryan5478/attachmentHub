import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(email, password);
      toast.success(`Welcome back, ${data.full_name}`);
      navigate(data.role === "admin" ? "/admin" : data.role === "employer" ? "/company" : "/student");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="glass-strong rounded-2xl p-8 glow-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-indigo to-neon-purple flex items-center justify-center">
              <LogIn size={18} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Sign in</h1>
          </div>
          <p className="text-sm text-slate-400">
            New here?{" "}
            <Link to="/register" className="text-neon-cyan hover:text-neon-cyan/80 font-medium">
              Create an account
            </Link>
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <input type="email" placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className="input-dark" />
            <input type="password" placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)} required
              className="input-dark" />

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in…
                </>
              ) : (
                <>Sign in</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

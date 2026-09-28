import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "candidate" });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await register(form);
      toast.success(`Welcome, ${data.full_name}`);
      navigate(data.role === "employer" ? "/company" : "/student");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="glass-strong rounded-2xl p-8 glow-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center">
              <UserPlus size={18} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Create account</h1>
          </div>
          <p className="text-sm text-slate-400">
            Already registered?{" "}
            <Link to="/login" className="text-neon-cyan hover:text-neon-cyan/80 font-medium">
              Sign in
            </Link>
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <input placeholder="Full name" value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} required
              className="input-dark" />
            <input type="email" placeholder="Email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} required
              className="input-dark" />
            <input type="password" placeholder="Password (min 8 chars)" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8}
              className="input-dark" />
            <select value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="input-dark">
              <option value="candidate">Student — find attachments</option>
              <option value="employer">Company — post attachments</option>
            </select>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

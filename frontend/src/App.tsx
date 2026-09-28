import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/StudentDashboard";
import MyApplications from "./pages/MyApplications";
import CompanyDashboard from "./pages/CompanyDashboard";
import EmployerDashboard from "./pages/EmployerDashboard";
import AdminDashboard from "./pages/AdminDashboard";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-neon-indigo/20 blur-[120px] animate-orb-drift" />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-neon-purple/20 blur-[120px] animate-orb-drift" style={{ animationDelay: "-6s" }} />
          <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full bg-neon-cyan/15 blur-[120px] animate-orb-drift" style={{ animationDelay: "-12s" }} />
        </div>

        <div className="scanline-overlay" />
        <div className="scanline-sweep" />

        <div className="relative z-10">
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Student routes (role: candidate) */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={["candidate"]}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/applications"
              element={
                <ProtectedRoute allowedRoles={["candidate"]}>
                  <MyApplications />
                </ProtectedRoute>
              }
            />
            {/* Backwards compat — old URL */}
            <Route
              path="/candidate"
              element={
                <ProtectedRoute allowedRoles={["candidate"]}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            {/* Company routes (role: employer) */}
            <Route
              path="/company"
              element={
                <ProtectedRoute allowedRoles={["employer"]}>
                  <CompanyDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employer"
              element={
                <ProtectedRoute allowedRoles={["employer"]}>
                  <EmployerDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "rgba(15,15,34,0.95)",
              color: "#e2e8f0",
              border: "1px solid rgba(99,102,241,0.3)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(99,102,241,0.2)",
            },
            success: { iconTheme: { primary: "#22d3ee", secondary: "#0f0f22" } },
            error: { iconTheme: { primary: "#ec4899", secondary: "#0f0f22" } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

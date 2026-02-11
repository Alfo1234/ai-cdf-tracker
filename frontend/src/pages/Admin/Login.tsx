// frontend/src/pages/Admin/Login.tsx
import { useState } from "react";
import { Mail, Lock, LogIn } from "lucide-react";
import api from "../../api/client";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    const formBody = new URLSearchParams();
    formBody.append("username", username);
    formBody.append("password", password);

    const response = await api.post("/auth/login", formBody, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    localStorage.setItem("access_token", response.data.access_token);

    // Success → redirect
    navigate("/admin");

  } catch (err: any) {
    const errorMessage =
      err.response?.data?.detail ||
      err.message ||
      "Login failed. Please try again.";
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-10">
          {/* Logo/Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-slate-900">Admin Login</h1>
            <p className="text-slate-600 mt-3">
              CDF <span className="text-sky-400">Tracker</span> • Transparency Portal
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Mail size={18} />
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Lock size={18} />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                placeholder="Enter password"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm text-center font-medium bg-red-50 py-3 px-4 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-sky-600 text-white font-semibold text-lg rounded-xl hover:bg-sky-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <LogIn size={22} />
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
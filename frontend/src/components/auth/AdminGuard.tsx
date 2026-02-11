import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import api from "../../api/client";

type Me = {
  id: number;
  username: string;
  role: "admin" | "moderator" | "viewer";
  status: "active" | "disabled";
};

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    // No token → go login immediately
    if (!token) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    const run = async () => {
      try {
        const res = await api.get<Me>("/auth/me");

        // Must be active + admin
        const ok = res.data.status === "active" && res.data.role === "admin";
        setAllowed(ok);

        if (!ok) {
          localStorage.removeItem("access_token");
        }
      } catch {
        // Token invalid/expired → clear and redirect
        localStorage.removeItem("access_token");
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  if (loading) {
    return (
      <div className="p-20 text-center">
        <p className="text-lg text-slate-600">Checking admin access…</p>
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

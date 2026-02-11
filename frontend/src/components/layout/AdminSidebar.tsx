// src/components/layout/AdminSidebar.tsx
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  FolderKanban,
  BarChart3,
  Users,
  LogOut,
} from "lucide-react";

const handleLogout = () => {
  localStorage.removeItem("access_token");
  window.location.href = "/admin/login";
};

const navClass =
  "flex items-center gap-4 px-5 py-3.5 rounded-xl text-sm font-medium transition-all";

const activeClass =
  "bg-emerald-500/20 text-emerald-300 shadow-lg shadow-emerald-500/20 border border-emerald-500/30";

const inactiveClass = "text-sky-300 hover:bg-sky-800/60 hover:text-white";

export default function AdmSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-sky-950 to-sky-900 border-r border-sky-800 shadow-2xl flex flex-col z-50">
      <div className="px-8 py-10">
        <h1 className="text-2xl font-bold text-white">
          Admin <span className="text-emerald-400">Panel</span>
        </h1>
        <p className="text-sm text-sky-300 mt-2">CDF Tracker • Management</p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            `${navClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          <LayoutDashboard size={20} />
          <span>Overview</span>
        </NavLink>

        <NavLink
          to="/admin/feedback"
          className={({ isActive }) =>
            `${navClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          <MessageSquare size={20} />
          <span>Feedback</span>
        </NavLink>

        {/* Projects = Projects + Awards + Contractors (inside same page) */}
        <NavLink
          to="/admin/projects"
          className={({ isActive }) =>
            `${navClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          <FolderKanban size={20} />
          <span>Management</span>
        </NavLink>

        {/* ✅ NEW: Analytics */}
        <NavLink
          to="/admin/analytics"
          className={({ isActive }) =>
            `${navClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          <BarChart3 size={20} />
          <span>Risk Center</span>
        </NavLink>

        {/* ✅ NEW: Users */}
        <NavLink
          to="/admin/users"
          className={({ isActive }) =>
            `${navClass} ${isActive ? activeClass : inactiveClass}`
          }
        >
          <Users size={20} />
          <span>Users</span>
        </NavLink>
      </nav>

      <div className="p-4 border-t border-sky-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-5 py-3.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

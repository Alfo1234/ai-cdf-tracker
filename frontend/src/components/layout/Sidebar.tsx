import { NavLink } from "react-router-dom";
import { LayoutDashboard, FolderKanban, BarChart3, LogOut } from "lucide-react";


export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-slate-950 to-slate-900 border-r border-slate-800 shadow-2xl flex flex-col z-50">
      <div className="px-8 py-10">
        <h1 className="text-2xl font-bold text-white">
          CDF <span className="text-sky-400">Tracker</span>
        </h1>
        <p className="text-sm text-slate-400 mt-2">AI-Powered Transparency Portal</p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {[
          { to: "/", icon: LayoutDashboard, label: "Dashboard" },
          { to: "/projects", icon: FolderKanban, label: "Projects" },
          { to: "/analytics", icon: BarChart3, label: "Analytics" },
        ].map((item) => (
          <NavLink
  key={item.to}
  to={item.to}
  className={({ isActive }) =>
    `flex items-center gap-4 px-5 py-3.5 rounded-xl text-sm font-medium transition-all duration-0 ease-in-out ${
      isActive
        ? "bg-sky-500/20 text-sky-300 shadow-lg shadow-sky-500/20 border border-sky-500/30"
        : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
    }`
  }
>
  <item.icon size={20} />
  <span>{item.label}</span>
</NavLink>
          
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <NavLink
          to="/logout"
          className="flex items-center gap-4 px-5 py-3.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </NavLink>
      </div>
    </aside>
  );
}
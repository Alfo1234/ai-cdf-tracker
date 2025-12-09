import { NavLink } from "react-router-dom";
import { LayoutDashboard, FolderKanban, BarChart3, LogOut } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-slate-950 bg-gradient-to-b from-slate-900 to-slate-950 text-slate-100 border-r border-slate-800 flex flex-col">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-slate-800">
        <h1 className="text-xl font-semibold tracking-wide">
          CDF <span className="text-sky-400">Tracker</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          AI-Powered Transparency
        </p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <NavItem to="/" label="Dashboard" icon={<LayoutDashboard size={18} />} />
        <NavItem to="/projects" label="Projects" icon={<FolderKanban size={18} />} />
        <NavItem to="/analytics" label="Analytics" icon={<BarChart3 size={18} />} />
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-slate-800">
        <NavItem to="/auth/login" label="Logout" icon={<LogOut size={18} />} danger />
      </div>
    </aside>
  );
}

type NavItemProps = {
  to: string;
  label: string;
  icon: React.JSX.Element;
  danger?: boolean;
};

function NavItem({ to, label, icon, danger }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
          "hover:bg-slate-800/80",
          danger ? "text-red-400 hover:text-red-300" : "text-slate-200",
          isActive &&
            "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-500/30",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      <span>{icon}</span>
      <span className="font-medium">{label}</span>
    </NavLink>
  );
}


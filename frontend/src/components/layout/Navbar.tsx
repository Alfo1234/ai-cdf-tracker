import { Search } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();

  const pageTitles: Record<string, string> = {
    "/": "Dashboard",
    "/projects": "Projects",
    "/analytics": "Analytics",
  };

  const title = pageTitles[location.pathname] || "CDF Tracker";

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-slate-200">
      <div className="h-16 px-8 flex items-center justify-between">
        {/* Left: breadcrumb + title */}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">
            CDF Transparency Portal
          </p>
          <h2 className="text-lg font-semibold mt-1">{title}</h2>
        </div>

        {/* Right: search + avatar */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-2.5 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search constituencies or projects..."
              className="w-72 pl-10 pr-3 py-2 rounded-full border border-slate-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-sm font-semibold">
            KE
          </div>
        </div>
      </div>
    </header>
  );
}

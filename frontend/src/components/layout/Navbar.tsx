// src/components/layout/Navbar.tsx
import { useEffect, useState, useRef } from "react";
import { Search } from "lucide-react";  // Added ChevronRight if needed later
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api/client";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [constituencies, setConstituencies] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pageTitles: Record<string, string> = {
    "/": "Dashboard",
    "/projects": "Projects",
    "/analytics": "Analytics",
  };

  // Dynamic title based on path
  const currentPath = location.pathname;
  const isProjectDetail = currentPath.startsWith("/projects/") && currentPath !== "/projects";
  const title = isProjectDetail 
    ? "Project Details" 
    : pageTitles[currentPath] || "CDF Tracker";

  // Show search only on Dashboard OR Project Detail pages
  const showSearchBar = currentPath === "/" || isProjectDetail;

  // Fetch constituencies when search bar is visible
  useEffect(() => {
    if (showSearchBar) {
      const fetchConstituencies = async () => {
        try {
          const response = await api.get("/constituencies/");
          const names = response.data.map((c: any) => c.name).sort();
          setConstituencies(names);
        } catch (error) {
          console.error("Error fetching constituencies:", error);
        }
      };
      fetchConstituencies();
    }
  }, [showSearchBar]);

  const filteredConstituencies = constituencies.filter(name =>
    name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (name: string) => {
    setQuery(name);
    setShowDropdown(false);
    navigate(`/projects?constituency=${encodeURIComponent(name)}`);
    inputRef.current?.blur();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/projects?constituency=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/75 border-b border-white/20 shadow-sm">
      <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Title */}
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
            CDF Transparency Portal
          </p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            {title}
          </h1>
        </div>

        {/* Right: Search (only on Dashboard & Project Detail) + Avatar */}
        <div className="flex items-center gap-4">
          {showSearchBar && (
            <form onSubmit={handleSubmit} className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search constituency..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                className="w-72 lg:w-96 pl-11 pr-5 py-3 
                           bg-white/90 border border-slate-200 
                           rounded-full text-sm text-slate-800
                           placeholder:text-slate-400
                           focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500
                           shadow-sm hover:shadow-md transition-all duration-200"
              />
              {showDropdown && query && (
                <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-200 max-h-60 overflow-auto">
                  {filteredConstituencies.length > 0 ? (
                    filteredConstituencies.map(name => (
                      <div
                        key={name}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelect(name)}
                        className="px-4 py-2 hover:bg-sky-50 cursor-pointer text-sm"
                      >
                        {name}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-slate-500 text-sm">No constituency found</div>
                  )}
                </div>
              )}
            </form>
          )}

          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 
                         flex items-center justify-center text-white font-bold text-sm shadow-lg">
            KE
          </div>
        </div>
      </div>
    </header>
  );
}
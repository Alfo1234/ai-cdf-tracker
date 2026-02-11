// frontend/src/pages/Projects/Projects.tsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import api from "../../api/client";
import { useSearchParams } from "react-router-dom";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);

interface Project {
  id: number;
  title: string;
  category: string;
  status: string;
  budget: number;
  progress: number;
  constituency_name: string;
  mp_name: string;  
}

export default function Projects() {
  const [searchParams] = useSearchParams();
  const initialConstituency = searchParams.get("constituency") || "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [constituencies, setConstituencies] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [constituencyFilter, setConstituencyFilter] = useState(initialConstituency);
  const [showDropdown, setShowDropdown] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const projectsPerPage = 10;
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projResponse = await api.get("/projects/");
        const projData = projResponse.data;
        setProjects(projData);
        setFilteredProjects(projData);

        const constResponse = await api.get("/constituencies/");
        const constData = constResponse.data;
        const names = constData.map((c: any) => c.name).sort();
        setConstituencies(names);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let filtered = projects;

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (constituencyFilter) {
      filtered = filtered.filter(p => p.constituency_name === constituencyFilter);
    }

    setFilteredProjects(filtered);
    setPage(1);
  }, [searchTerm, categoryFilter, statusFilter, constituencyFilter, projects]);

  const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);
  const paginatedProjects = filteredProjects.slice(
    (page - 1) * projectsPerPage,
    page * projectsPerPage
  );

  const uniqueCategories = Array.from(new Set(projects.map(p => p.category)));
  const uniqueStatuses = Array.from(new Set(projects.map(p => p.status)));

  const filteredConstituencies = constituencies.filter(name =>
    name.toLowerCase().includes(constituencyFilter.toLowerCase())
  );

  const handleConstituencySelect = (name: string) => {
    setConstituencyFilter(name);
    setShowDropdown(false);
    inputRef.current?.blur(); 
  };

  if (loading) {
    return <div className="p-8 text-center text-lg">Loading projects...</div>;
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">All CDF Projects</h1>
        <p className="text-slate-600 mt-2">
          Complete list of constituency development fund projects across Kenya
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Filter className="w-6 h-6 text-slate-600" />
          <h3 className="text-lg font-semibold">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search project title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Categories</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Statuses</option>
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          {/* Searchable constituency filter */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type to search constituency..."
              value={constituencyFilter}
              onChange={(e) => {
                setConstituencyFilter(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            {showDropdown && constituencyFilter && (
              <div className="absolute z-10 mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-200 max-h-60 overflow-auto">
                {filteredConstituencies.length > 0 ? (
                  filteredConstituencies.map(name => (
                    <div
                      key={name}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleConstituencySelect(name)}
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
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-900">
            Projects ({filteredProjects.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs font-medium text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-8 py-4 text-left">Project</th>
                <th className="px-8 py-4 text-left">Constituency</th>
                <th className="px-8 py-4 text-left">MP</th>
                <th className="px-8 py-4 text-left">Category</th>
                <th className="px-8 py-4 text-left">Status</th>
                <th className="px-8 py-4 text-left">Budget</th>
                <th className="px-8 py-4 text-left">Progress</th>
                <th className="px-8 py-4 text-left">Actions</th> {/* ← NEW COLUMN */}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedProjects.map((project) => (
                <tr key={project.id} className="hover:bg-slate-50 transition">
                  <td className="px-8 py-5 font-medium text-slate-900">{project.title}</td>
                  <td className="px-8 py-5 font-medium text-slate-700">
                    {project.constituency_name}
                  </td>
                  <td className="px-8 py-5 text-slate-600">
                    {project.mp_name}
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-4 py-1.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                      {project.category}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-full ring-1 ring-inset ${
                      project.status === "Completed" 
                        ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
                        : project.status === "Ongoing"
                        ? "bg-amber-100 text-amber-800 ring-amber-200"
                        : "bg-red-100 text-red-800 ring-red-200"
                    }`}>
                      {project.status === "Completed" ? <CheckCircle2 size={16} /> : 
                       project.status === "Ongoing" ? <Loader2 size={16} /> : 
                       <AlertTriangle size={16} />}
                      {project.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 font-medium text-slate-700">
                    {formatCurrency(project.budget)}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-slate-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-1000 ${
                            project.status === "Completed" ? "bg-emerald-500" : 
                            project.status === "Ongoing" ? "bg-amber-500" : 
                            "bg-red-500"
                          }`}
                          style={{ width: `${project.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-12 text-right">
                        {project.progress || 0}%
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <button
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                      View Details
                      <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-8 py-5 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Showing {(page - 1) * projectsPerPage + 1} to {Math.min(page * projectsPerPage, filteredProjects.length)} of {filteredProjects.length} projects
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="px-4 py-2 text-sm font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
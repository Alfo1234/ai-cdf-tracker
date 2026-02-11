// src/pages/Admin/Feedback.tsx
import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
} from "lucide-react";
import api from "../../api/client";

interface Project {
  id: number;
  title: string;
}

interface Feedback {
  id: number;
  project_id: number;
  project_title?: string;
  name: string | null;
  email: string | null;
  message: string;
  status: string;
  created_at: string;
}

export default function AdminFeedback() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // ✅ from URL: /admin/feedback?project=12&status=pending
  const qpProject = searchParams.get("project");
  const qpStatus = searchParams.get("status");

  // ✅ optional: from navigate state (if you still use it somewhere)
  const focusProjectIdFromState = (location.state as any)?.focusProjectId as number | undefined;
  const focusStatusFromState = (location.state as any)?.focusStatus as
    | "pending"
    | "approved"
    | "rejected"
    | undefined;

  // ✅ final focus values (URL takes priority)
  const focusProjectId =
    qpProject != null ? Number(qpProject) : focusProjectIdFromState;

  const focusStatus =
    (qpStatus as any) || focusStatusFromState;

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [projects, setProjects] = useState<Record<number, string>>({});
  const [projectOptions, setProjectOptions] = useState<Project[]>([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");

  const [projectFilter, setProjectFilter] = useState<"all" | number>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [feedbackRes, projectRes] = await Promise.all([
        api.get("/feedback/"),
        api.get("/projects/"),
      ]);

      setFeedbacks(Array.isArray(feedbackRes.data) ? feedbackRes.data : []);

      const options: Project[] = Array.isArray(projectRes.data) ? projectRes.data : [];
      const projectMap: Record<number, string> = {};

      options.forEach((p) => {
        projectMap[p.id] = p.title;
      });

      options.sort((a, b) => b.id - a.id);

      setProjects(projectMap);
      setProjectOptions(options);
    } catch (err) {
      console.error("Failed to load data", err);
      alert("Failed to load feedback or projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ apply project focus (URL/state) once
  useEffect(() => {
    if (focusProjectId && projectFilter === "all" && Number.isFinite(focusProjectId)) {
      setProjectFilter(focusProjectId);
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusProjectId]);

  // ✅ apply status focus (URL/state) once
  useEffect(() => {
    if (
      (focusStatus === "pending" || focusStatus === "approved" || focusStatus === "rejected") &&
      statusFilter === "all"
    ) {
      setStatusFilter(focusStatus);
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusStatus]);

  // Apply filters
  useEffect(() => {
    let filtered = feedbacks;

    if (statusFilter !== "all") {
      filtered = filtered.filter((f) => f.status === statusFilter);
    }

    if (projectFilter !== "all") {
      filtered = filtered.filter((f) => f.project_id === projectFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.message.toLowerCase().includes(term) ||
          (f.name && f.name.toLowerCase().includes(term)) ||
          (f.email && f.email.toLowerCase().includes(term)) ||
          (projects[f.project_id]?.toLowerCase().includes(term))
      );
    }

    setFilteredFeedbacks(filtered);
    setCurrentPage(1);
  }, [feedbacks, searchTerm, statusFilter, projects, projectFilter]);

  const totalPages = Math.ceil(filteredFeedbacks.length / itemsPerPage);
  const paginated = filteredFeedbacks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleStatusUpdate = async (id: number, newStatus: "approved" | "rejected") => {
    setUpdatingId(id);
    try {
      await api.patch(`/feedback/${id}/status`, { status: newStatus });
      setFeedbacks(feedbacks.map((f) => (f.id === id ? { ...f, status: newStatus } : f)));
      alert(`Feedback ${newStatus} successfully!`);
    } catch (err) {
      alert("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const clearFocus = () => {
    setProjectFilter("all");
    setStatusFilter("all");
  };

  if (loading) {
    return <div className="p-20 text-center text-xl text-slate-600">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Citizen Feedback</h1>
          <p className="text-slate-600 mt-2">Review and moderate public observations</p>

          {(projectFilter !== "all" || statusFilter !== "all") && (
            <p className="text-sm text-sky-700 mt-2">
              Focus mode applied{" "}
              <button onClick={clearFocus} className="ml-2 underline text-sky-600 hover:text-sky-800">
                Clear
              </button>
            </p>
          )}
        </div>

        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition"
        >
          <RefreshCcw size={18} />
          Refresh
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by message, name, email, or project title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <select
            value={projectFilter === "all" ? "all" : String(projectFilter)}
            onChange={(e) => setProjectFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="px-6 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All Projects</option>
            {projectOptions.map((p) => (
              <option key={p.id} value={String(p.id)}>
                #{p.id} — {p.title}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-6 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200">
        <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-900">
            All Submissions ({filteredFeedbacks.length})
          </h2>
        </div>

        {paginated.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No feedback matches your filters.</div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {paginated.map((fb) => (
                <div key={fb.id} className="p-8 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            fb.status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : fb.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {fb.status.toUpperCase()}
                        </span>

                        <span className="text-sm text-slate-500">
                          <strong>{projects[fb.project_id] || "Unknown Project"}</strong> (ID: {fb.project_id}) •{" "}
                          {new Date(fb.created_at).toLocaleDateString()}
                        </span>

                        <a
                          href={`/projects/${fb.project_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-800 underline"
                        >
                          View
                          <ExternalLink size={14} />
                        </a>
                      </div>

                      <p className="text-slate-800 leading-relaxed mb-4">{fb.message}</p>

                      <div className="text-sm text-slate-600">
                        {fb.name ? <span>From: {fb.name}</span> : <span>Anonymous</span>}
                        {fb.email && <span className="ml-4">Email: {fb.email}</span>}
                      </div>
                    </div>

                    <div className="ml-8 flex items-center gap-3">
                      <button
                        onClick={() => handleStatusUpdate(fb.id, "approved")}
                        disabled={updatingId === fb.id || fb.status === "approved"}
                        className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
                      >
                        {updatingId === fb.id ? "..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(fb.id, "rejected")}
                        disabled={updatingId === fb.id || fb.status === "rejected"}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
                      >
                        {updatingId === fb.id ? "..." : "Reject"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-8 py-4 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredFeedbacks.length)} of {filteredFeedbacks.length}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="px-4 py-2 text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

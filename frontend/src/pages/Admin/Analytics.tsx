// frontend/src/pages/Admin/Analytics.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/client";
import {
  ShieldAlert,
  AlertTriangle,
  Wallet,
  MessageSquareWarning,
  Search,
  RefreshCcw,
  Pencil,
  ExternalLink,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type ProjectStatus = "Planned" | "Ongoing" | "Completed" | "Flagged";

type Project = {
  id: number;
  title: string;

  category?: string | null;
  status: ProjectStatus;

  budget: number;
  amount_spent?: number | null; // backend uses amount_spent in your system
  spent?: number | null; // (just in case some endpoints return spent)
  progress?: number | null;

  start_date?: string | null;
  completion_date?: string | null;
  last_updated?: string | null;

  constituency_code?: string | null;
  constituency_name?: string;
  county?: string;
  mp_name?: string;
};

type Constituency = {
  code: string;
  name: string;
  county: string;
  mp_name: string;
  pas_score?: number | null;
};

type Feedback = {
  id: number;
  project_id: number;
  status: "pending" | "approved" | "rejected";
  created_at?: string | null;
};

const formatMoney = (v: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(v || 0);



function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pct(n?: number | null) {
  if (n == null || !Number.isFinite(n)) return 0;
  return clamp(n, 0, 100);
}

function getSpent(p: Project) {
  // backend sometimes returns amount_spent; your older UI uses spent
  const a = p.amount_spent ?? null;
  const s = p.spent ?? null;
  return Number(a ?? s ?? 0);
}

function isPastDue(completion_date?: string | null) {
  if (!completion_date) return false;
  const t = new Date(completion_date).getTime();
  if (!Number.isFinite(t)) return false;
  return t < Date.now();
}

/**
 * Risk score: 0..100-ish (we keep it interpretable)
 * Signals:
 * - overspend ratio (spent > budget)
 * - spend vs progress gap (spent% - progress%)
 * - overdue but not completed
 * - already flagged status
 */
function computeRiskScore(p: Project) {
  const budget = Number(p.budget || 0);
  const spent = getSpent(p);
  const progress = pct(p.progress);

  const overspendRatio = budget > 0 ? spent / budget : 0; // >1 = overspend
  const spentPct = budget > 0 ? (spent / budget) * 100 : 0;

  const spendProgressGap = Math.max(0, spentPct - progress); // only penalize if spent% > progress%
  const overduePenalty = isPastDue(p.completion_date) && p.status !== "Completed" ? 20 : 0;
  const flaggedBonus = p.status === "Flagged" ? 15 : 0;

  // weights: tuned for “demo clarity”
  const score =
    Math.min(40, overspendRatio * 40) + // 0..40
    Math.min(40, spendProgressGap * 0.6) + // 0..40
    overduePenalty + // 0 or 20
    flaggedBonus; // 0 or 15

  return Math.round(clamp(score, 0, 100));
}

function StatCard({
  title,
  value,
  icon,
  hint,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-wide text-slate-500 uppercase">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
          {hint ? <p className="text-xs text-slate-500 mt-2">{hint}</p> : null}
        </div>
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "All">("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [constituencyFilter, setConstituencyFilter] = useState<string>("All");
  const [minRisk, setMinRisk] = useState<number>(0);

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 12;

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, cRes, fRes] = await Promise.all([
        api.get("/projects/"),
        api.get("/constituencies/"),
        api.get("/feedback/"),
      ]);

      setProjects(Array.isArray(pRes.data) ? pRes.data : []);
      setConstituencies(Array.isArray(cRes.data) ? cRes.data : []);
      setFeedback(Array.isArray(fRes.data) ? fRes.data : []);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || "Failed to load Risk Center data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // KPI values
  const kpis = useMemo(() => {
    const totalProjects = projects.length;
    const flagged = projects.filter((p) => p.status === "Flagged").length;

    const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
    const totalSpent = projects.reduce((s, p) => s + getSpent(p), 0);

    const pendingFeedback = feedback.filter((f) => f.status === "pending").length;

    return { totalProjects, flagged, totalBudget, totalSpent, pendingFeedback };
  }, [projects, feedback]);

  // Build category list from projects
  const categories = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      const c = (p.category ?? "Unknown").trim();
      if (c) set.add(c);
    });
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [projects]);

  // Projects with risk score attached
  const projectsWithRisk = useMemo(() => {
    return projects.map((p) => ({
      ...p,
      risk_score: computeRiskScore(p),
      spent_value: getSpent(p),
      progress_value: pct(p.progress),
      category_value: (p.category ?? "Unknown").trim() || "Unknown",
      constituency_name_value: p.constituency_name ?? p.constituency_code ?? "—",
    }));
  }, [projects]);

  // Filtered + sorted by risk desc
  const filtered = useMemo(() => {
    let list = [...projectsWithRisk];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((p) => {
        const hay = [
          p.title,
          p.status,
          p.category_value,
          p.constituency_name_value,
          p.mp_name || "",
          String(p.id),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(term);
      });
    }

    if (statusFilter !== "All") {
      list = list.filter((p) => p.status === statusFilter);
    }

    if (categoryFilter !== "All") {
      list = list.filter((p) => p.category_value === categoryFilter);
    }

    if (constituencyFilter !== "All") {
      list = list.filter(
        (p) =>
          (p.constituency_code || "") === constituencyFilter ||
          (p.constituency_name || "") === constituencyFilter
      );
    }

    list = list.filter((p) => (p as any).risk_score >= minRisk);

    // highest risk first
    list.sort((a: any, b: any) => b.risk_score - a.risk_score);
    return list;
  }, [projectsWithRisk, searchTerm, statusFilter, categoryFilter, constituencyFilter, minRisk]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    // reset page when filters change
    setPage(1);
  }, [searchTerm, statusFilter, categoryFilter, constituencyFilter, minRisk]);

  // PAS leaderboard
  const pasLeaderboard = useMemo(() => {
    const countByCode = new Map<string, number>();
    projects.forEach((p) => {
      const code = p.constituency_code || "";
      if (!code) return;
      countByCode.set(code, (countByCode.get(code) ?? 0) + 1);
    });

    return [...constituencies]
      .map((c) => ({
        ...c,
        pas: Math.round(c.pas_score ?? 0),
        project_count: countByCode.get(c.code) ?? 0,
      }))
      .sort((a, b) => b.pas - a.pas);
  }, [constituencies, projects]);

  // Charts
  const statusSpendChart = useMemo(() => {
    const statuses: ProjectStatus[] = ["Planned", "Ongoing", "Flagged", "Completed"];
    return statuses.map((s) => {
      const subset = projects.filter((p) => p.status === s);
      const budget = subset.reduce((sum, p) => sum + (p.budget || 0), 0);
      const spent = subset.reduce((sum, p) => sum + getSpent(p), 0);
      return { status: s, budget, spent };
    });
  }, [projects]);

  const categoryChart = useMemo(() => {
    const m = new Map<string, number>();
    projects.forEach((p) => {
      const k = (p.category ?? "Unknown").trim() || "Unknown";
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return [...m.entries()].map(([name, count]) => ({ name, count }));
  }, [projects]);

  // Feedback count per project (for “Open Feedback” clarity)
  const feedbackCountByProject = useMemo(() => {
    const m = new Map<number, { total: number; pending: number }>();
    feedback.forEach((f) => {
      const cur = m.get(f.project_id) ?? { total: 0, pending: 0 };
      cur.total += 1;
      if (f.status === "pending") cur.pending += 1;
      m.set(f.project_id, cur);
    });
    return m;
  }, [feedback]);

  // Drill-down actions
  const goToFeedback = (projectId: number) => {
    // We pass state so even if AdminFeedback has no URL parsing,
    // you can easily add it later without breaking navigation.
   navigate("/admin/feedback", { state: { focusProjectId: projectId, focusStatus: "pending" } });
  };

  if (loading) {
    return (
      <div className="p-20 text-center">
        <p className="text-xl text-slate-600">Loading Risk Center...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-md border border-red-200 p-6">
          <h1 className="text-2xl font-bold text-slate-900">Risk Center</h1>
          <p className="text-red-600 mt-2">{error}</p>
          <button
            onClick={loadAll}
            className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition"
          >
            <RefreshCcw size={18} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <ShieldAlert className="w-10 h-10 text-sky-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Risk Center</h1>
            <p className="text-slate-600 mt-1">
              Operational view: risk signals, PAS ranking, and moderation workload.
            </p>
          </div>
        </div>

        <button
          onClick={loadAll}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition"
        >
          <RefreshCcw size={18} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard title="Total Projects" value={String(kpis.totalProjects)} icon={<ShieldAlert size={18} />} />
        <StatCard
          title="Flagged Projects"
          value={String(kpis.flagged)}
          icon={<AlertTriangle size={18} />}
          hint="Needs admin attention"
        />
        <StatCard title="Total Budget" value={formatMoney(kpis.totalBudget)} icon={<Wallet size={18} />} />
        <StatCard title="Total Spent" value={formatMoney(kpis.totalSpent)} icon={<Wallet size={18} />} />
        <StatCard
          title="Feedback Pending"
          value={String(kpis.pendingFeedback)}
          icon={<MessageSquareWarning size={18} />}
          hint="Moderation queue"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative w-full md:w-[380px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search project / constituency / MP / ID..."
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
          />
        </div>

        <select
          value={constituencyFilter}
          onChange={(e) => setConstituencyFilter(e.target.value)}
          className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
        >
          <option value="All">All Constituencies</option>
          {constituencies
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.county})
              </option>
            ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
        >
          <option value="All">All Status</option>
          <option value="Planned">Planned</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Flagged">Flagged</option>
          <option value="Completed">Completed</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "All" ? "All Categories" : c}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Min Risk</label>
          <input
            type="range"
            min={0}
            max={100}
            value={minRisk}
            onChange={(e) => setMinRisk(Number(e.target.value))}
            className="w-44"
          />
          <span className="text-sm font-semibold text-slate-900 w-10">{minRisk}</span>
        </div>

        <div className="flex-1" />

        <div className="text-sm text-slate-600">
          Showing <span className="font-semibold text-slate-900">{filtered.length}</span> results
        </div>
      </div>

      {/* Top Risk Projects */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            Top Risk Projects ({filtered.length})
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Scored by overspend + spend/progress gap + overdue + flagged status. Use actions to jump straight into review.
          </p>
        </div>

        {paginated.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No projects match your filters.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <Th>Risk</Th>
                    <Th>ID</Th>
                    <Th>Project</Th>
                    <Th>Constituency</Th>
                    <Th>Status</Th>
                    <Th>Budget</Th>
                    <Th>Spent</Th>
                    <Th>Progress</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginated.map((p: any) => {
                    const spentPct = p.budget > 0 ? (p.spent_value / p.budget) * 100 : 0;
                    const gap = Math.max(0, Math.round(spentPct - p.progress_value));

                    const fb = feedbackCountByProject.get(p.id) ?? { total: 0, pending: 0 };

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <Td>
                          <span
                            className={`px-3 py-1 text-xs font-bold rounded-full ${
                              p.risk_score >= 70
                                ? "bg-red-100 text-red-800"
                                : p.risk_score >= 40
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                            title={`Risk score: ${p.risk_score}`}
                          >
                            {p.risk_score}
                          </span>
                        </Td>

                        <Td className="text-slate-700 font-medium">#{p.id}</Td>

                        <Td className="font-medium text-slate-900">
                          <div>{p.title}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            MP: {p.mp_name ? `Hon. ${p.mp_name}` : "—"} • Gap: {gap}%
                          </div>
                        </Td>

                        <Td>{p.constituency_name_value}</Td>

                        <Td>
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full ${
                              p.status === "Completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : p.status === "Flagged"
                                ? "bg-red-100 text-red-800"
                                : p.status === "Planned"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {p.status}
                          </span>
                        </Td>

                        <Td>{formatMoney(p.budget)}</Td>
                        <Td>{formatMoney(p.spent_value)}</Td>
                        <Td className="text-slate-700 font-medium">{p.progress_value}%</Td>

                        <Td>
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Edit Project (Admin) */}
                            <Link
                              to={`/admin/projects/${p.id}`}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition"
                              title="Open admin edit page"
                            >
                              <Pencil size={16} />
                              Edit
                            </Link>

                            {/* View Project (Public) */}
                            <Link
                              to={`/projects/${p.id}`}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition"
                              title="View public project page"
                            >
                              <ExternalLink size={16} />
                              View
                            </Link>

                            {/* Open Feedback (Admin) */}
                            <button
                              onClick={() => goToFeedback(p.id)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition"
                              title="Open feedback moderation filtered to this project (we’ll wire filtering next)"
                            >
                              <MessageSquare size={16} />
                              Feedback
                              <span className="ml-1 text-xs text-slate-500">
                                ({fb.pending}/{fb.total})
                              </span>
                            </button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pager
              page={page}
              setPage={setPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              perPage={perPage}
            />
          </>
        )}
      </div>

      {/* Bottom: PAS + Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* PAS Leaderboard */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">PAS Leaderboard</h2>
            <p className="text-sm text-slate-600 mt-1">Top constituencies by Project Accountability Score (PAS).</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <Th>Rank</Th>
                  <Th>Constituency</Th>
                  <Th>County</Th>
                  <Th>PAS</Th>
                  <Th>Projects</Th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {pasLeaderboard.slice(0, 10).map((c, idx) => (
                  <tr key={c.code} className="hover:bg-slate-50 transition">
                    <Td className="font-medium text-slate-700">{idx + 1}</Td>
                    <Td className="font-medium text-slate-900">
                      <div>{c.name}</div>
                      <div className="text-xs text-slate-500 mt-1">MP: Hon. {c.mp_name}</div>
                    </Td>
                    <Td>{c.county}</Td>
                    <Td className="font-bold text-emerald-700">{c.pas}</Td>
                    <Td className="font-medium text-slate-700">{c.project_count}</Td>
                  </tr>
                ))}
                {pasLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-500">
                      No constituency data found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Budget vs Spent by Status</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusSpendChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="budget" />
                  <Bar dataKey="spent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Projects by Category</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Next: we can add a chart toggle for “risk only” vs “all”.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- UI helpers (same style as Management) ---------- */

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-4 text-sm text-slate-600 ${className}`}>{children}</td>;
}

function Pager({
  page,
  setPage,
  totalPages,
  totalItems,
  perPage,
}: {
  page: number;
  setPage: (n: number) => void;
  totalPages: number;
  totalItems: number;
  perPage: number;
}) {
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, totalItems);

  return (
    <div className="px-8 py-4 border-t border-slate-200 flex items-center justify-between">
      <p className="text-sm text-slate-600">
        Showing {totalItems === 0 ? 0 : start} to {totalItems === 0 ? 0 : end} of {totalItems}
      </p>

      <div className="flex gap-2 items-center">
        <button
          onClick={() => setPage(Math.max(page - 1, 1))}
          disabled={page === 1}
          className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition"
        >
          <ChevronLeft size={18} />
        </button>

        <span className="px-4 py-2 text-sm font-medium">
          Page {page} of {totalPages}
        </span>

        <button
          onClick={() => setPage(Math.min(page + 1, totalPages))}
          disabled={page === totalPages}
          className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

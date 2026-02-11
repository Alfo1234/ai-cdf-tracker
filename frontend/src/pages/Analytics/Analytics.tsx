import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownToLine,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Flame,
  Info,
  LayoutGrid,
  Loader2,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Star,
  Table2,
  X,
} from "lucide-react";
import api from "../../api/client";

/**
 * --------------------------------------------
 * Helpers
 * --------------------------------------------
 */

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value || 0);

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const safeNum = (n: any) => (Number.isFinite(Number(n)) ? Number(n) : 0);

const avatarUrl = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "MP"
  )}&background=0ea5e9&color=ffffff&rounded=true&bold=true&size=128`;

/**
 * Risk scoring (internal logic).
 * UI messaging is simplified for citizens.
 */
function computeRiskScore(p: ProjectRow) {
  const budget = safeNum(p.budget);
  const spent = safeNum(p.spent);
  const progress = safeNum(p.progress);

  const overspendRatio = budget > 0 ? (spent - budget) / budget : 0;
  const utilization = budget > 0 ? spent / budget : 0;

  let score = 0;

  if (overspendRatio > 0) score += clamp(overspendRatio * 120, 10, 60);

  if (utilization >= 0.8 && progress <= 25) score += 25;
  if (utilization >= 1.0 && progress <= 50) score += 25;

  if (p.status === "Flagged") score += 35;

  if (p.status === "Completed" && utilization <= 1.05) score -= 20;

  return clamp(Math.round(score), 0, 100);
}

function computePerformanceScore(p: ProjectRow) {
  const budget = safeNum(p.budget);
  const spent = safeNum(p.spent);
  const progress = safeNum(p.progress);
  const utilization = budget > 0 ? spent / budget : 0;

  let score = 0;
  score += clamp(progress, 0, 100) * 0.55;

  if (utilization > 1.0) score -= clamp((utilization - 1) * 100, 5, 30);

  const alignment = Math.abs(utilization * 100 - progress);
  score += clamp(20 - alignment * 0.2, 0, 20);

  if (p.status === "Flagged") score -= 25;
  if (p.status === "Completed") score += 10;

  return clamp(Math.round(score), 0, 100);
}

function downloadCsv(filename: string, rows: Record<string, any>[]) {
  const keys = Object.keys(rows?.[0] || {});
  const escape = (v: any) => `"${String(v ?? "").replaceAll('"', '""')}"`;

  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => escape(r[k])).join(","))].join(
    "\n"
  );

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * --------------------------------------------
 * Types
 * --------------------------------------------
 */

type ProjectStatus = "Planned" | "Ongoing" | "Completed" | "Flagged" | string;

type ProjectRow = {
  id: number;
  title: string;
  constituency_name: string;
  mp_name: string;
  category: string;
  status: ProjectStatus;
  budget: number;
  spent: number;
  progress: number;
};

type Density = "comfortable" | "compact";

type SortKey =
  | "id"
  | "title"
  | "constituency"
  | "mp"
  | "category"
  | "status"
  | "budget"
  | "spent"
  | "utilization"
  | "progress"
  | "risk"
  | "score";

type SortDir = "asc" | "desc";

type ColumnKey =
  | "constituency"
  | "mp"
  | "category"
  | "status"
  | "budget"
  | "spent"
  | "utilization"
  | "progress"
  | "risk"
  | "score";

/**
 * --------------------------------------------
 * Component
 * --------------------------------------------
 */

const LS_KEY = "cdf_analytics_view_v1";

export default function Analytics() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [constituencyFilter, setConstituencyFilter] = useState("");
  const [mpFilter, setMpFilter] = useState("");

  const [minBudget, setMinBudget] = useState<number>(0);
  const [minProgress, setMinProgress] = useState<number>(0);
  const [riskOnly, setRiskOnly] = useState(false);

  const [density, setDensity] = useState<Density>("comfortable");

  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [columns, setColumns] = useState<Record<ColumnKey, boolean>>({
    constituency: true,
    mp: true,
    category: true,
    status: true,
    budget: true,
    spent: true,
    utilization: true,
    progress: true,
    risk: true,
    score: true,
  });

  const [showAdvanced, setShowAdvanced] = useState(true);
  const [showColumns, setShowColumns] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (!saved) return;
      const v = JSON.parse(saved);

      setSearchTerm(v.searchTerm ?? "");
      setCategoryFilter(v.categoryFilter ?? "");
      setStatusFilter(v.statusFilter ?? "");
      setConstituencyFilter(v.constituencyFilter ?? "");
      setMpFilter(v.mpFilter ?? "");
      setMinBudget(v.minBudget ?? 0);
      setMinProgress(v.minProgress ?? 0);
      setRiskOnly(v.riskOnly ?? false);

      setDensity(v.density ?? "comfortable");
      setSortKey(v.sortKey ?? "id");
      setSortDir(v.sortDir ?? "asc");

      if (v.columns) setColumns(v.columns);
      setShowAdvanced(v.showAdvanced ?? true);
      setShowColumns(v.showColumns ?? true);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const payload = {
      searchTerm,
      categoryFilter,
      statusFilter,
      constituencyFilter,
      mpFilter,
      minBudget,
      minProgress,
      riskOnly,
      density,
      sortKey,
      sortDir,
      columns,
      showAdvanced,
      showColumns,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  }, [
    searchTerm,
    categoryFilter,
    statusFilter,
    constituencyFilter,
    mpFilter,
    minBudget,
    minProgress,
    riskOnly,
    density,
    sortKey,
    sortDir,
    columns,
    showAdvanced,
    showColumns,
  ]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get("/projects/");
        setProjects(res.data || []);
      } catch (e) {
        console.error("Analytics fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const projectsWithMetrics = useMemo(() => {
    return (projects || []).map((p) => {
      const budget = safeNum(p.budget);
      const spent = safeNum((p as any).spent);
      const progress = safeNum((p as any).progress);

      const utilization = budget > 0 ? Math.round((spent / budget) * 100) : 0;

      const risk = computeRiskScore({
        ...p,
        budget,
        spent,
        progress,
      });

      const score = computePerformanceScore({
        ...p,
        budget,
        spent,
        progress,
      });

      return {
        ...p,
        budget,
        spent,
        progress,
        utilization,
        risk,
        score,
      };
    });
  }, [projects]);

  const filtered = useMemo(() => {
    let rows = [...projectsWithMetrics];

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      rows = rows.filter((p) => p.title.toLowerCase().includes(q));
    }

    if (categoryFilter) rows = rows.filter((p) => p.category === categoryFilter);
    if (statusFilter) rows = rows.filter((p) => p.status === statusFilter);
    if (constituencyFilter) rows = rows.filter((p) => p.constituency_name === constituencyFilter);
    if (mpFilter) rows = rows.filter((p) => p.mp_name === mpFilter);

    if (minBudget > 0) rows = rows.filter((p) => p.budget >= minBudget);
    if (minProgress > 0) rows = rows.filter((p) => p.progress >= minProgress);

    if (riskOnly) rows = rows.filter((p) => p.risk >= 40);

    return rows;
  }, [
    projectsWithMetrics,
    searchTerm,
    categoryFilter,
    statusFilter,
    constituencyFilter,
    mpFilter,
    minBudget,
    minProgress,
    riskOnly,
  ]);

  const sorted = useMemo(() => {
    const rows = [...filtered];

    const get = (p: any, k: SortKey) => {
      switch (k) {
        case "id":
          return safeNum(p.id);
        case "title":
          return (p.title || "").toLowerCase();
        case "constituency":
          return (p.constituency_name || "").toLowerCase();
        case "mp":
          return (p.mp_name || "").toLowerCase();
        case "category":
          return (p.category || "").toLowerCase();
        case "status":
          return (p.status || "").toLowerCase();
        case "budget":
          return safeNum(p.budget);
        case "spent":
          return safeNum(p.spent);
        case "utilization":
          return safeNum(p.utilization);
        case "progress":
          return safeNum(p.progress);
        case "risk":
          return safeNum(p.risk);
        case "score":
          return safeNum(p.score);
        default:
          return "";
      }
    };

    rows.sort((a, b) => {
      const av = get(a, sortKey);
      const bv = get(b, sortKey);

      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

    return rows;
  }, [filtered, sortKey, sortDir]);

  useEffect(
    () =>
      setPage(1),
    [searchTerm, categoryFilter, statusFilter, constituencyFilter, mpFilter, minBudget, minProgress, riskOnly]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const uniqueCategories = useMemo(
    () => Array.from(new Set(projectsWithMetrics.map((p) => p.category))).filter(Boolean).sort(),
    [projectsWithMetrics]
  );
  const uniqueStatuses = useMemo(
    () => Array.from(new Set(projectsWithMetrics.map((p) => p.status))).filter(Boolean).sort(),
    [projectsWithMetrics]
  );
  const uniqueConstituencies = useMemo(
    () => Array.from(new Set(projectsWithMetrics.map((p) => p.constituency_name))).filter(Boolean).sort(),
    [projectsWithMetrics]
  );
  const uniqueMps = useMemo(
    () => Array.from(new Set(projectsWithMetrics.map((p) => p.mp_name))).filter(Boolean).sort(),
    [projectsWithMetrics]
  );

  const snapshot = useMemo(() => {
    const total = filtered.length;
    const flagged = filtered.filter((p) => p.status === "Flagged").length;
    const completed = filtered.filter((p) => p.status === "Completed").length;

    const totalBudget = filtered.reduce((s, p) => s + safeNum(p.budget), 0);
    const totalSpent = filtered.reduce((s, p) => s + safeNum(p.spent), 0);

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const avgRisk = total > 0 ? Math.round(filtered.reduce((s, p) => s + safeNum(p.risk), 0) / total) : 0;
    const integrityProxy = clamp(100 - avgRisk, 0, 100);

    return {
      total,
      flagged,
      completed,
      totalBudget,
      totalSpent,
      completionRate,
      avgRisk,
      integrityProxy,
    };
  }, [filtered]);

  const topPerforming = useMemo(() => {
    return [...filtered].sort((a, b) => safeNum(b.score) - safeNum(a.score)).slice(0, 5);
  }, [filtered]);

  const highRisk = useMemo(() => {
    return [...filtered].sort((a, b) => safeNum(b.risk) - safeNum(a.risk)).slice(0, 5);
  }, [filtered]);

  const pasLeaderboard = useMemo(() => {
    const byMp: Record<
      string,
      { mp: string; constituency: string; total: number; flagged: number; avgRisk: number; pas: number }
    > = {};

    filtered.forEach((p) => {
      const key = p.mp_name || "Unknown MP";
      if (!byMp[key]) {
        byMp[key] = {
          mp: key,
          constituency: p.constituency_name || "—",
          total: 0,
          flagged: 0,
          avgRisk: 0,
          pas: 0,
        };
      }
      byMp[key].total += 1;
      if (p.status === "Flagged") byMp[key].flagged += 1;
      byMp[key].avgRisk += safeNum(p.risk);
    });

    const rows = Object.values(byMp).map((r) => {
      const avgRisk = r.total > 0 ? Math.round(r.avgRisk / r.total) : 0;
      const pas = clamp(Math.round(100 - avgRisk - r.flagged * 8), 0, 100);
      return { ...r, avgRisk, pas };
    });

    return rows.sort((a, b) => b.pas - a.pas);
  }, [filtered]);

  const goProjectAnalytics = (id: number) => {
    navigate(`/analytics/projects/${id}`);
  };

  const resetAll = () => {
    setSearchTerm("");
    setCategoryFilter("");
    setStatusFilter("");
    setConstituencyFilter("");
    setMpFilter("");
    setMinBudget(0);
    setMinProgress(0);
    setRiskOnly(false);

    setSortKey("id");
    setSortDir("asc");
    setDensity("comfortable");

    setColumns({
      constituency: true,
      mp: true,
      category: true,
      status: true,
      budget: true,
      spent: true,
      utilization: true,
      progress: true,
      risk: true,
      score: true,
    });

    setShowAdvanced(true);
    setShowColumns(true);
  };

  const exportCurrent = () => {
    const rows = sorted.map((p) => ({
      id: p.id,
      title: p.title,
      constituency: p.constituency_name,
      mp: p.mp_name,
      category: p.category,
      status: p.status,
      budget_kes: p.budget,
      spent_kes: p.spent,
      utilization_pct: p.utilization,
      progress_pct: p.progress,
      risk: p.risk,
      score: p.score,
    }));
    downloadCsv("cdf_analytics_export.csv", rows);
  };

  if (loading) {
    return <div className="p-8 text-center text-lg">Loading analytics…</div>;
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Public Analytics</h1>
        <p className="text-slate-600 mt-2">
          Quick overview of projects, spending, progress, and risk flags. Click any project to see detailed Analytics/Insights.
        </p>
      </div>

      {/* National Snapshot */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">National Snapshot</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCurrent}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium"
              title="Export current view"
            >
              <ArrowDownToLine className="w-4 h-4" />
              Export CSV
            </button>

            <button
              onClick={resetAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium"
              title="Reset filters, columns & sorting"
            >
              <X className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        <div className="px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            <SnapshotCard
              icon={<BarChart3 className="w-7 h-7" />}
              iconClass="bg-violet-100 text-violet-700"
              label="Total Projects"
              value={String(snapshot.total)}
              sub={`${snapshot.flagged} flagged`}
            />
            <SnapshotCard
              icon={<Table2 className="w-7 h-7" />}
              iconClass="bg-sky-100 text-sky-700"
              label="Total Budget"
              value={formatCurrency(snapshot.totalBudget)}
              sub="Allocated"
            />
            <SnapshotCard
              icon={<LayoutGrid className="w-7 h-7" />}
              iconClass="bg-emerald-100 text-emerald-700"
              label="Total Spent"
              value={formatCurrency(snapshot.totalSpent)}
              sub={`${
                snapshot.totalBudget > 0 ? Math.round((snapshot.totalSpent / snapshot.totalBudget) * 100) : 0
              }% of budget`}
            />
            <SnapshotCard
              icon={<CheckCircle2 className="w-7 h-7" />}
              iconClass="bg-amber-100 text-amber-700"
              label="Completion Rate"
              value={`${snapshot.completionRate}%`}
              sub={`${snapshot.completed} completed`}
            />
            <SnapshotCard
              icon={<ShieldAlert className="w-7 h-7" />}
              iconClass="bg-rose-100 text-rose-700"
              label="Integrity Score"
              value={`${snapshot.integrityProxy}/100`}
              sub={`${snapshot.avgRisk} avg risk`}
            />
          </div>

          {/* Citizen-friendly banners */}
          <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
            <GradientNote
              title="Understanding risk"
              icon={<Info className="w-5 h-5" />}
              body="Risk highlights projects that may need follow-up. Look for overspending, delays, or “Flagged” status."
            />
            <GradientNote
              title="PAS leaderboard"
              icon={<Star className="w-5 h-5" />}
              body="PAS is a simple summary score to compare overall project performance by MP/constituency."
            />
            <GradientNote
              title="Project insights"
              icon={<Flame className="w-5 h-5" />}
              body="Open any project to see spending, progress, timeline, and key warnings in one place."
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Filter className="w-6 h-6 text-slate-600" />
            <h3 className="text-lg font-semibold">Filters</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDensity(density === "comfortable" ? "compact" : "comfortable")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium"
              title="Toggle table density"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Density: {density === "comfortable" ? "Comfortable" : "Compact"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search project title…"
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Statuses</option>
            {uniqueStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={constituencyFilter}
            onChange={(e) => setConstituencyFilter(e.target.value)}
            className="px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Constituencies</option>
            {uniqueConstituencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={mpFilter}
            onChange={(e) => setMpFilter(e.target.value)}
            className="px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 xl:col-span-2"
          >
            <option value="">All MPs</option>
            {uniqueMps.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-3 xl:col-span-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-600">Minimum Budget (KES)</label>
              <input
                type="number"
                value={minBudget}
                onChange={(e) => setMinBudget(Math.max(0, Number(e.target.value)))}
                className="mt-1 w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-600">Minimum Progress (%)</label>
              <input
                type="number"
                value={minProgress}
                onChange={(e) => setMinProgress(clamp(Number(e.target.value), 0, 100))}
                className="mt-1 w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <label className="flex items-center gap-3 mt-6 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 select-none">
              <input
                type="checkbox"
                checked={riskOnly}
                onChange={(e) => setRiskOnly(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-slate-700">Show medium/high risk only (risk ≥ 40)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Top & Flagged */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="w-6 h-6 text-amber-600" />
              <h3 className="text-lg font-semibold">Top Performing Projects</h3>
            </div>
            <span className="text-sm text-slate-500">Top 5</span>
          </div>

          <div className="divide-y divide-slate-100">
            {topPerforming.map((p) => (
              <ProjectListRow
                key={p.id}
                title={p.title}
                badgeLeft={p.category}
                badgeLeftVariant="category"
                badgeMid={p.status}
                badgeMidVariant={
                  p.status === "Completed"
                    ? "ok"
                    : p.status === "Ongoing"
                    ? "warn"
                    : p.status === "Flagged"
                    ? "danger"
                    : "neutral"
                }
                meta={`${p.constituency_name}  •  ${p.mp_name}`}
                rightPill={`${p.score}/100`}
                rightPillVariant="good"
                onView={() => goProjectAnalytics(p.id)}
              />
            ))}

            {topPerforming.length === 0 && (
              <div className="px-8 py-6 text-slate-600">No results match the current filters.</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold">High-Risk / Flagged Projects</h3>
            </div>
            <span className="text-sm text-slate-500">Top 5</span>
          </div>

          <div className="divide-y divide-slate-100">
            {highRisk.map((p) => (
              <ProjectListRow
                key={p.id}
                title={p.title}
                badgeLeft={p.category}
                badgeLeftVariant="category"
                badgeMid={p.status}
                badgeMidVariant={p.status === "Flagged" ? "danger" : "warn"}
                meta={`${p.constituency_name}  •  ${p.mp_name}`}
                rightPill={`${p.risk}/100`}
                rightPillVariant={p.risk >= 70 ? "danger" : p.risk >= 40 ? "warn" : "neutral"}
                onView={() => goProjectAnalytics(p.id)}
              />
            ))}

            {highRisk.length === 0 && (
              <div className="px-8 py-6 text-slate-600">No results match the current filters.</div>
            )}
          </div>
        </div>
      </div>

      {/* PAS Leaderboard */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Star className="w-6 h-6 text-sky-600" />
            <h2 className="text-xl font-semibold text-slate-900">MP PAS Leaderboard</h2>
          </div>
          <span className="text-sm text-slate-500">Score out of 100</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs font-medium text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-8 py-4 text-left">MP</th>
                <th className="px-8 py-4 text-left">Constituency</th>
                <th className="px-8 py-4 text-left">Projects</th>
                <th className="px-8 py-4 text-left">Flagged</th>
                <th className="px-8 py-4 text-left">Avg Risk</th>
                <th className="px-8 py-4 text-left">PAS</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {pasLeaderboard.map((r) => (
                <tr key={r.mp} className="hover:bg-slate-50 transition">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <img
                        src={avatarUrl(r.mp)}
                        alt={r.mp}
                        className="w-10 h-10 rounded-full border border-slate-200 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{r.mp}</p>
                        <p className="text-xs text-slate-500">Public score</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-slate-700">{r.constituency}</td>
                  <td className="px-8 py-5 text-slate-700 font-medium">{r.total}</td>
                  <td className="px-8 py-5">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full ring-1 ring-inset ${
                        r.flagged > 0
                          ? "bg-rose-100 text-rose-800 ring-rose-200"
                          : "bg-emerald-100 text-emerald-800 ring-emerald-200"
                      }`}
                    >
                      {r.flagged > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      {r.flagged}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-slate-700">{r.avgRisk}</td>
                  <td className="px-8 py-5">
                    <span
                      className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-full ring-1 ring-inset ${
                        r.pas >= 80
                          ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
                          : r.pas >= 60
                          ? "bg-amber-100 text-amber-800 ring-amber-200"
                          : "bg-rose-100 text-rose-800 ring-rose-200"
                      }`}
                    >
                      <Star className="w-4 h-4" />
                      {r.pas}/100
                    </span>
                  </td>
                </tr>
              ))}

              {pasLeaderboard.length === 0 && (
                <tr>
                  <td className="px-8 py-6 text-slate-600" colSpan={6}>
                    No results match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Analytics Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Results ({sorted.length})</h2>
            <p className="text-sm text-slate-600 mt-1">Use filters to narrow down projects.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Sort:</span>
              <select
                value={`${sortKey}:${sortDir}`}
                onChange={(e) => {
                  const [k, d] = e.target.value.split(":");
                  setSortKey(k as SortKey);
                  setSortDir(d as SortDir);
                }}
                className="px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
              >
                <option value="id:asc">ID (asc)</option>
                <option value="id:desc">ID (desc)</option>
                <option value="title:asc">Title (A→Z)</option>
                <option value="title:desc">Title (Z→A)</option>
                <option value="budget:desc">Budget (high→low)</option>
                <option value="budget:asc">Budget (low→high)</option>
                <option value="spent:desc">Spent (high→low)</option>
                <option value="spent:asc">Spent (low→high)</option>
                <option value="progress:desc">Progress (high→low)</option>
                <option value="progress:asc">Progress (low→high)</option>
                <option value="risk:desc">Risk (high→low)</option>
                <option value="risk:asc">Risk (low→high)</option>
                <option value="score:desc">Score (high→low)</option>
                <option value="score:asc">Score (low→high)</option>
              </select>
            </div>

            <button
              onClick={() => setShowAdvanced((s) => !s)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Advanced Panels
              <ChevronDown className={`w-4 h-4 transition ${showAdvanced ? "rotate-180" : ""}`} />
            </button>

            <button
              onClick={() => setShowColumns((s) => !s)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium"
            >
              <Table2 className="w-4 h-4" />
              Columns
              <ChevronDown className={`w-4 h-4 transition ${showColumns ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {(showAdvanced || showColumns) && (
          <div className="px-8 py-6 border-b border-slate-200">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {showAdvanced && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <h4 className="font-semibold text-slate-900">Advanced Filters</h4>
                  <p className="text-sm text-slate-600 mt-1">Use these to narrow results further.</p>

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Minimum Budget (KES)</label>
                      <input
                        type="number"
                        value={minBudget}
                        onChange={(e) => setMinBudget(Math.max(0, Number(e.target.value)))}
                        className="mt-1 w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600">Minimum Progress (%)</label>
                      <input
                        type="number"
                        value={minProgress}
                        onChange={(e) => setMinProgress(clamp(Number(e.target.value), 0, 100))}
                        className="mt-1 w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                      />
                    </div>
                  </div>

                  <label className="mt-4 flex items-center gap-3 select-none">
                    <input
                      type="checkbox"
                      checked={riskOnly}
                      onChange={(e) => setRiskOnly(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-700">Show medium/high risk only (risk ≥ 40)</span>
                  </label>
                </div>
              )}

              {showColumns && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <h4 className="font-semibold text-slate-900">Table Columns</h4>
                  <p className="text-sm text-slate-600 mt-1">Show or hide columns.</p>

                  <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.keys(columns).map((k) => {
                      const key = k as ColumnKey;
                      return (
                        <label key={key} className="flex items-center gap-3 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={columns[key]}
                            onChange={(e) => setColumns((prev) => ({ ...prev, [key]: e.target.checked }))}
                            className="w-4 h-4"
                          />
                          <span className="capitalize">{key}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <button
                      onClick={() =>
                        setColumns((p) =>
                          Object.fromEntries(Object.keys(p).map((k) => [k, true])) as any
                        )
                      }
                      className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium"
                    >
                      Show All
                    </button>

                    <button
                      onClick={() =>
                        setColumns((p) => ({
                          ...p,
                          risk: true,
                          score: true,
                          progress: true,
                          spent: true,
                          utilization: true,
                          budget: true,
                          constituency: false,
                          mp: false,
                          category: false,
                          status: true,
                        }))
                      }
                      className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium"
                    >
                      Focus Risk
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs font-medium text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-8 py-4 text-left">Project</th>
                {columns.constituency && <th className="px-8 py-4 text-left">Constituency</th>}
                {columns.mp && <th className="px-8 py-4 text-left">MP</th>}
                {columns.category && <th className="px-8 py-4 text-left">Category</th>}
                {columns.status && <th className="px-8 py-4 text-left">Status</th>}
                {columns.budget && <th className="px-8 py-4 text-left">Budget</th>}
                {columns.spent && <th className="px-8 py-4 text-left">Spent</th>}
                {columns.utilization && <th className="px-8 py-4 text-left">Utilization</th>}
                {columns.progress && <th className="px-8 py-4 text-left">Progress</th>}
                {columns.risk && <th className="px-8 py-4 text-left">Risk</th>}
                {columns.score && <th className="px-8 py-4 text-left">Score</th>}
                <th className="px-8 py-4 text-left">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {pageRows.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition">
                  <td className={`px-8 ${density === "compact" ? "py-3" : "py-5"} font-medium text-slate-900`}>
                    {p.title}
                  </td>

                  {columns.constituency && (
                    <td className={`px-8 ${density === "compact" ? "py-3" : "py-5"} text-slate-700 font-medium`}>
                      {p.constituency_name}
                    </td>
                  )}

                  {columns.mp && (
                    <td className={`px-8 ${density === "compact" ? "py-3" : "py-5"} text-slate-600`}>
                      <div className="flex items-center gap-3">
                        <img src={avatarUrl(p.mp_name)} alt={p.mp_name} className="w-8 h-8 rounded-full border border-slate-200" />
                        <span className="truncate">{p.mp_name}</span>
                      </div>
                    </td>
                  )}

                  {columns.category && (
                    <td className={`px-8 ${density === "compact" ? "py-3" : "py-5"}`}>
                      <span className="px-4 py-1.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                        {p.category}
                      </span>
                    </td>
                  )}

                  {columns.status && (
                    <td className={`px-8 ${density === "compact" ? "py-3" : "py-5"}`}>
                      <span
                        className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-full ring-1 ring-inset ${
                          p.status === "Completed"
                            ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
                            : p.status === "Ongoing"
                            ? "bg-amber-100 text-amber-800 ring-amber-200"
                            : p.status === "Flagged"
                            ? "bg-rose-100 text-rose-800 ring-rose-200"
                            : "bg-slate-100 text-slate-800 ring-slate-200"
                        }`}
                      >
                        {p.status === "Completed" ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : p.status === "Ongoing" ? (
                          <Loader2 className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                        {p.status}
                      </span>
                    </td>
                  )}

                  {columns.budget && (
                    <td className={`px-8 ${density === "compact" ? "py-3" : "py-5"} font-medium text-slate-700`}>
                      {formatCurrency(p.budget)}
                    </td>
                  )}

                  {columns.spent && (
                    <td className={`px-8 ${density === "compact" ? "py-3" : "py-5"} font-medium text-slate-700`}>
                      {formatCurrency(p.spent)}
                    </td>
                  )}

                  {columns.utilization && (
                    <td className={`px-8 ${density === "compact" ? "py-3" : "py-5"} text-slate-700`}>
                      {p.utilization}%
                    </td>
                  )}

                  {columns.progress && (
                    <td className={`px-8 ${density === "compact" ? "py-3" : "py-5"}`}>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-slate-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-700 ${
                              p.status === "Completed"
                                ? "bg-emerald-500"
                                : p.status === "Ongoing"
                                ? "bg-amber-500"
                                : p.status === "Flagged"
                                ? "bg-rose-500"
                                : "bg-slate-500"
                            }`}
                            style={{ width: `${clamp(p.progress || 0, 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-12 text-right">{p.progress || 0}%</span>
                      </div>
                    </td>
                  )}

                  {columns.risk && (
                    <td className={`px-8 ${density === "compact" ? "py-3" : "py-5"}`}>
                      <span
                        className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-full ring-1 ring-inset ${
                          p.risk >= 70
                            ? "bg-rose-100 text-rose-800 ring-rose-200"
                            : p.risk >= 40
                            ? "bg-amber-100 text-amber-800 ring-amber-200"
                            : "bg-emerald-100 text-emerald-800 ring-emerald-200"
                        }`}
                      >
                        <ShieldAlert className="w-4 h-4" />
                        {p.risk}/100
                      </span>
                    </td>
                  )}

                  {columns.score && (
                    <td className={`px-8 ${density === "compact" ? "py-3" : "py-5"}`}>
                      <span className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-full ring-1 ring-inset bg-emerald-100 text-emerald-800 ring-emerald-200">
                        <Star className="w-4 h-4" />
                        {p.score}/100
                      </span>
                    </td>
                  )}

                  <td className={`px-8 ${density === "compact" ? "py-3" : "py-5"}`}>
                    <button
                      onClick={() => goProjectAnalytics(p.id)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                      View Details
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={20} className="px-8 py-10 text-slate-600">
                    No results match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-8 py-5 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, sorted.length)} of {sorted.length} projects
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="px-4 py-2 text-sm font-medium">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * --------------------------------------------
 * Small UI components
 * --------------------------------------------
 */

function SnapshotCard({
  icon,
  iconClass,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 hover:shadow-xl transition-all">
      <div className="flex items-center gap-5 min-w-0">
        <div className={`p-4 rounded-2xl ${iconClass}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-sm text-slate-600">{label}</p>
          <p className="text-2xl font-bold mt-1 text-slate-900 truncate">{value}</p>
          <p className="text-xs text-slate-500 mt-1">{sub}</p>
        </div>
      </div>
    </div>
  );
}

function GradientNote({
  title,
  icon,
  body,
}: {
  title: string;
  icon: React.ReactNode;
  body: string;
}) {
  return (
    <div
      className="rounded-2xl p-6 text-white shadow-lg border border-white/10"
      style={{
        background:
          "linear-gradient(135deg, rgba(99,102,241,1) 0%, rgba(168,85,247,1) 45%, rgba(34,211,238,1) 110%)",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-white/15">{icon}</div>
        <h4 className="font-semibold">{title}</h4>
      </div>
      <p className="text-sm text-white/90 mt-3 leading-relaxed">{body}</p>
    </div>
  );
}

function Badge({
  text,
  variant,
}: {
  text: string;
  variant: "category" | "ok" | "warn" | "danger" | "neutral";
}) {
  const cls =
    variant === "category"
      ? "bg-purple-100 text-purple-700"
      : variant === "ok"
      ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
      : variant === "warn"
      ? "bg-amber-100 text-amber-800 ring-amber-200"
      : variant === "danger"
      ? "bg-rose-100 text-rose-800 ring-rose-200"
      : "bg-slate-100 text-slate-800 ring-slate-200";

  return (
    <span className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-full ring-1 ring-inset ${cls}`}>
      {variant === "danger" ? <AlertTriangle className="w-4 h-4" /> : null}
      {text}
    </span>
  );
}

function RightPill({
  text,
  variant,
}: {
  text: string;
  variant: "good" | "warn" | "danger" | "neutral";
}) {
  const cls =
    variant === "good"
      ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
      : variant === "warn"
      ? "bg-amber-100 text-amber-800 ring-amber-200"
      : variant === "danger"
      ? "bg-rose-100 text-rose-800 ring-rose-200"
      : "bg-slate-100 text-slate-800 ring-slate-200";

  return (
    <span className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-full ring-1 ring-inset ${cls}`}>
      <ShieldAlert className="w-4 h-4" />
      {text}
    </span>
  );
}

function ProjectListRow({
  title,
  badgeLeft,
  badgeLeftVariant,
  badgeMid,
  badgeMidVariant,
  meta,
  rightPill,
  rightPillVariant,
  onView,
}: {
  title: string;
  badgeLeft: string;
  badgeLeftVariant: "category";
  badgeMid: string;
  badgeMidVariant: "ok" | "warn" | "danger" | "neutral";
  meta: string;
  rightPill: string;
  rightPillVariant: "good" | "warn" | "danger" | "neutral";
  onView: () => void;
}) {
  return (
    <div className="px-8 py-5 flex items-center justify-between gap-6">
      <div className="min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="font-semibold text-slate-900 truncate">{title}</p>
          <RightPill text={rightPill} variant={rightPillVariant} />
        </div>

        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <Badge text={badgeLeft} variant={badgeLeftVariant} />
          <Badge text={badgeMid} variant={badgeMidVariant} />
          <span className="text-sm text-slate-500">{meta}</span>
        </div>
      </div>

      <button
        onClick={onView}
        className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200"
      >
        View Details
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

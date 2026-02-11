// src/pages/Admin/Overview.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import {
  LayoutDashboard,
  MessageSquare,
  FolderKanban,
  ShieldAlert,
  AlertTriangle,
  Wallet,
  RefreshCcw,
  ExternalLink,
  Clock,
  ArrowRight,
} from "lucide-react";

type ProjectStatus = "Planned" | "Ongoing" | "Completed" | "Flagged";

interface Project {
  id: number;
  title: string;
  status: ProjectStatus;
  category?: string | null;

  budget: number;
  amount_spent?: number | null; // backend often uses amount_spent
  spent?: number | null; // fallback if some responses use spent
  progress?: number | null;

  constituency_name?: string;
  mp_name?: string;
  last_updated?: string | null;
}

interface Feedback {
  id: number;
  project_id: number;
  status: "pending" | "approved" | "rejected";
  created_at?: string | null;
}

const formatMoney = (v: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(v || 0);

function getSpent(p: Project) {
  const a = p.amount_spent ?? null;
  const s = p.spent ?? null;
  return Number(a ?? s ?? 0);
}

function isRecentlyEdited(lastUpdated?: string | null) {
  if (!lastUpdated) return false;
  const updatedDate = new Date(lastUpdated);
  const now = new Date();
  const hoursDiff = (now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60);
  return hoursDiff < 24;
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

function SectionCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-200 flex items-start justify-between gap-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-600 mt-1">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-8">{children}</div>
    </div>
  );
}

export default function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, fRes] = await Promise.all([api.get("/projects/"), api.get("/feedback/")]);
      setProjects(Array.isArray(pRes.data) ? pRes.data : []);
      setFeedbacks(Array.isArray(fRes.data) ? fRes.data : []);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || "Failed to load admin overview data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const kpis = useMemo(() => {
    const totalProjects = projects.length;
    const flagged = projects.filter((p) => p.status === "Flagged").length;

    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalSpent = projects.reduce((sum, p) => sum + getSpent(p), 0);

    const pendingFeedback = feedbacks.filter((f) => f.status === "pending").length;
    const approvedFeedback = feedbacks.filter((f) => f.status === "approved").length;

    return {
      totalProjects,
      flagged,
      totalBudget,
      totalSpent,
      pendingFeedback,
      approvedFeedback,
    };
  }, [projects, feedbacks]);

  const topFlagged = useMemo(() => {
    return projects
      .filter((p) => p.status === "Flagged")
      .slice()
      .sort((a, b) => b.id - a.id)
      .slice(0, 5);
  }, [projects]);

  const recentlyUpdated = useMemo(() => {
    return projects
      .slice()
      .sort((a, b) => {
        const ta = a.last_updated ? new Date(a.last_updated).getTime() : 0;
        const tb = b.last_updated ? new Date(b.last_updated).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 6);
  }, [projects]);

  const needsAttentionCount = kpis.flagged + kpis.pendingFeedback;

  if (loading) {
    return <div className="p-20 text-center text-xl text-slate-600">Loading admin overview...</div>;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-md border border-red-200 p-6">
          <h1 className="text-2xl font-bold text-slate-900">Admin Overview</h1>
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
          <LayoutDashboard className="w-10 h-10 text-sky-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Overview</h1>
            <p className="text-slate-600 mt-1">
              Quick visibility into projects, spending, and citizen reports.
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
        <StatCard
          title="Total Projects"
          value={String(kpis.totalProjects)}
          icon={<ShieldAlert size={18} />}
        />
        <StatCard
          title="Flagged Projects"
          value={String(kpis.flagged)}
          icon={<AlertTriangle size={18} />}
          hint="Requires review"
        />
        <StatCard title="Total Budget" value={formatMoney(kpis.totalBudget)} icon={<Wallet size={18} />} />
        <StatCard title="Total Spent" value={formatMoney(kpis.totalSpent)} icon={<Wallet size={18} />} />
        <StatCard
          title="Feedback Pending"
          value={String(kpis.pendingFeedback)}
          icon={<MessageSquare size={18} />}
          hint="Moderation queue"
        />
      </div>

      {/* Quick Actions */}
      <SectionCard
        title="Quick Actions"
        subtitle="Jump to the most common admin workflows."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <QuickAction
            title="Moderate Feedback"
            desc="Approve / reject citizen reports"
            icon={<MessageSquare size={18} />}
            to="/admin/feedback"
          />
          <QuickAction
            title="Management Hub"
            desc="Projects • Awards • Contractors"
            icon={<FolderKanban size={18} />}
            to="/admin/projects"
          />
          <QuickAction
            title="Risk Center"
            desc="Risk signals + PAS leaderboard"
            icon={<AlertTriangle size={18} />}
            to="/admin/analytics"
          />
          <a
            href="/"
            className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-900 hover:opacity-95 transition flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-semibold">Open Public Dashboard</p>
              <p className="text-xs text-white/70 mt-1">Citizen-facing view</p>
            </div>
            <ExternalLink size={18} />
          </a>
        </div>
      </SectionCard>

      {/* Needs Attention + Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Needs Attention */}
        <SectionCard
          title="Needs Attention"
          subtitle="Flagged projects and pending feedback that require action."
          action={
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full ${
                needsAttentionCount > 0
                  ? "bg-red-100 text-red-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {needsAttentionCount} items
            </span>
          }
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-700">
                Pending feedback:{" "}
                <span className="font-bold text-slate-900">{kpis.pendingFeedback}</span>
              </div>
              <Link
                to="/admin/feedback"
                className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-900"
              >
                Open Feedback <ArrowRight size={16} />
              </Link>
            </div>

            <div className="border-t border-slate-200 pt-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-700">
                  Flagged projects:{" "}
                  <span className="font-bold text-slate-900">{kpis.flagged}</span>
                </div>
                <Link
                  to="/admin/analytics"
                  className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-900"
                >
                  Open Risk Center <ArrowRight size={16} />
                </Link>
              </div>

              {topFlagged.length === 0 ? (
                <p className="text-sm text-slate-500 mt-4">No flagged projects right now.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {topFlagged.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          #{p.id} — {p.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {p.constituency_name || "—"} • {p.mp_name ? `Hon. ${p.mp_name}` : "—"}
                        </p>
                      </div>
                      <Link
                        to={`/admin/projects/${p.id}`}
                        className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition"
                      >
                        Review
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Recent Activity */}
        <SectionCard
          title="Recent Activity"
          subtitle="Latest project updates (based on last_updated)."
          action={
            <Link
              to="/admin/projects"
              className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-900"
            >
              Open Management <ArrowRight size={16} />
            </Link>
          }
        >
          {recentlyUpdated.length === 0 ? (
            <p className="text-sm text-slate-500">No projects found.</p>
          ) : (
            <div className="space-y-3">
              {recentlyUpdated.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      #{p.id} — {p.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-full ${
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

                      {isRecentlyEdited(p.last_updated) && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                          <Clock size={12} />
                          Updated &lt; 24h
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <Link
                      to={`/admin/projects/${p.id}`}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition"
                    >
                      Edit
                    </Link>
                    <Link
                      to={`/projects/${p.id}`}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition"
                    >
                      View
                      <ExternalLink size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function QuickAction({
  title,
  desc,
  icon,
  to,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="bg-white rounded-2xl shadow-md border border-slate-200 p-5 hover:bg-slate-50 transition flex items-center justify-between"
    >
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500 mt-1">{desc}</p>
      </div>
      <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-sky-700">
        {icon}
      </div>
    </Link>
  );
}

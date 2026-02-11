import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/client";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  ImageIcon,
  Info,
  Loader2,
  ShieldAlert,
  TrendingUp,
  Users,
  Building2,
  Layers,
  ScanSearch,
  Languages,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

/** -----------------------------
 * Site palette (matches Dashboard.tsx + UI)
 * ------------------------------ */
const COLORS = {
  sky: "#0ea5e9",
  emerald: "#10b981",
  violet: "#8b5cf6",
  amber: "#f59e0b",
  red: "#ef4444",
  slateGrid: "#e2e8f0",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value || 0);

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

const safePct = (num: number, den: number) => {
  if (!den || den <= 0) return 0;
  return (num / den) * 100;
};

const parseDate = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const daysBetween = (a: Date, b: Date) => {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

function prettyDate(d?: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-KE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

/**
 * Contractor extraction (MVP-safe)
 * Future: when backend adds contractor_name, we use it automatically.
 */
function extractContractorName(project: any): string | null {
  if (!project) return null;

  const direct = project.contractor_name || project.contractor || project.vendor_name;
  if (direct && typeof direct === "string" && direct.trim().length > 1) return direct.trim();

  const desc = project.description || "";
  if (typeof desc !== "string" || desc.length < 5) return null;

  const patterns = [
    /contractor\s*[:\-]\s*([^\n\r]+)/i,
    /vendor\s*[:\-]\s*([^\n\r]+)/i,
    /supplier\s*[:\-]\s*([^\n\r]+)/i,
  ];

  for (const p of patterns) {
    const m = desc.match(p);
    if (m && m[1]) {
      const name = String(m[1]).trim();
      if (name.length > 1) return name;
    }
  }

  return null;
}

function normalizeTitle(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\b(the|and|for|of|in|to|a|an)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** -----------------------------
 * NLP summary (MVP + ML-ready)
 * ------------------------------ */

/**
 * Very simple “citizen-friendly” fallback summary.
 * Later, this is replaced by a real NLP model output.
 *
 * Goal: 1 short sentence.
 */
function buildFallbackSummaryEn(project: any): string {
  const desc = String(project?.description || "").trim();
  const title = String(project?.title || "").trim();

  if (desc && desc.length <= 90) {
    return desc.replace(/\s+$/, "").replace(/\.$/, "");
  }

  if (desc && desc.length > 90) {
    const firstSentence = desc.split(/[.!?]\s/)[0]?.trim();
    if (firstSentence && firstSentence.length >= 15 && firstSentence.length <= 110) {
      return firstSentence.replace(/\.$/, "");
    }
    const words = desc.split(/\s+/).slice(0, 12).join(" ");
    return `${words}…`;
  }

  if (title) return title;

  return "Summary will appear here once details are available.";
}

/**
 * Simple Swahili fallback.
 */
function buildFallbackSummarySw(project: any): string {
  const en = buildFallbackSummaryEn(project);

  const map: Array<[RegExp, string]> = [
    [/rehabilitation/gi, "Ukarabati"],
    [/upgrade/gi, "Uboreshaji"],
    [/construction/gi, "Ujenzi"],
    [/borehole/gi, "kisima cha maji"],
    [/community/gi, "jamii"],
    [/school/gi, "shule"],
    [/health centre/gi, "kituo cha afya"],
    [/road/gi, "barabara"],
    [/water/gi, "maji"],
    [/of/gi, "wa"],
  ];

  let sw = en;
  for (const [re, rep] of map) sw = sw.replace(re, rep);

  if (sw === en) {
    return "Muhtasari utaonekana hapa (EN/SW) mara taarifa zitakapopatikana.";
  }

  return sw;
}

/** -----------------------------
 * Types
 * ------------------------------ */
type Project = {
  id: number;
  title: string;
  description?: string;
  category: string;
  status: string;
  budget: number;
  spent: number;
  progress: number;
  start_date?: string | null;
  completion_date?: string | null;
  constituency_name?: string;
  mp_name?: string;
  county?: string;
  last_updated?: string | null;

  contractor_name?: string | null;

  nlp_summary_en?: string | null;
  nlp_summary_sw?: string | null;
  nlp_summary_source?: string | null;
};

type PublicImage = {
  id: number;
  caption?: string | null;
  created_at?: string | null;
  view_url?: string;
};

type AntiCorruptionSignal = {
  level: "Low" | "Medium" | "High";
  title: string;
  reason: string;
  evidence: string[];
  recommended_action: string;
};

export default function ProjectAnalyticsDetail() {
  const { id } = useParams();

  const [project, setProject] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [images, setImages] = useState<PublicImage[]>([]);

  const [loading, setLoading] = useState(true);
  const [imgLoading, setImgLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI toggles
  const [showMethodology, setShowMethodology] = useState(false);
  const [showEvidence, setShowEvidence] = useState(true);
  const [showSignals, setShowSignals] = useState(true);

  // NLP language toggle
  const [summaryLang, setSummaryLang] = useState<"EN" | "SW">("EN");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const [pRes, allRes] = await Promise.all([
          api.get(`/projects/${id}`),
          api.get(`/projects/`),
        ]);

        setProject(pRes.data);
        setAllProjects(Array.isArray(allRes.data) ? allRes.data : []);
      } catch (e: any) {
        console.error("Project analytics fetch error:", e);
        setError("Failed to load project analytics. Please refresh or try again.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [id]);

  useEffect(() => {
    const runImages = async () => {
      setImgLoading(true);
      try {
        const res = await api.get(`/projects/${id}/images/public`);
        const data = Array.isArray(res.data) ? res.data : [];
        setImages(
          data.map((img: any) => ({
            id: img.id,
            caption: img.caption ?? null,
            created_at: img.created_at ?? null,
            view_url: img.view_url ?? img.url ?? null,
          }))
        );
      } catch (e) {
        console.warn("No public images or images endpoint failed:", e);
        setImages([]);
      } finally {
        setImgLoading(false);
      }
    };

    if (id) runImages();
  }, [id]);

  /** -----------------------------
   * NLP Summary
   * ------------------------------ */
  const nlpSummary = useMemo(() => {
    if (!project) return { text: "", source: "fallback" as const };

    const backendEn = project.nlp_summary_en?.trim();
    const backendSw = project.nlp_summary_sw?.trim();

    const fallbackEn = buildFallbackSummaryEn(project);
    const fallbackSw = buildFallbackSummarySw(project);

    const text = summaryLang === "EN" ? backendEn || fallbackEn : backendSw || fallbackSw;

    const source = (summaryLang === "EN" ? backendEn : backendSw) ? "generated" : "fallback";

    return { text, source };
  }, [project, summaryLang]);

  /** -----------------------------
   * Core analytics + signals
   * ------------------------------ */
  const analytics = useMemo(() => {
    if (!project) return null;

    const budget = Number(project.budget || 0);
    const spent = Number(project.spent || 0);
    const progress = clamp(Number(project.progress || 0));
    const utilization = clamp(safePct(spent, budget));
    const overspend = spent > budget && budget > 0;

    const start = parseDate(project.start_date);
    const end = parseDate(project.completion_date);
    const today = new Date();

    let expectedProgress = 0;
    let scheduleConfidence: "high" | "medium" | "low" = "low";

    if (start && end && end > start) {
      const totalDays = Math.max(1, daysBetween(start, end));
      const elapsedDays = clamp(daysBetween(start, today), 0, totalDays);
      expectedProgress = clamp((elapsedDays / totalDays) * 100);
      scheduleConfidence = "high";
    } else if (start && !end) {
      const elapsedDays = Math.max(0, daysBetween(start, today));
      expectedProgress = clamp(Math.min(100, elapsedDays * 2));
      scheduleConfidence = "medium";
    }

    const progressGap = clamp(expectedProgress - progress, 0, 100);
    const isFlagged = String(project.status).toLowerCase() === "flagged";

    let risk = 0;
    if (overspend) risk += 45;
    if (isFlagged) risk += 25;

    const utilVsProgressDelta = clamp(utilization - progress, -100, 100);
    if (utilVsProgressDelta > 25) risk += 20;
    if (utilVsProgressDelta > 40) risk += 10;

    if (scheduleConfidence !== "low" && progressGap > 20) risk += 15;
    if (scheduleConfidence !== "low" && progressGap > 35) risk += 10;

    risk = clamp(risk);
    const riskLabel = risk >= 70 ? "High" : risk >= 40 ? "Medium" : "Low";
    const score = clamp(100 - risk);

    const trend = buildMiniTrendSeries(budget, spent, progress);

    return {
      budget,
      spent,
      progress,
      utilization,
      overspend,
      expectedProgress,
      progressGap,
      scheduleConfidence,
      risk,
      riskLabel,
      score,
      utilVsProgressDelta,
      trend,
    };
  }, [project]);

  const signals = useMemo<AntiCorruptionSignal[]>(() => {
    if (!project) return [];

    const all = allProjects || [];
    const thisContractor = extractContractorName(project);

    const contractorName = thisContractor ?? "Not listed";
    const constituency = project.constituency_name || "Unknown constituency";

    const contractorProjects = new Map<string, Project[]>();
    for (const p of all) {
      const c = extractContractorName(p) ?? "Not listed";
      if (!contractorProjects.has(c)) contractorProjects.set(c, []);
      contractorProjects.get(c)!.push(p);
    }

    const contractorAll = contractorProjects.get(contractorName) || [];
    const contractorInConstituency = contractorAll.filter(
      (p) => (p.constituency_name || "") === constituency
    );

    const contractorFlaggedCount = contractorAll.filter(
      (p) => String(p.status).toLowerCase() === "flagged"
    ).length;

    const totalInConstituency =
      all.filter((p) => (p.constituency_name || "") === constituency).length || 0;

    const contractorShare =
      totalInConstituency > 0 ? (contractorInConstituency.length / totalInConstituency) * 100 : 0;

    const normalizedCurrentTitle = normalizeTitle(project.title);
    const similarTitleMatches = all
      .filter((p) => p.id !== project.id)
      .filter((p) => {
        const nt = normalizeTitle(p.title);
        return nt && (nt.includes(normalizedCurrentTitle) || normalizedCurrentTitle.includes(nt));
      })
      .slice(0, 5);

    const results: AntiCorruptionSignal[] = [];

    if (contractorInConstituency.length >= 2 && contractorShare >= 35) {
      results.push({
        level: contractorShare >= 55 ? "High" : "Medium",
        title: "Contractor concentration",
        reason: `${contractorName} appears in ${contractorInConstituency.length}/${totalInConstituency} projects in ${constituency} (~${Math.round(
          contractorShare
        )}%).`,
        evidence: [
          "One contractor handling many projects can reduce competition.",
          "Check procurement records for fairness and value for money.",
        ],
        recommended_action:
          "Review tender details, number of bidders, evaluation reports, and award reasons.",
      });
    } else {
      results.push({
        level: "Low",
        title: "Contractor concentration",
        reason: `No strong concentration pattern detected for ${contractorName} in ${constituency}.`,
        evidence: ["Based on the share of projects linked to this contractor in this constituency."],
        recommended_action: "Keep monitoring as more projects are added.",
      });
    }

    if (contractorFlaggedCount >= 2) {
      results.push({
        level: contractorFlaggedCount >= 3 ? "High" : "Medium",
        title: "Repeated flagged projects",
        reason: `${contractorName} has ${contractorFlaggedCount} flagged projects across the dataset.`,
        evidence: [
          "Repeated flagged outcomes can signal delivery problems.",
          "Compare timelines, payments, and site evidence across these projects.",
        ],
        recommended_action:
          "Do a deeper review: past performance, site verification, and milestone audit.",
      });
    } else {
      results.push({
        level: "Low",
        title: "Repeated flagged projects",
        reason: `No strong repeat issue detected for ${contractorName} yet.`,
        evidence: ["Based on flagged history in the current dataset."],
        recommended_action: "Keep collecting delivery outcomes over time.",
      });
    }

    const otherConstituencies = new Set(
      contractorAll
        .map((p) => p.constituency_name || "")
        .filter(Boolean)
        .filter((c) => c !== constituency)
    );

    if (otherConstituencies.size >= 2 && contractorFlaggedCount >= 1) {
      results.push({
        level: "Medium",
        title: "Pattern across constituencies",
        reason: `${contractorName} appears across multiple constituencies (${Array.from(otherConstituencies)
          .slice(0, 3)
          .join(", ")}…) with at least one flagged outcome.`,
        evidence: [
          "A repeated pattern in multiple areas can indicate wider procurement or delivery issues.",
        ],
        recommended_action:
          "Compare procurement documents and delivery evidence across constituencies.",
      });
    }

    const nearBudget = all.filter((p) => {
      if (p.id === project.id) return false;
      const b = Number(p.budget || 0);
      const diff = Math.abs(b - Number(project.budget || 0));
      return Number(project.budget || 0) > 0 && diff / Number(project.budget || 1) <= 0.1;
    });

    const sameContractorNearBudget = contractorAll.filter((p) => {
      if (p.id === project.id) return false;
      const b = Number(p.budget || 0);
      const diff = Math.abs(b - Number(project.budget || 0));
      return Number(project.budget || 0) > 0 && diff / Number(project.budget || 1) <= 0.1;
    });

    if (sameContractorNearBudget.length >= 2 && similarTitleMatches.length >= 1) {
      results.push({
        level: "Medium",
        title: "Similar budgets and titles",
        reason: "Multiple projects have near-identical budgets and similar titles.",
        evidence: [
          `Similar titles: ${similarTitleMatches.map((p) => `"${p.title}"`).join("; ")}`,
          `Near-budget projects by same contractor: ${sameContractorNearBudget.length}`,
        ],
        recommended_action:
          "Review if work was split into multiple projects and confirm procurement details.",
      });
    } else {
      results.push({
        level: "Low",
        title: "Similar budgets and titles",
        reason: "No strong clustering pattern detected using current data.",
        evidence: ["Based on title similarity and budget proximity."],
        recommended_action: "Add tender details to improve this check.",
      });
    }

    if (similarTitleMatches.length >= 3) {
      results.push({
        level: "Medium",
        title: "Very similar project titles",
        reason:
          "Many projects have highly similar titles — confirm whether they are different projects or duplicates.",
        evidence: [`Matches: ${similarTitleMatches.map((p) => `#${p.id} ${p.title}`).join(" | ")}`],
        recommended_action:
          "Request clarification and supporting evidence to confirm the entries are distinct.",
      });
    }

    results.push({
      level: project.description ? "Low" : "Medium",
      title: "Project details availability",
      reason: project.description
        ? "A project description is available."
        : "This project has no description, so the summary is limited.",
      evidence: ["More details improve clarity for citizens and auditors."],
      recommended_action: project.description
        ? "Add supporting documents/photos for stronger public evidence."
        : "Add a short description and upload supporting evidence.",
    });

    void nearBudget;
    return results;
  }, [project, allProjects]);

  /** -----------------------------
   * Loading / error states
   * ------------------------------ */
  if (loading) {
    return (
      <div className="space-y-8 pb-20">
        <PageHeader title="Project Analytics" subtitle="Loading detailed analytics..." />
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <div className="flex items-center gap-3 text-slate-700">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">Loading project analytics…</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project || !analytics) {
    return (
      <div className="space-y-8 pb-20">
        <PageHeader title="Project Analytics" subtitle="We couldn’t load this project." />
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">Something went wrong</p>
              <p className="text-slate-600 mt-1">{error ?? "Unknown error."}</p>

              <div className="mt-4">
                <Link
                  to="/analytics"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Analytics
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const contractorName = extractContractorName(project) ?? "Not listed";

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title="Project Analytics"
        subtitle="Project transparency: spending, progress, risk flags, and public evidence."
        backHref="/analytics"
        backLabel="Back to Analytics"
      />

      {/* Project identity */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold text-slate-900">{project.title}</h2>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Pill tone="purple" text={project.category} />
              <StatusPill status={project.status} />
              <span className="text-sm text-slate-500">
                {project.constituency_name ?? "—"} {project.county ? `• ${project.county}` : ""}
              </span>
              <span className="text-sm text-slate-500">MP: {project.mp_name ?? "—"}</span>
              <span className="text-sm text-slate-500">Contractor: {contractorName}</span>
            </div>

            {/* NLP Summary block (EN / SW switch) */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Languages className="w-5 h-5 text-slate-700" />
                  <div>
                    <p className="font-semibold text-slate-900">Simple Summary</p>
                   
                  </div>
                </div>

                {/* Language toggle */}
                <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 w-fit">
                  <button
                    onClick={() => setSummaryLang("EN")}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                      summaryLang === "EN" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                    }`}
                    aria-label="Switch summary language to English"
                  >
                    English
                  </button>
                  <button
                    onClick={() => setSummaryLang("SW")}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                      summaryLang === "SW" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                    }`}
                    aria-label="Switch summary language to Kiswahili"
                  >
                    Kiswahili
                  </button>
                </div>
              </div>

              <p className="mt-4 text-slate-700 leading-relaxed">{nlpSummary.text}</p>

            </div>

            {/* Full Description */}
            {project.description ? (
              <div className="mt-6">
                <p className="text-sm font-semibold text-slate-900">Full Description</p>
                <p className="text-slate-600 mt-2 leading-relaxed">{project.description}</p>
              </div>
            ) : (
              <p className="text-slate-600 mt-6 leading-relaxed">No description provided yet.</p>
            )}
          </div>

          {/* Score card */}
          <div className="w-full lg:w-[360px]">
            <div className="rounded-2xl p-6 text-white shadow-lg bg-gradient-to-r from-violet-600 to-sky-500">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-white/90 text-sm font-medium">Integrity / Delivery Score</p>
                  <p className="text-3xl font-bold mt-1">{analytics.score}/100</p>
                </div>
                <ShieldAlert className="w-8 h-8 text-white/90" />
              </div>

              <p className="text-white/90 mt-3 text-sm leading-relaxed">
                This score summarizes the project’s spending, progress, schedule, and any flagged status.
              </p>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Risk: {analytics.riskLabel} ({analytics.risk}/100)
                </span>

                <button
                  onClick={() => setShowMethodology((v) => !v)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/20 transition text-sm font-medium"
                >
                  <Info className="w-4 h-4" />
                  {showMethodology ? "Hide" : "How it’s calculated"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {showMethodology && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <h3 className="text-lg font-semibold text-slate-900">How risk is calculated</h3>
            <ul className="mt-3 space-y-2 text-slate-600 text-sm leading-relaxed list-disc pl-5">
              <li><b>Overspending</b> (spent more than budget) increases risk.</li>
              <li><b>Flagged status</b> increases risk.</li>
              <li><b>Spending ahead of progress</b> increases risk.</li>
              <li><b>Behind schedule</b> increases risk (when dates are available).</li>
            </ul>
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard label="Budget" value={formatCurrency(analytics.budget)} sub="Allocated" icon={ClipboardList} color="sky" />
        <StatCard label="Spent" value={formatCurrency(analytics.spent)} sub={`${Math.round(analytics.utilization)}% of budget`} icon={TrendingUp} color="emerald" />
        <StatCard label="Progress" value={`${analytics.progress}%`} sub={analytics.scheduleConfidence === "low" ? "No dates provided" : `Expected ~${Math.round(analytics.expectedProgress)}%`} icon={CheckCircle2} color="violet" />
        <StatCard label="Risk" value={`${analytics.risk}/100`} sub={`${analytics.riskLabel} • score ${analytics.score}/100`} icon={AlertTriangle} color={analytics.risk >= 70 ? "red" : analytics.risk >= 40 ? "amber" : "emerald"} />
      </div>

      {/* Delivery + Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 xl:col-span-2">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Delivery health</h3>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock className="w-4 h-4" />
              <span>Last updated: {prettyDate(parseDate(project.last_updated))}</span>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <MetricBar
              label="Budget utilization"
              leftLabel={`${formatCurrency(analytics.spent)} spent`}
              rightLabel={`${formatCurrency(analytics.budget)} budget`}
              value={analytics.utilization}
              tone={analytics.utilization > 100 ? "red" : analytics.utilization > 85 ? "amber" : "emerald"}
            />

            <MetricBar
              label="Progress completion"
              leftLabel={`${analytics.progress}% delivered`}
              rightLabel={analytics.scheduleConfidence === "low" ? "No dates provided" : `${Math.round(analytics.expectedProgress)}% expected`}
              value={analytics.progress}
              tone={analytics.progress < 30 ? "amber" : "emerald"}
            />

            <div className="rounded-2xl border border-slate-200 p-6 bg-slate-50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-700" />
                  <p className="font-semibold text-slate-900">Timeline</p>
                </div>

                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700">
                  Confidence: {analytics.scheduleConfidence}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <TimelineItem label="Start date" value={prettyDate(parseDate(project.start_date))} />
                <TimelineItem label="Completion date" value={prettyDate(parseDate(project.completion_date))} />
                <TimelineItem
                  label="Schedule gap"
                  value={analytics.scheduleConfidence === "low" ? "—" : `${Math.round(analytics.progressGap)}% behind`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <h3 className="text-xl font-semibold text-slate-900">Insights</h3>
          <p className="text-slate-600 mt-2">Quick checks to help you understand what’s happening.</p>

          <div className="mt-6 space-y-4">
            <InsightRow
              icon={ShieldAlert}
              title="Spending vs progress"
              value={`${Math.round(analytics.utilization)}% vs ${analytics.progress}%`}
              detail={
                analytics.utilVsProgressDelta > 25
                  ? "Spending is far ahead of delivery. Check milestones, invoices, and site status."
                  : "Spending and delivery look broadly aligned."
              }
              tone={analytics.utilVsProgressDelta > 25 ? "amber" : "emerald"}
            />

            <InsightRow
              icon={AlertTriangle}
              title="Overspend check"
              value={analytics.overspend ? "Overspend detected" : "No overspend"}
              detail={analytics.overspend ? "Spent exceeds budget. This needs review." : "Spent is within budget."}
              tone={analytics.overspend ? "red" : "emerald"}
            />

            <InsightRow
              icon={Clock}
              title="Schedule health"
              value={
                analytics.scheduleConfidence === "low"
                  ? "No schedule dates"
                  : analytics.progressGap > 20
                  ? "Behind schedule"
                  : "On track"
              }
              detail={
                analytics.scheduleConfidence === "low"
                  ? "Add start and completion dates for clearer schedule tracking."
                  : analytics.progressGap > 20
                  ? "Progress is behind what we would expect based on time elapsed."
                  : "Progress aligns with what we would expect based on time elapsed."
              }
              tone={analytics.scheduleConfidence === "low" ? "slate" : analytics.progressGap > 20 ? "amber" : "emerald"}
            />

            {/* Replaced “Next (ML + Real-time)” card */}
            <div className="mt-6 rounded-2xl p-6 text-white shadow-lg bg-gradient-to-r from-violet-600 to-sky-500">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-lg">What you can do</p>
                <ScanSearch className="w-6 h-6 text-white/90" />
              </div>
              <p className="text-white/90 mt-2 text-sm leading-relaxed">
                If something looks wrong, report it with details (what you saw, where, and when). Photos help.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Anti-Corruption Signals */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-slate-700" />
            <h3 className="text-xl font-semibold text-slate-900">Anti-Corruption Signals</h3>
          </div>

          <button
            onClick={() => setShowSignals((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition"
          >
            {showSignals ? "Hide" : "Show"}
          </button>
        </div>

        {showSignals && (
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <MiniInfoCard
                icon={Building2}
                title="Contractor"
                value={contractorName}
                hint="Contractor Details"
              />
              <MiniInfoCard
                icon={Layers}
                title="Signals"
                value="Rule-based checks"
                hint="Signals show patterns that may need follow-up."
              />
              <MiniInfoCard
                icon={FileText}
                title="Summary"
                value="English / Kiswahili"
                hint="Switch language above to read the summary."
              />
            </div>

            <div className="space-y-4">
              {signals.map((s, idx) => (
                <SignalRow key={idx} signal={s} />
              ))}
            </div>

            {/* Removed the ML plan block and replaced with citizen-friendly guidance */}
            <div className="rounded-2xl p-6 bg-slate-50 border border-slate-200">
              <p className="font-semibold text-slate-900">How to use these signals</p>
              <ul className="mt-2 text-sm text-slate-600 list-disc pl-5 space-y-1">
                <li>Signals do not prove wrongdoing — they highlight areas to check.</li>
                <li>Compare with photos, site visits, budgets, and official procurement documents.</li>
                <li>If you have evidence, report it so it can be reviewed.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Trend chart */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Spending trend</h3>
            <p className="text-slate-600 mt-2">
              This chart shows how spending compares to the project budget over time.
            </p>
          </div>

          <Link
            to={`/projects/${project.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            View Project
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="mt-6 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.trend}>
              <CartesianGrid strokeDasharray="4 4" stroke={COLORS.slateGrid} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `${Math.round(v / 1_000_000)}M`} />
              <Tooltip content={<TrendTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="spent"
                name="Spent"
                stroke={COLORS.sky}
                strokeWidth={4}
                dot={{ fill: COLORS.sky, r: 6 }}
                activeDot={{ r: 9 }}
              />
              <Line
                type="monotone"
                dataKey="budget"
                name="Budget"
                stroke={COLORS.emerald}
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Evidence */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-5 h-5 text-slate-700" />
            <h3 className="text-xl font-semibold text-slate-900">Evidence (public)</h3>
          </div>

          <button
            onClick={() => setShowEvidence((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition"
          >
            {showEvidence ? "Hide" : "Show"}
          </button>
        </div>

        {showEvidence && (
          <div className="p-8">
            {imgLoading ? (
              <div className="flex items-center gap-3 text-slate-700">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-medium">Loading evidence images…</span>
              </div>
            ) : images.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <p className="font-semibold text-slate-900">No public evidence uploaded yet</p>
                <p className="text-slate-600 mt-1 text-sm">
                  If you have photos or documents, upload them to support transparency.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition"
                  >
                    <div className="aspect-video bg-slate-100 flex items-center justify-center">
                      {img.view_url ? (
                        <img
                          src={img.view_url}
                          alt={img.caption ?? `Evidence ${img.id}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="text-slate-500 text-sm">No preview</div>
                      )}
                    </div>

                    <div className="p-4">
                      <p className="font-semibold text-slate-900 truncate">
                        {img.caption || `Evidence #${img.id}`}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {prettyDate(parseDate(img.created_at || undefined))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** -----------------------------
 * Components
 * ------------------------------ */

function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
}: {
  title: string;
  subtitle: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-600 mt-2">{subtitle}</p>
        </div>

        {backHref ? (
          <Link
            to={backHref}
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-sm font-medium text-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel ?? "Back"}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function Pill({ tone, text }: { tone: "purple" | "slate"; text: string }) {
  const cls = tone === "purple" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700";
  return <span className={`px-4 py-1.5 text-xs font-medium rounded-full ${cls}`}>{text}</span>;
}

function StatusPill({ status }: { status: string }) {
  const s = String(status || "").toLowerCase();
  const cls =
    s === "completed"
      ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
      : s === "ongoing"
      ? "bg-amber-100 text-amber-800 ring-amber-200"
      : s === "flagged"
      ? "bg-red-100 text-red-800 ring-red-200"
      : "bg-slate-100 text-slate-700 ring-slate-200";

  const Icon = s === "completed" ? CheckCircle2 : s === "ongoing" ? Loader2 : AlertTriangle;

  return (
    <span
      className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-full ring-1 ring-inset ${cls}`}
    >
      <Icon size={16} className={s === "ongoing" ? "animate-spin" : ""} />
      {status}
    </span>
  );
}

type StatColor = "violet" | "emerald" | "amber" | "red" | "sky";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: any;
  color: StatColor;
}) {
  const colors: Record<StatColor, string> = {
    violet: "bg-violet-100 text-violet-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    sky: "bg-sky-100 text-sky-700",
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 hover:shadow-xl transition-all min-w-0">
      <div className="flex items-center gap-5 min-w-0">
        <div className={`p-4 rounded-2xl ${colors[color]} shrink-0`}>
          <Icon className="w-8 h-8" />
        </div>

        <div className="min-w-0">
          <p className="text-sm text-slate-600">{label}</p>
          <p className="text-3xl font-bold mt-1 text-slate-900 truncate">{value}</p>
          {sub ? <p className="text-xs text-slate-500 mt-1 truncate">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

function MetricBar({
  label,
  leftLabel,
  rightLabel,
  value,
  tone,
}: {
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
  tone: "emerald" | "amber" | "red";
}) {
  const bar = tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-red-500";

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="font-semibold text-slate-900">{label}</p>
        <p className="text-sm font-semibold text-slate-700">{Math.round(value)}%</p>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span className="truncate">{leftLabel}</span>
        <span className="truncate">{rightLabel}</span>
      </div>

      <div className="mt-3 bg-slate-200 rounded-full h-3 overflow-hidden">
        <div className={`h-3 rounded-full transition-all duration-700 ${bar}`} style={{ width: `${clamp(value)}%` }} />
      </div>
    </div>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function InsightRow({
  icon: Icon,
  title,
  value,
  detail,
  tone,
}: {
  icon: any;
  title: string;
  value: string;
  detail: string;
  tone: "emerald" | "amber" | "red" | "slate";
}) {
  const toneCls =
    tone === "emerald"
      ? "bg-emerald-50 border-emerald-200"
      : tone === "amber"
      ? "bg-amber-50 border-amber-200"
      : tone === "red"
      ? "bg-red-50 border-red-200"
      : "bg-slate-50 border-slate-200";

  const iconCls =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "amber"
      ? "text-amber-700"
      : tone === "red"
      ? "text-red-700"
      : "text-slate-700";

  return (
    <div className={`rounded-2xl border p-5 ${toneCls}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${iconCls} mt-0.5`} />
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="text-sm font-semibold text-slate-700 mt-1">{value}</p>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function MiniInfoCard({
  icon: Icon,
  title,
  value,
  hint,
}: {
  icon: any;
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-slate-700" />
        <p className="font-semibold text-slate-900">{title}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-600">{hint}</p>
    </div>
  );
}

function SignalRow({ signal }: { signal: AntiCorruptionSignal }) {
  const levelTone =
    signal.level === "High"
      ? "bg-red-50 border-red-200"
      : signal.level === "Medium"
      ? "bg-amber-50 border-amber-200"
      : "bg-emerald-50 border-emerald-200";

  const badgeTone =
    signal.level === "High"
      ? "bg-red-100 text-red-800 ring-red-200"
      : signal.level === "Medium"
      ? "bg-amber-100 text-amber-800 ring-amber-200"
      : "bg-emerald-100 text-emerald-800 ring-emerald-200";

  return (
    <div className={`rounded-2xl border p-6 ${levelTone}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{signal.title}</p>
          <p className="text-sm text-slate-700 mt-2 leading-relaxed">{signal.reason}</p>
        </div>

        <span
          className={`shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${badgeTone}`}
        >
          {signal.level} signal
        </span>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Evidence</p>
        <ul className="mt-2 text-sm text-slate-700 space-y-1 list-disc pl-5">
          {signal.evidence.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-xl bg-white/70 border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Recommended action</p>
        <p className="text-sm text-slate-700 mt-1">{signal.recommended_action}</p>
      </div>
    </div>
  );
}

/** -----------------------------
 * Chart helpers
 * ------------------------------ */
function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const spent = payload.find((p: any) => p.dataKey === "spent")?.value ?? 0;
  const budget = payload.find((p: any) => p.dataKey === "budget")?.value ?? 0;

  return (
    <div className="bg-white/95 backdrop-blur p-4 rounded-xl shadow-xl border border-slate-200">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="text-sm text-slate-700 mt-1">
        Spent: <span className="font-bold text-slate-900">{formatCurrency(spent)}</span>
      </p>
      <p className="text-sm text-slate-700">
        Budget: <span className="font-bold text-slate-900">{formatCurrency(budget)}</span>
      </p>
    </div>
  );
}

function buildMiniTrendSeries(budget: number, spent: number, progress: number) {
  const steps = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const end = Number(spent || 0);

  if (end <= 0) {
    return steps.map((s) => ({ label: s, spent: 0, budget, progress }));
  }

  const weights = [0.15, 0.28, 0.45, 0.62, 0.78, 1.0];
  return steps.map((s, idx) => ({
    label: s,
    spent: Math.round(end * weights[idx]),
    budget,
    progress,
  }));
}

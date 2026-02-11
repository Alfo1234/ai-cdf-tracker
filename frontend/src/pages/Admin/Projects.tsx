// src/pages/Admin/Projects.tsx
import { useEffect, useMemo, useState } from "react";
import {
  FolderKanban,
  Search,
  RefreshCcw,
  PlusCircle,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../api/client";

type AdminTab = "projects" | "awards" | "contractors";

type ProjectStatus = "Planned" | "Ongoing" | "Completed" | "Flagged";
type ProjectCategory =
  | "Education"
  | "Health"
  | "Water"
  | "Infrastructure"
  | "Security"
  | "Environment"
  | "Other";

interface Constituency {
  code: string;
  name: string;
  county: string;
  mp_name: string;
}

interface Project {
  id: number;
  title: string;
  description?: string | null;
  category: string;
  status: string;
  budget: number;
  spent?: number | null;
  progress?: number | null;
  start_date?: string | null;
  completion_date?: string | null;

  constituency_code?: string | null;
  constituency_name: string;
  county: string;
  mp_name: string;

  last_updated?: string | null;

  // procurement fields already present in your /projects/ response
  contractor_name?: string | null;
  tender_id?: string | null;
  procurement_method?: string | null;
  contract_value?: number | null;
  award_date?: string | null;
}

interface Award {
  id: number;
  project_id: number;
  contractor_id: number;
  tender_id: string;
  procurement_method: string;
  contract_value: number;
  award_date: string;
  performance_flag: boolean;
  performance_flag_reason?: string | null;
  created_at?: string | null;
}

interface Contractor {
  id: number;
  name: string;

  // optional fields (safe if backend supports them; we only send if filled)
  phone?: string | null;
  email?: string | null;
  registration_no?: string | null;
  address?: string | null;
  created_at?: string | null;
}

const formatMoney = (v: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(v || 0);

const isoToDate = (s?: string | null) => {
  if (!s) return "";
  return String(s).split("T")[0];
};

const shortDate = (s?: string | null) => isoToDate(s) || "—";

export default function AdminProjects() {
  const [tab, setTab] = useState<AdminTab>("projects");

  const [loading, setLoading] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);

  const [searchTerm, setSearchTerm] = useState("");

  // pagination (separate per tab)
  const [projectPage, setProjectPage] = useState(1);
  const [awardPage, setAwardPage] = useState(1);
  const [contractorPage, setContractorPage] = useState(1);

  const projectsPerPage = 12;
  const awardsPerPage = 12;
  const contractorsPerPage = 12;

  // modal control
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<
    | { entity: "project"; mode: "create" | "edit"; id?: number }
    | { entity: "award"; mode: "create" | "edit"; id?: number }
    | { entity: "contractor"; mode: "create" | "edit"; id?: number }
  >({ entity: "project", mode: "create" });

  // confirm delete
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<{
    entity: "project" | "award" | "contractor";
    id: number;
    label: string;
  } | null>(null);

  // busy flags
  const [saving, setSaving] = useState(false);

  // -----------------------
  // LOADERS
  // -----------------------
  const loadAll = async () => {
    setLoading(true);
    try {
      const [pRes, aRes, cRes, consRes] = await Promise.all([
        api.get("/projects/"),
        api.get("/procurement-awards/"),
        api.get("/contractors/"),
        api.get("/constituencies/"),
      ]);

      setProjects(Array.isArray(pRes.data) ? pRes.data : []);
      setAwards(Array.isArray(aRes.data) ? aRes.data : []);
      setContractors(Array.isArray(cRes.data) ? cRes.data : []);
      setConstituencies(Array.isArray(consRes.data) ? consRes.data : []);
    } catch (err) {
      console.error(err);
      alert(
        "Failed to load data. If this is the first time: ensure /contractors and /procurement-awards endpoints support GET."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // -----------------------
  // MAPS
  // -----------------------
  const projectTitleById = useMemo(() => {
    const m = new Map<number, string>();
    projects.forEach((p) => m.set(p.id, p.title));
    return m;
  }, [projects]);

  const contractorNameById = useMemo(() => {
    const m = new Map<number, string>();
    contractors.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [contractors]);

  const isRecentlyEdited = (lastUpdated?: string | null) => {
    if (!lastUpdated) return false;
    const updatedDate = new Date(lastUpdated);
    const now = new Date();
    const hoursDiff = (now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  };

  // -----------------------
  // FILTERS (per tab)
  // -----------------------
  const filteredProjects = useMemo(() => {
    let list = [...projects];
    if (searchTerm.trim() && tab === "projects") {
      const term = searchTerm.toLowerCase();
      list = list.filter((p) => {
        const hay = [
          p.title,
          p.constituency_name,
          p.mp_name,
          p.status,
          p.category,
          p.contractor_name || "",
          p.tender_id || "",
          p.procurement_method || "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(term);
      });
    }
    // newest first
    list.sort((a, b) => b.id - a.id);
    return list;
  }, [projects, searchTerm, tab]);

  const filteredAwards = useMemo(() => {
    let list = [...awards];
    if (searchTerm.trim() && tab === "awards") {
      const term = searchTerm.toLowerCase();
      list = list.filter((a) => {
        const hay = [
          `#${a.id}`,
          projectTitleById.get(a.project_id) || "",
          contractorNameById.get(a.contractor_id) || "",
          a.tender_id,
          a.procurement_method,
          a.performance_flag ? "flagged" : "ok",
          a.performance_flag_reason || "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(term);
      });
    }
    // newest first
    list.sort((a, b) => b.id - a.id);
    return list;
  }, [awards, searchTerm, tab, projectTitleById, contractorNameById]);

  const filteredContractors = useMemo(() => {
    let list = [...contractors];
    if (searchTerm.trim() && tab === "contractors") {
      const term = searchTerm.toLowerCase();
      list = list.filter((c) => {
        const hay = [
          `#${c.id}`,
          c.name,
          c.phone || "",
          c.email || "",
          c.registration_no || "",
          c.address || "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(term);
      });
    }
    // by name
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [contractors, searchTerm, tab]);

  // -----------------------
  // PAGINATION
  // -----------------------
  const projectTotalPages = Math.max(1, Math.ceil(filteredProjects.length / projectsPerPage));
  const awardTotalPages = Math.max(1, Math.ceil(filteredAwards.length / awardsPerPage));
  const contractorTotalPages = Math.max(
    1,
    Math.ceil(filteredContractors.length / contractorsPerPage)
  );

  const paginatedProjects = filteredProjects.slice(
    (projectPage - 1) * projectsPerPage,
    projectPage * projectsPerPage
  );
  const paginatedAwards = filteredAwards.slice(
    (awardPage - 1) * awardsPerPage,
    awardPage * awardsPerPage
  );
  const paginatedContractors = filteredContractors.slice(
    (contractorPage - 1) * contractorsPerPage,
    contractorPage * contractorsPerPage
  );

  useEffect(() => {
    // whenever tab changes, reset its page and clear search for clarity
    setSearchTerm("");
    if (tab === "projects") setProjectPage(1);
    if (tab === "awards") setAwardPage(1);
    if (tab === "contractors") setContractorPage(1);
  }, [tab]);

  // -----------------------
  // OPEN MODALS
  // -----------------------
  const openCreate = () => {
    if (tab === "projects") setModalMode({ entity: "project", mode: "create" });
    if (tab === "awards") setModalMode({ entity: "award", mode: "create" });
    if (tab === "contractors") setModalMode({ entity: "contractor", mode: "create" });
    setModalOpen(true);
  };

  const openEdit = (entity: "project" | "award" | "contractor", id: number) => {
    setModalMode({ entity, mode: "edit", id });
    setModalOpen(true);
  };

  const openDelete = (entity: "project" | "award" | "contractor", id: number, label: string) => {
    setConfirmPayload({ entity, id, label });
    setConfirmOpen(true);
  };

  // -----------------------
  // CRUD - PROJECTS
  // -----------------------
  const createProject = async (payload: any) => {
    setSaving(true);
    try {
      await api.post("/projects/", payload);
      alert("Project created successfully!");
      setModalOpen(false);
      await loadAll();
      setTab("projects");
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.detail || "Failed to create project.");
    } finally {
      setSaving(false);
    }
  };

  const updateProject = async (id: number, payload: any) => {
    setSaving(true);
    try {
      await api.put(`/projects/${id}`, payload);
      alert("Project updated successfully!");
      setModalOpen(false);
      await loadAll();
      setTab("projects");
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.detail || "Failed to update project.");
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (id: number) => {
    setSaving(true);
    try {
      await api.delete(`/projects/${id}`);
      alert("Project deleted successfully!");
      setConfirmOpen(false);
      setConfirmPayload(null);
      await loadAll();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.detail || "Failed to delete project.");
    } finally {
      setSaving(false);
    }
  };

  // -----------------------
  // CRUD - AWARDS
  // -----------------------
  const createAward = async (payload: any) => {
    setSaving(true);
    try {
      await api.post("/procurement-awards/", payload);
      alert("Award created successfully!");
      setModalOpen(false);
      await loadAll();
      setTab("awards");
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.detail || "Failed to create award.");
    } finally {
      setSaving(false);
    }
  };

  const updateAward = async (id: number, payload: any) => {
    setSaving(true);
    try {
      await api.put(`/procurement-awards/${id}`, payload);
      alert("Award updated successfully!");
      setModalOpen(false);
      await loadAll();
      setTab("awards");
    } catch (err: any) {
      console.error(err);
      alert(
        err?.response?.data?.detail ||
          "Failed to update award. Ensure backend supports PUT /procurement-awards/{id}."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteAward = async (id: number) => {
    setSaving(true);
    try {
      await api.delete(`/procurement-awards/${id}`);
      alert("Award deleted successfully!");
      setConfirmOpen(false);
      setConfirmPayload(null);
      await loadAll();
    } catch (err: any) {
      console.error(err);
      alert(
        err?.response?.data?.detail ||
          "Failed to delete award. Ensure backend supports DELETE /procurement-awards/{id}."
      );
    } finally {
      setSaving(false);
    }
  };

  // -----------------------
  // CRUD - CONTRACTORS
  // -----------------------
  const createContractor = async (payload: any) => {
    setSaving(true);
    try {
      await api.post("/contractors/", payload);
      alert("Contractor created successfully!");
      setModalOpen(false);
      await loadAll();
      setTab("contractors");
    } catch (err: any) {
      console.error(err);
      alert(
        err?.response?.data?.detail ||
          "Failed to create contractor. Ensure backend supports POST /contractors/."
      );
    } finally {
      setSaving(false);
    }
  };

  const updateContractor = async (id: number, payload: any) => {
    setSaving(true);
    try {
      await api.put(`/contractors/${id}`, payload);
      alert("Contractor updated successfully!");
      setModalOpen(false);
      await loadAll();
      setTab("contractors");
    } catch (err: any) {
      console.error(err);
      alert(
        err?.response?.data?.detail ||
          "Failed to update contractor. Ensure backend supports PUT /contractors/{id}."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteContractor = async (id: number) => {
    setSaving(true);
    try {
      await api.delete(`/contractors/${id}`);
      alert("Contractor deleted successfully!");
      setConfirmOpen(false);
      setConfirmPayload(null);
      await loadAll();
    } catch (err: any) {
      console.error(err);
      alert(
        err?.response?.data?.detail ||
          "Failed to delete contractor. Ensure backend supports DELETE /contractors/{id}."
      );
    } finally {
      setSaving(false);
    }
  };

  // -----------------------
  // DELETE ROUTER
  // -----------------------
  const confirmDelete = async () => {
    if (!confirmPayload) return;
    const { entity, id } = confirmPayload;

    if (entity === "project") return deleteProject(id);
    if (entity === "award") return deleteAward(id);
    if (entity === "contractor") return deleteContractor(id);
  };

  // -----------------------
  // MODAL INITIAL VALUES
  // -----------------------
  const projectToEdit = useMemo(() => {
    if (modalMode.entity !== "project" || modalMode.mode !== "edit" || !modalMode.id) return null;
    return projects.find((p) => p.id === modalMode.id) || null;
  }, [modalMode, projects]);

  const awardToEdit = useMemo(() => {
    if (modalMode.entity !== "award" || modalMode.mode !== "edit" || !modalMode.id) return null;
    return awards.find((a) => a.id === modalMode.id) || null;
  }, [modalMode, awards]);

  const contractorToEdit = useMemo(() => {
    if (modalMode.entity !== "contractor" || modalMode.mode !== "edit" || !modalMode.id) return null;
    return contractors.find((c) => c.id === modalMode.id) || null;
  }, [modalMode, contractors]);

  // -----------------------
  // RENDER
  // -----------------------
  if (loading) {
    return (
      <div className="p-20 text-center">
        <p className="text-xl text-slate-600">Loading management hub...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <FolderKanban className="w-10 h-10 text-sky-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Project Management</h1>
            <p className="text-slate-600 mt-1">
              Projects • Procurement Awards • Contractors (full CRUD)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAll}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition"
          >
            <RefreshCcw size={18} />
            Refresh
          </button>

          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition"
          >
            <PlusCircle size={18} />
            Create {tab === "projects" ? "Project" : tab === "awards" ? "Award" : "Contractor"}
          </button>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4 flex flex-wrap gap-2 items-center">
        <TabBtn
          active={tab === "projects"}
          label={`Projects (${projects.length})`}
          onClick={() => setTab("projects")}
        />
        <TabBtn
          active={tab === "awards"}
          label={`Awards (${awards.length})`}
          onClick={() => setTab("awards")}
        />
        <TabBtn
          active={tab === "contractors"}
          label={`Contractors (${contractors.length})`}
          onClick={() => setTab("contractors")}
        />

        <div className="flex-1" />

        <div className="relative w-full sm:w-[420px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder={`Search ${tab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
          />
        </div>
      </div>

      {/* PROJECTS TABLE */}
      {tab === "projects" && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">
              Projects ({filteredProjects.length})
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Edit full details via “Edit Page” or quick edit via pencil. Delete is permanent.
            </p>
          </div>

          {paginatedProjects.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No projects found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <Th>ID</Th>
                      <Th>Title</Th>
                      <Th>Constituency</Th>
                      <Th>MP</Th>
                      <Th>Status</Th>
                      <Th>Budget</Th>
                      <Th>Contractor</Th>
                      <Th>Tender</Th>
                      <Th>Method</Th>
                      <Th>Award Date</Th>
                      <Th>Actions</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paginatedProjects.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <Td>
                          <div className="flex items-center gap-2">
                            <span>#{p.id}</span>
                            {isRecentlyEdited(p.last_updated) && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                                <Clock size={12} />
                                Recently Edited
                              </span>
                            )}
                          </div>
                        </Td>

                        <Td className="font-medium text-slate-900">{p.title}</Td>
                        <Td>{p.constituency_name}</Td>
                        <Td>Hon. {p.mp_name}</Td>

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
                        <Td>{p.contractor_name || "—"}</Td>
                        <Td>{p.tender_id || "—"}</Td>
                        <Td>{p.procurement_method || "—"}</Td>
                        <Td>{shortDate(p.award_date)}</Td>

                        <Td>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit("project", p.id)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition"
                              title="Quick Edit"
                            >
                              <Pencil size={16} />
                              Edit
                            </button>

                            <Link
                              to={`/admin/projects/${p.id}`}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition"
                              title="Full Edit Page"
                            >
                              <Edit2 size={16} />
                              Edit Page
                            </Link>

                            <button
                              onClick={() => openDelete("project", p.id, p.title)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pager
                page={projectPage}
                setPage={setProjectPage}
                totalPages={projectTotalPages}
                totalItems={filteredProjects.length}
                perPage={projectsPerPage}
              />
            </>
          )}
        </div>
      )}

      {/* AWARDS TABLE */}
      {tab === "awards" && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">
              Procurement Awards ({filteredAwards.length})
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Full CRUD: create, edit, delete awards and link them to projects + contractors.
            </p>
          </div>

          {paginatedAwards.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No awards found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <Th>ID</Th>
                      <Th>Project</Th>
                      <Th>Contractor</Th>
                      <Th>Tender</Th>
                      <Th>Method</Th>
                      <Th>Value</Th>
                      <Th>Award Date</Th>
                      <Th>Flag</Th>
                      <Th>Actions</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paginatedAwards.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50 transition">
                        <Td>#{a.id}</Td>
                        <Td className="font-medium text-slate-900">
                          {projectTitleById.get(a.project_id) || `Project #${a.project_id}`}
                        </Td>
                        <Td>
                          {contractorNameById.get(a.contractor_id) ||
                            `Contractor #${a.contractor_id}`}
                        </Td>
                        <Td>{a.tender_id}</Td>
                        <Td>{a.procurement_method}</Td>
                        <Td>{formatMoney(a.contract_value)}</Td>
                        <Td>{shortDate(a.award_date)}</Td>
                        <Td>
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full ${
                              a.performance_flag
                                ? "bg-red-100 text-red-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                            title={a.performance_flag_reason || ""}
                          >
                            {a.performance_flag ? "FLAGGED" : "OK"}
                          </span>
                        </Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit("award", a.id)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition"
                            >
                              <Pencil size={16} />
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                openDelete(
                                  "award",
                                  a.id,
                                  `${a.tender_id} • ${projectTitleById.get(a.project_id) || a.project_id}`
                                )
                              }
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition"
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pager
                page={awardPage}
                setPage={setAwardPage}
                totalPages={awardTotalPages}
                totalItems={filteredAwards.length}
                perPage={awardsPerPage}
              />
            </>
          )}
        </div>
      )}

      {/* CONTRACTORS TABLE */}
      {tab === "contractors" && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">
              Contractors ({filteredContractors.length})
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Full CRUD: manage contractors and link them in awards.
            </p>
          </div>

          {paginatedContractors.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No contractors found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <Th>ID</Th>
                      <Th>Name</Th>
                      <Th>Phone</Th>
                      <Th>Email</Th>
                      <Th>Reg No</Th>
                      <Th>Actions</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paginatedContractors.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition">
                        <Td>#{c.id}</Td>
                        <Td className="font-medium text-slate-900">{c.name}</Td>
                        <Td>{c.phone || "—"}</Td>
                        <Td>{c.email || "—"}</Td>
                        <Td>{c.registration_no || "—"}</Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit("contractor", c.id)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition"
                            >
                              <Pencil size={16} />
                              Edit
                            </button>

                            <button
                              onClick={() => openDelete("contractor", c.id, c.name)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition"
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pager
                page={contractorPage}
                setPage={setContractorPage}
                totalPages={contractorTotalPages}
                totalItems={filteredContractors.length}
                perPage={contractorsPerPage}
              />
            </>
          )}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <ModalShell
          title={
            modalMode.entity === "project"
              ? modalMode.mode === "create"
                ? "Create Project"
                : "Edit Project"
              : modalMode.entity === "award"
              ? modalMode.mode === "create"
                ? "Create Award"
                : "Edit Award"
              : modalMode.mode === "create"
              ? "Create Contractor"
              : "Edit Contractor"
          }
          onClose={() => setModalOpen(false)}
        >
          {modalMode.entity === "project" && (
            <ProjectForm
              saving={saving}
              mode={modalMode.mode}
              constituencies={constituencies}
              initial={projectToEdit}
              onCreate={createProject}
              onUpdate={updateProject}
            />
          )}

          {modalMode.entity === "award" && (
            <AwardForm
              saving={saving}
              mode={modalMode.mode}
              projects={projects}
              contractors={contractors}
              initial={awardToEdit}
              onCreate={createAward}
              onUpdate={updateAward}
            />
          )}

          {modalMode.entity === "contractor" && (
            <ContractorForm
              saving={saving}
              mode={modalMode.mode}
              initial={contractorToEdit}
              onCreate={createContractor}
              onUpdate={updateContractor}
            />
          )}
        </ModalShell>
      )}

      {/* DELETE CONFIRM */}
      {confirmOpen && confirmPayload && (
        <ConfirmDialog
          title="Confirm Delete"
          message={`Are you sure you want to delete: "${confirmPayload.label}"? This cannot be undone.`}
          dangerText="Delete"
          cancelText="Cancel"
          busy={saving}
          onCancel={() => {
            setConfirmOpen(false);
            setConfirmPayload(null);
          }}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

/* ---------------- UI HELPERS ---------------- */

function TabBtn({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
        active
          ? "bg-slate-900 text-white"
          : "border border-slate-200 hover:bg-slate-50 text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

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

      <div className="flex gap-2">
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

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition"
          >
            Close
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  dangerText,
  cancelText,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  dangerText: string;
  cancelText: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        </div>
        <div className="p-6">
          <p className="text-slate-700">{message}</p>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={onCancel}
              disabled={busy}
              className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition disabled:opacity-50"
            >
              {busy ? "..." : dangerText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- FORMS ---------------- */

function ProjectForm({
  saving,
  mode,
  constituencies,
  initial,
  onCreate,
  onUpdate,
}: {
  saving: boolean;
  mode: "create" | "edit";
  constituencies: Constituency[];
  initial: Project | null;
  onCreate: (payload: any) => void;
  onUpdate: (id: number, payload: any) => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title || "",
    description: initial?.description || "",
    category: (initial?.category as ProjectCategory) || "Education",
    status: (initial?.status as ProjectStatus) || "Planned",
    budget: initial?.budget ? String(initial.budget) : "",
    spent: initial?.spent != null ? String(initial.spent) : "",
    progress: initial?.progress != null ? String(initial.progress) : "",
    constituency_code: initial?.constituency_code || "",
    start_date: isoToDate(initial?.start_date || ""),
    completion_date: isoToDate(initial?.completion_date || ""),

    // procurement summary on project (optional)
    contractor_name: initial?.contractor_name || "",
    tender_id: initial?.tender_id || "",
    procurement_method: initial?.procurement_method || "Open Tender",
    contract_value: initial?.contract_value != null ? String(initial.contract_value) : "",
    award_date: isoToDate(initial?.award_date || ""),
  });

  const selectedCons = useMemo(() => {
    return constituencies.find((c) => c.code === form.constituency_code) || null;
  }, [form.constituency_code, constituencies]);

  const submit = () => {
    if (!form.title.trim() || !form.budget) {
      alert("Title and Budget are required.");
      return;
    }
    if (mode === "create" && !form.constituency_code) {
      alert("Constituency is required when creating a project.");
      return;
    }

    // Build payload carefully (send only clean values)
    const payload: any = {
      title: form.title.trim(),
      description: form.description?.trim() || null,
      category: form.category,
      status: form.status,
      budget: Number(form.budget),
      spent: form.spent === "" ? null : Number(form.spent),
      progress: form.progress === "" ? null : Number(form.progress),
      constituency_code: form.constituency_code || (initial?.constituency_code ?? null),
      start_date: form.start_date ? form.start_date : null,
      completion_date: form.completion_date ? form.completion_date : null,

      contractor_name: form.contractor_name?.trim() || null,
      tender_id: form.tender_id?.trim() || null,
      procurement_method: form.procurement_method?.trim() || null,
      contract_value: form.contract_value === "" ? null : Number(form.contract_value),
      award_date: form.award_date ? form.award_date : null,
    };

    if (mode === "create") return onCreate(payload);
    if (!initial?.id) return;
    return onUpdate(initial.id, payload);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Field label="Project Title">
          <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            placeholder="e.g. Kithimani Health Centre Expansion"
          />
        </Field>

        <Field label="Constituency (code)">
          <select
            value={form.constituency_code}
            onChange={(e) => setForm((p) => ({ ...p, constituency_code: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            disabled={mode === "edit"} // avoid accidental relocation in MVP
          >
            <option value="">{mode === "edit" ? "Locked in edit (MVP)" : "Select constituency..."}</option>
            {constituencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name} ({c.county})
              </option>
            ))}
          </select>
          {selectedCons && (
            <p className="text-xs text-slate-500 mt-1">
              MP: {selectedCons.mp_name} • County: {selectedCons.county}
            </p>
          )}
        </Field>

        <Field label="Category">
          <select
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as any }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
          >
            <option value="Education">Education</option>
            <option value="Health">Health</option>
            <option value="Water">Water</option>
            <option value="Infrastructure">Infrastructure</option>
            <option value="Security">Security</option>
            <option value="Environment">Environment</option>
            <option value="Other">Other</option>
          </select>
        </Field>

        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as any }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
          >
            <option value="Planned">Planned</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
            <option value="Flagged">Flagged</option>
          </select>
        </Field>

        <Field label="Budget (KES)">
          <input
            type="number"
            value={form.budget}
            onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            placeholder="e.g. 4100000"
          />
        </Field>

        <Field label="Spent (KES)">
          <input
            type="number"
            value={form.spent}
            onChange={(e) => setForm((p) => ({ ...p, spent: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            placeholder="e.g. 1000000"
          />
        </Field>

        <Field label="Progress (%)">
          <input
            type="number"
            min={0}
            max={100}
            value={form.progress}
            onChange={(e) => setForm((p) => ({ ...p, progress: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            placeholder="0 - 100"
          />
        </Field>

        <Field label="Start Date">
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
          />
        </Field>

        <Field label="Completion Date">
          <input
            type="date"
            value={form.completion_date}
            onChange={(e) => setForm((p) => ({ ...p, completion_date: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
          />
        </Field>

        <Field label="Contractor Name (optional)">
          <input
            value={form.contractor_name}
            onChange={(e) => setForm((p) => ({ ...p, contractor_name: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            placeholder="e.g. AquaDrill Services Ltd"
          />
        </Field>

        <Field label="Tender ID (optional)">
          <input
            value={form.tender_id}
            onChange={(e) => setForm((p) => ({ ...p, tender_id: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            placeholder="e.g. NG-CDF/YATTA/2025/015"
          />
        </Field>

        <Field label="Procurement Method (optional)">
          <select
            value={form.procurement_method}
            onChange={(e) => setForm((p) => ({ ...p, procurement_method: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
          >
            <option value="Open Tender">Open Tender</option>
            <option value="RFQ">RFQ</option>
            <option value="Direct Procurement">Direct Procurement</option>
            <option value="Restricted Tender">Restricted Tender</option>
          </select>
        </Field>

        <Field label="Contract Value (optional)">
          <input
            type="number"
            value={form.contract_value}
            onChange={(e) => setForm((p) => ({ ...p, contract_value: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            placeholder="e.g. 4100000"
          />
        </Field>

        <Field label="Award Date (optional)">
          <input
            type="date"
            value={form.award_date}
            onChange={(e) => setForm((p) => ({ ...p, award_date: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
          />
        </Field>
      </div>

      <Field label="Description">
        <textarea
          rows={5}
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 resize-none"
          placeholder="Full project description..."
        />
      </Field>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={submit}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50 transition"
        >
          {saving ? "Saving..." : mode === "create" ? "Create Project" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function AwardForm({
  saving,
  mode,
  projects,
  contractors,
  initial,
  onCreate,
  onUpdate,
}: {
  saving: boolean;
  mode: "create" | "edit";
  projects: Project[];
  contractors: Contractor[];
  initial: Award | null;
  onCreate: (payload: any) => void;
  onUpdate: (id: number, payload: any) => void;
}) {
  const [form, setForm] = useState({
    project_id: initial ? String(initial.project_id) : "",
    contractor_id: initial ? String(initial.contractor_id) : "",
    tender_id: initial?.tender_id || "",
    procurement_method: initial?.procurement_method || "Open Tender",
    contract_value: initial ? String(initial.contract_value) : "",
    award_date: initial ? isoToDate(initial.award_date) : "",
    performance_flag: initial?.performance_flag || false,
    performance_flag_reason: initial?.performance_flag_reason || "",
  });

  const submit = () => {
    if (!form.project_id || !form.contractor_id || !form.tender_id.trim() || !form.contract_value || !form.award_date) {
      alert("Project, Contractor, Tender ID, Contract Value, and Award Date are required.");
      return;
    }

    const payload: any = {
      project_id: Number(form.project_id),
      contractor_id: Number(form.contractor_id),
      tender_id: form.tender_id.trim(),
      procurement_method: form.procurement_method,
      contract_value: Number(form.contract_value),
      award_date: form.award_date,
      performance_flag: form.performance_flag,
      performance_flag_reason: form.performance_flag ? (form.performance_flag_reason?.trim() || "Flagged in admin review") : null,
    };

    if (mode === "create") return onCreate(payload);
    if (!initial?.id) return;
    return onUpdate(initial.id, payload);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Field label="Project">
          <select
            value={form.project_id}
            onChange={(e) => setForm((p) => ({ ...p, project_id: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
          >
            <option value="">Select project...</option>
            {projects
              .slice()
              .sort((a, b) => b.id - a.id)
              .map((p) => (
                <option key={p.id} value={String(p.id)}>
                  #{p.id} — {p.title}
                </option>
              ))}
          </select>
        </Field>

        <Field label="Contractor">
          <select
            value={form.contractor_id}
            onChange={(e) => setForm((p) => ({ ...p, contractor_id: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
          >
            <option value="">Select contractor...</option>
            {contractors.map((c) => (
              <option key={c.id} value={String(c.id)}>
                #{c.id} — {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tender ID">
          <input
            value={form.tender_id}
            onChange={(e) => setForm((p) => ({ ...p, tender_id: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            placeholder="NG-CDF/..."
          />
        </Field>

        <Field label="Procurement Method">
          <select
            value={form.procurement_method}
            onChange={(e) => setForm((p) => ({ ...p, procurement_method: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
          >
            <option value="Open Tender">Open Tender</option>
            <option value="RFQ">RFQ</option>
            <option value="Direct Procurement">Direct Procurement</option>
            <option value="Restricted Tender">Restricted Tender</option>
          </select>
        </Field>

        <Field label="Contract Value (KES)">
          <input
            type="number"
            value={form.contract_value}
            onChange={(e) => setForm((p) => ({ ...p, contract_value: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            placeholder="e.g. 1900000"
          />
        </Field>

        <Field label="Award Date">
          <input
            type="date"
            value={form.award_date}
            onChange={(e) => setForm((p) => ({ ...p, award_date: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
          />
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={form.performance_flag}
            onChange={(e) => setForm((p) => ({ ...p, performance_flag: e.target.checked }))}
            className="w-4 h-4"
          />
          Performance Flag
        </label>

        {form.performance_flag && (
          <Field label="Flag Reason">
            <input
              value={form.performance_flag_reason}
              onChange={(e) => setForm((p) => ({ ...p, performance_flag_reason: e.target.value }))}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
              placeholder="Reason for flag..."
            />
          </Field>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={submit}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50 transition"
        >
          {saving ? "Saving..." : mode === "create" ? "Create Award" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function ContractorForm({
  saving,
  mode,
  initial,
  onCreate,
  onUpdate,
}: {
  saving: boolean;
  mode: "create" | "edit";
  initial: Contractor | null;
  onCreate: (payload: any) => void;
  onUpdate: (id: number, payload: any) => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    phone: initial?.phone || "",
    email: initial?.email || "",
    registration_no: initial?.registration_no || "",
    address: initial?.address || "",
  });

  const submit = () => {
    if (!form.name.trim()) {
      alert("Contractor name is required.");
      return;
    }

    // Only send optional fields if filled (safe for strict backends)
    const payload: any = { name: form.name.trim() };
    if (form.phone.trim()) payload.phone = form.phone.trim();
    if (form.email.trim()) payload.email = form.email.trim();
    if (form.registration_no.trim()) payload.registration_no = form.registration_no.trim();
    if (form.address.trim()) payload.address = form.address.trim();

    if (mode === "create") return onCreate(payload);
    if (!initial?.id) return;
    return onUpdate(initial.id, payload);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Field label="Contractor Name">
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            placeholder="e.g. AquaDrill Services Ltd"
          />
        </Field>

        <Field label="Phone (optional)">
          <input
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            placeholder="+2547..."
          />
        </Field>

        <Field label="Email (optional)">
          <input
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            placeholder="info@company.com"
          />
        </Field>

        <Field label="Registration No (optional)">
          <input
            value={form.registration_no}
            onChange={(e) => setForm((p) => ({ ...p, registration_no: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            placeholder="e.g. CPR/2019/..."
          />
        </Field>
      </div>

      <Field label="Address (optional)">
        <input
          value={form.address}
          onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
          placeholder="City / County / PO Box..."
        />
      </Field>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={submit}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50 transition"
        >
          {saving ? "Saving..." : mode === "create" ? "Create Contractor" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      {children}
    </div>
  );
}

// src/pages/Admin/ProjectEdit.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ChevronLeft, Save, AlertCircle } from "lucide-react";
import api from "../../api/client";

interface Project {
  id: number;
  title: string;
  description?: string;
  category: string;
  status: string;
  budget: number;
  spent?: number | null;
  progress?: number | null;
  constituency_name: string;
  county: string;
  mp_name: string;
  start_date?: string | null;
  completion_date?: string | null;

  // procurement summary fields
  contractor_name?: string | null;
  tender_id?: string | null;
  procurement_method?: string | null;
  contract_value?: number | null;
  award_date?: string | null;
}

const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return "";
  return String(dateString).split("T")[0];
};

export default function AdminProjectEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await api.get(`/projects/${id}`);
        setProject(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load project");
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  const handleSave = async () => {
    if (!project) return;
    setSaving(true);
    try {
      const updated = await api.put(`/projects/${project.id}`, project);
      setProject(updated.data);
      alert("Project updated successfully!");
    } catch (err) {
      alert("Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const handleNumberChange = (
    field: "budget" | "spent" | "progress" | "contract_value",
    value: string
  ) => {
    const num = value === "" ? null : Number(value);
    setProject((prev) => (prev ? { ...prev, [field]: num } : null));
  };

  if (loading) {
    return <div className="p-20 text-center text-xl text-slate-600">Loading project...</div>;
  }

  if (error || !project) {
    return (
      <div className="p-20 text-center">
        <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
        <p className="text-xl text-red-700">{error || "Project not found"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/projects")}
            className="inline-flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
          >
            <ChevronLeft size={20} />
            Back to Projects
          </button>
          <h1 className="text-3xl font-bold text-slate-900">Edit Project</h1>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-70 transition"
        >
          <Save size={20} />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Edit Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Project Title</label>
            <input
              type="text"
              value={project.title}
              onChange={(e) => setProject({ ...project, title: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
            <select
              value={project.category}
              onChange={(e) => setProject({ ...project, category: e.target.value })}
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
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <select
              value={project.status}
              onChange={(e) => setProject({ ...project, status: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            >
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
              <option value="Flagged">Flagged</option>
              <option value="Planned">Planned</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Budget (KES)</label>
            <input
              type="number"
              value={project.budget || ""}
              onChange={(e) => handleNumberChange("budget", e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Amount Spent (KES)</label>
            <input
              type="number"
              value={project.spent ?? ""}
              onChange={(e) => handleNumberChange("spent", e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Progress (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={project.progress ?? ""}
              onChange={(e) => handleNumberChange("progress", e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
            <textarea
              rows={6}
              value={project.description || ""}
              onChange={(e) => setProject({ ...project, description: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
              <input
                type="date"
                value={formatDate(project.start_date)}
                onChange={(e) => setProject({ ...project, start_date: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Completion Date</label>
              <input
                type="date"
                value={formatDate(project.completion_date)}
                onChange={(e) => setProject({ ...project, completion_date: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Procurement Summary */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Procurement Summary</h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Contractor Name</label>
              <input
                value={project.contractor_name ?? ""}
                onChange={(e) => setProject({ ...project, contractor_name: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                placeholder="e.g. Mavuno Builders Ltd"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tender ID</label>
              <input
                value={project.tender_id ?? ""}
                onChange={(e) => setProject({ ...project, tender_id: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                placeholder="NG-CDF/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Procurement Method</label>
              <select
                value={project.procurement_method ?? "Open Tender"}
                onChange={(e) => setProject({ ...project, procurement_method: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
              >
                <option value="Open Tender">Open Tender</option>
                <option value="RFQ">RFQ</option>
                <option value="Direct Procurement">Direct Procurement</option>
                <option value="Restricted Tender">Restricted Tender</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Contract Value (KES)
                </label>
                <input
                  type="number"
                  value={project.contract_value ?? ""}
                  onChange={(e) => handleNumberChange("contract_value", e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Award Date</label>
                <input
                  type="date"
                  value={formatDate(project.award_date)}
                  onChange={(e) => setProject({ ...project, award_date: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4">Project Location & Leadership</h3>
            <div className="space-y-3 text-sm">
              <p>
                <strong>Constituency:</strong> {project.constituency_name}
              </p>
              <p>
                <strong>County:</strong> {project.county}
              </p>
              <p>
                <strong>MP:</strong> Hon. {project.mp_name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button at Bottom */}
      <div className="flex justify-end pt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white font-semibold text-lg rounded-xl hover:bg-emerald-700 disabled:opacity-70 transition"
        >
          <Save size={22} />
          {saving ? "Saving Changes..." : "Save All Changes"}
        </button>
      </div>
    </div>
  );
}

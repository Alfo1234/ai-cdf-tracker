// frontend/src/pages/Projects/ProjectDetail.tsx
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { Mail, MessageSquare, Camera, Send } from "lucide-react";
import {
  Calendar,
  MapPin,
  User,
  AlertCircle,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  FileText,
  Sparkles,
  ChevronLeft,
} from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return "Not specified";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

interface Project {
  id: number;
  title: string;
  description?: string;
  category: string;
  status: string;
  budget: number;
  spent?: number;
  progress?: number;
  constituency_name: string;
  county: string;
  mp_name: string;
  start_date?: string | null;
  completion_date?: string | null;
  anomaly_score?: number;
  ai_summary?: string;
}

interface Image {
  id: number;
  filename: string;
  caption: string;
  uploaded_by: string;
  uploaded_at: string;
  url: string;
  object_name: string;
}

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [images, setImages] = useState<Image[]>([]); // NEW: Images state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setLoading(true);

        // Fetch project details
        const projectResponse = await api.get(`/projects/${id}`);
        setProject(projectResponse.data);

        // Fetch public images
        const imagesResponse = await api.get(`/projects/${id}/images/public`);
        setImages(imagesResponse.data);

      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-sky-600 mx-auto" />
          <p className="mt-4 text-slate-600">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-slate-900">Project Not Found</h1>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-center text-red-700 font-medium">{error || "No project found"}</p>
        </div>
      </div>
    );
  }

  const spent = project.spent || 0;
  const progress = project.progress || 0;
  const remaining = project.budget - spent;

  const getStatusIcon = () => {
    switch (project.status) {
      case "Completed":
        return <CheckCircle2 className="w-6 h-6 text-emerald-600" />;
      case "Ongoing":
        return <Loader2 className="w-6 h-6 text-amber-600" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-red-600" />;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header with Back Button */}
      <div>
        <button
          onClick={() => navigate("/projects")}
          className="inline-flex items-center gap-2 mb-6 px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 hover:shadow-md transition-all duration-200"
        >
          <ChevronLeft size={20} />
          Back to Projects
        </button>

        <h1 className="text-4xl font-bold text-slate-900">{project.title}</h1>
        <div className="flex items-center gap-6 mt-4 text-slate-600">
          <div className="flex items-center gap-2">
            <MapPin size={20} />
            <span>{project.constituency_name}, {project.county}</span>
          </div>
          <div className="flex items-center gap-2">
            <User size={20} />
            <span>{project.mp_name}</span>
          </div>
        </div>
      </div>

      {/* Top Row: Status + Category */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Status</p>
              <div className="flex items-center gap-3 mt-2">
                {getStatusIcon()}
                <span className="text-xl font-semibold text-slate-900">{project.status}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <p className="text-sm text-slate-600">Category</p>
          <span className="mt-2 inline-block px-5 py-2 text-sm font-medium rounded-full bg-purple-100 text-purple-700">
            {project.category}
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <p className="text-sm text-slate-600">Progress</p>
          <div className="mt-3">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold">{progress}% Complete</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-6">
              <div
                className={`h-6 rounded-full transition-all duration-1000 ${
                  progress === 100 ? "bg-emerald-500" : progress >= 50 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Budget Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="w-8 h-8 text-emerald-600" />
            <h2 className="text-2xl font-bold text-slate-900">Budget Overview</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-slate-600">Total Budget</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(project.budget)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-600">Amount Spent</p>
              <p className="text-3xl font-bold text-amber-600 mt-2">{formatCurrency(spent)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-600">Remaining</p>
              <p className="text-3xl font-bold text-sky-600 mt-2">{formatCurrency(remaining)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-8 h-8" />
            <h3 className="text-xl font-bold">Utilization Rate</h3>
          </div>
          <p className="text-5xl font-bold">{((spent / project.budget) * 100).toFixed(1)}%</p>
          <p className="mt-4 opacity-90">of allocated funds disbursed</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-8 h-8 text-sky-600" />
          <h2 className="text-2xl font-bold text-slate-900">Project Timeline</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Start Date</p>
              <p className="text-xl font-semibold text-slate-900">{formatDate(project.start_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Expected Completion</p>
              <p className="text-xl font-semibold text-slate-900">{formatDate(project.completion_date)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-slate-600" />
            <h2 className="text-2xl font-bold text-slate-900">Project Description</h2>
          </div>
          <p className="text-slate-700 leading-relaxed text-lg whitespace-pre-wrap">
            {project.description}
          </p>
        </div>
      )}

      {/* Documents & Photos — NOW REAL GALLERY */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Camera className="w-8 h-8 text-sky-600" />
          <h2 className="text-2xl font-bold text-slate-900">On-Site Photos & Evidence</h2>
        </div>

        {images.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Camera className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <p>No photos uploaded yet for this project.</p>
            <p className="text-sm mt-2">Citizen observations or admin uploads will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((img) => (
              <div
                key={img.id}
                className="group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300"
              >
               <img
  src={`/api/v1/projects/${project.id}/images/${img.id}/view`}
  alt={img.caption || img.filename}
  className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105"
  onError={(e) => {
    e.currentTarget.src = "https://via.placeholder.com/400x300?text=Image+Error";
  }}
/>

                {/* Overlay with info */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <p className="text-white font-medium text-lg line-clamp-2">{img.caption}</p>
                  <p className="text-white/80 text-sm mt-1">
                    Uploaded by {img.uploaded_by} on {new Date(img.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-slate-500 mt-8">
          Photos show real progress, issues, or completion. Help keep CDF funds accountable!
        </p>
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-8 h-8" />
          <h2 className="text-2xl font-bold">AI-Powered Insights</h2>
        </div>
        <p className="text-purple-100 text-lg leading-relaxed">
          {project.ai_summary || "AI analysis coming soon — automated summary, anomaly detection, and plain-language explanation in English & Swahili."}
        </p>
        {project.anomaly_score && (
          <div className="mt-6 inline-flex items-center gap-3 px-5 py-3 bg-white/20 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
            <span className="font-semibold">Anomaly Risk Score: {project.anomaly_score}/100</span>
          </div>
        )}
      </div>

      {/* Citizen Feedback Form */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-8">
          <MessageSquare className="w-8 h-8 text-emerald-600" />
          <h2 className="text-2xl font-bold text-slate-900">Share Your Observation</h2>
        </div>


        {/* Encouraging & Guiding Introduction */}
        <div className="mb-8">
          <p className="text-slate-700 leading-relaxed text-lg">
            Your observation helps ensure CDF funds are used well. Whether you've seen good progress, delays, poor quality work, or something concerning.
            <strong className="text-emerald-700"> constructive feedback creates real change</strong>.
          </p>
          <p className="text-slate-600 mt-4">
            All submissions are reviewed by a moderation team before any action. You can remain completely anonymous.
          </p>
        </div>

        {/* Community Guidelines Box */}
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-6 mb-8">
          <p className="font-semibold text-sky-900 mb-3">Please keep your feedback:</p>
          <ul className="space-y-2 text-sky-800">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-sky-600 mt-0.5 flex-shrink-0" />
              <span>Specific and factual (e.g., "Construction stopped 4 months ago with no explanation")</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-sky-600 mt-0.5 flex-shrink-0" />
              <span>Focused on the project and its implementation</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-sky-600 mt-0.5 flex-shrink-0" />
              <span>Respectful, no personal attacks or hate speech</span>
            </li>
          </ul>
          <p className="text-red-700 text-sm mt-4 font-bold">
            Submissions containing threats, hate speech, or defamatory content will be rejected.
          </p>
        </div>

        {/* The Form */}
        <form 
            onSubmit={async (e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();

              const formData = new FormData(e.currentTarget);
              const name = formData.get("name")?.toString() || null;
              const email = formData.get("email")?.toString() || null;
              const message = formData.get("message")?.toString();

              if (!message?.trim()) {
                alert("Please write your observation");
                return;
              }

              try {
                const response = await api.post("/feedback/", {
                  project_id: project.id,
                  name: name || null,
                  email: email || null,
                  message: message.trim(),
                });

                if (response.status === 201) {
                  setFeedbackSubmitted(true);
                }
              } catch (err) {
                alert("Failed to submit. Please try again later.");
                console.error(err);
              }
            }}
            className="space-y-7"
          >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <User size={18} />
                Your Name <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                name="name"
                placeholder="Enter your name (not required)"
                className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Mail size={18} />
                Email <span className="text-slate-500 font-normal">(optional – for follow-up only)</span>
              </label>
              <input
                type="email"
                name="email"
                placeholder="your.email@example.com"
                className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
              <p className="text-xs text-slate-500 mt-2">We will never share your email publicly.</p>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <MessageSquare size={18} />
              Your Observation <span className="text-red-600">*</span>
            </label>
            <textarea
              name="message"
              rows={7}
              required
              placeholder="Describe what you've seen or experienced with this project. Be as specific as possible..."
              className="w-full px-4 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none transition"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Camera size={18} />
              Attach Photo Evidence <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition cursor-pointer">
              <Camera className="w-14 h-14 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-700 font-medium">Click to upload or drag and drop</p>
              <p className="text-sm text-slate-500 mt-2">JPG, PNG • Max 10MB • Multiple photos allowed</p>
              <input type="file" multiple accept="image/*" className="hidden" />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="inline-flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white font-semibold text-lg rounded-xl hover:bg-emerald-700 hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              Submit Observation
              <Send size={22} />
            </button>
          </div>
        </form>

        {/* Success Message */}
        {feedbackSubmitted && (
          <div className="mt-10 p-8 bg-emerald-50 border-2 border-emerald-200 rounded-2xl text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-5" />
            <h3 className="text-2xl font-bold text-emerald-800 mb-3">
              Thank You for Your Observation
            </h3>
            <p className="text-emerald-700 text-lg max-w-2xl mx-auto leading-relaxed">
              Your submission has been received and will be carefully reviewed by the moderation team. 
              Constructive reports like yours help ensure public funds are used properly.
            </p>
            <button
              onClick={() => setFeedbackSubmitted(false)}
              className="mt-6 text-emerald-700 font-medium hover:underline"
            >
              Submit another observation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard/Dashboard";
import Projects from "./pages/Projects/Projects";
import ProjectDetail from "./pages/Projects/ProjectDetail";

import AdminLogin from "./pages/Admin/Login";
import AdmLayout from "./components/layout/AdminLayout";
import AdminOverview from "./pages/Admin/Overview";
import AdminFeedback from "./pages/Admin/Feedback";
import AdminProjects from "./pages/Admin/Projects";
import AdminProjectEdit from "./pages/Admin/ProjectEdit";

// Public analytics pages
import Analytics from "./pages/Analytics/Analytics";
import ProjectAnalyticsDetail from "./pages/Analytics/ProjectAnalyticsDetail";

// Admin pages
import AdminAnalytics from "./pages/Admin/Analytics";
import AdminUsers from "./pages/Admin/Users";

// ✅ Admin Guard
import AdminGuard from "./components/auth/AdminGuard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />

          {/* Public Analytics */}
          <Route path="analytics" element={<Analytics />} />
          <Route
            path="analytics/projects/:id"
            element={<ProjectAnalyticsDetail />}
          />
        </Route>

        {/* Admin Login */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* ✅ Admin Protected Routes */}
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdmLayout />
            </AdminGuard>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="feedback" element={<AdminFeedback />} />
          <Route path="projects" element={<AdminProjects />} />
          <Route path="projects/:id" element={<AdminProjectEdit />} />

          {/* Admin Governance Tools */}
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

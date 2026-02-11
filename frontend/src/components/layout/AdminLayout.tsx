// src/components/layout/AdminLayout.tsx
import { Outlet } from "react-router-dom";  // ← ADD THIS IMPORT
import AdminSidebar from "./AdminSidebar";

export default function AdmLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-sky-50 flex">
      <AdminSidebar />

      <div className="flex-1 ml-64">
        <main className="p-6 lg:p-10">
          <Outlet />  {/* ← ADD THIS — THIS IS THE KEY! */}
        </main>
      </div>
    </div>
  );
}
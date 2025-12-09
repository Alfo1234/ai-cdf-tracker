import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
      {/* Fixed sidebar on the left */}
      <Sidebar />

      {/* Main content area shifted to the right of sidebar */}
      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />
        <main className="px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

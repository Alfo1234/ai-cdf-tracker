// src/components/layout/Layout.tsx
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { Helmet } from "react-helmet";

export default function Layout() {
  return (
    <>
      <Helmet>
        <title>AI-Powered CDF Tracker • NG-CDF Transparency Portal</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 flex flex-col">
        <div className="flex flex-1">
          <Sidebar />

          <div className="flex-1 flex flex-col ml-0 lg:ml-64 transition-all duration-300">
            <Navbar />
            <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 overflow-auto">
              <Outlet />
            </main>
            <Footer /> 
          </div>
        </div>
      </div>
    </>
  );
}
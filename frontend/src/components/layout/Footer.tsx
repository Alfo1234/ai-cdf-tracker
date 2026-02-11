// frontend/src/components/Footer.tsx
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div>
          <h3 className="text-white font-bold text-lg">
            AI-Powered CDF <span className="text-sky-400">Tracker</span>
          </h3>
          <p className="mt-2">Transparency • Accountability • Citizen Empowerment</p>
        </div>

        <div className="space-y-2">
          <p className="text-gray-300 font-medium">Quick Links</p>
          <div className="space-y-1">
            <Link to="/" className="block hover:text-white transition">Dashboard</Link>
            <Link to="/projects" className="block hover:text-white transition">Projects</Link>
            <Link to="/analytics" className="block hover:text-white transition">Analytics</Link>
            <a href="#" className="block hover:text-white transition">Reports</a>
            <a href="#" className="block hover:text-white transition">Feedback</a>
          </div>
        </div>

        <div className="text-right">
          <p className="text-gray-300 font-medium">Contact</p>
          <p className="mt-2">info@cdftracker.go.ke</p>
          <p className="text-xs mt-4">Version 1.2 • © 2025 All rights reserved</p>
        </div>
      </div>
    </footer>
  );
}
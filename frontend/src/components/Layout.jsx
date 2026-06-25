import { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Upload, Wand2, BarChart3, Eye,
  Layers, Database, GitBranch, Activity, Wifi, WifiOff,
  FlaskConical, Menu, X,
} from "lucide-react";
import clsx from "clsx";
import { useQuery } from "react-query";
import { apiHealth } from "../utils/api";

const NAV = [
  {
    label: "Workflow", items: [
      { to: "/",           icon: LayoutDashboard, label: "Dashboard"        },
      { to: "/ingest",     icon: Upload,          label: "Data Ingestion"   },
      { to: "/denoise",    icon: Wand2,           label: "Denoise Pipeline" },
      { to: "/evaluation", icon: BarChart3,       label: "Evaluation"       },
    ],
  },
  {
    label: "Clinical", items: [
      { to: "/radiologist", icon: Eye,    label: "Radiologist View" },
      { to: "/batch",       icon: Layers, label: "Batch Processing" },
    ],
  },
  {
    label: "System", items: [
      { to: "/dataset",      icon: Database,  label: "Dataset Info"  },
      { to: "/architecture", icon: GitBranch, label: "Architecture"  },
    ],
  },
];

const PAGE_TITLES = {
  "/":             "Dashboard",
  "/ingest":       "Data Ingestion",
  "/denoise":      "Denoise Pipeline",
  "/evaluation":   "Evaluation Metrics",
  "/radiologist":  "Radiologist Workstation",
  "/batch":        "Batch Processing",
  "/dataset":      "Dataset Information",
  "/architecture": "System Architecture",
};

function SidebarContent({ onNavClick }) {
  const { data: health, isError } = useQuery(
    "health",
    () => apiHealth().then(r => r.data),
    { refetchInterval: 30000, retry: 1, retryDelay: 3000 }
  );
  const apiOk = !!health && !isError;
  const dbOk  = health?.database?.connected;

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--c-border)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg"
            style={{ background: "linear-gradient(135deg,#0d7377,#2d8c5c)" }}>
            🫁
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: "var(--c-text)" }}>LungDenoise</div>
            <div className="text-[10px] font-semibold" style={{ color: "var(--c-primary)" }}>AI Clinical · v1.0</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {NAV.map(group => (
          <div key={group.label}>
            <div className="section-label px-1">{group.label}</div>
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} end={to === "/"}
                  onClick={onNavClick}
                  className={({ isActive }) => clsx("nav-link", isActive && "active")}>
                  <Icon size={14} className="flex-shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Status footer */}
      <div className="p-3 space-y-2 flex-shrink-0" style={{ borderTop: "1px solid var(--c-border)" }}>
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg"
          style={{ background: apiOk ? "var(--c-secondary-l)" : "var(--c-danger-l)" }}>
          {apiOk
            ? <Wifi size={12} style={{ color: "var(--c-secondary)" }} />
            : <WifiOff size={12} style={{ color: "var(--c-danger)" }} />}
          <span className="text-[11px] font-semibold"
            style={{ color: apiOk ? "var(--c-secondary)" : "var(--c-danger)" }}>
            {apiOk ? "API Connected" : "API Offline"}
          </span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
          style={{ background: "var(--c-surface3)" }}>
          <Database size={11} style={{ color: dbOk ? "var(--c-secondary)" : "var(--c-text3)" }} />
          <span className="text-[10px]" style={{ color: "var(--c-text3)" }}>
            DB: {health?.database?.type || (apiOk ? "connecting…" : "—")}{dbOk ? " ✓" : ""}
          </span>
        </div>
        <div className="px-2 text-[10px]" style={{ color: "var(--c-text3)" }}>
          IQ-OTH/NCCD · 1,294 CT Scans
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const loc = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: health, isError } = useQuery(
    "health",
    () => apiHealth().then(r => r.data),
    { refetchInterval: 30000, retry: 1, retryDelay: 3000 }
  );
  const apiOk = !!health && !isError;

  return (
    <div className="flex h-screen overflow-hidden bg-medical-mesh">

      {/* ── Mobile overlay ─────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)} />
          {/* Drawer */}
          <aside className="absolute left-0 top-0 h-full w-64 z-50 shadow-2xl"
            style={{ background: "var(--c-surface)" }}>
            <button className="absolute top-3 right-3 p-1.5 rounded-lg"
              style={{ color: "var(--c-text3)" }}
              onClick={() => setMobileOpen(false)}>
              <X size={18} />
            </button>
            <SidebarContent onNavClick={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col"
        style={{
          background: "var(--c-surface)",
          borderRight: "1px solid var(--c-border)",
          boxShadow: "2px 0 8px rgba(13,115,119,.06)",
        }}>
        <SidebarContent onNavClick={() => {}} />
      </aside>

      {/* ── Main area ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="flex items-center justify-between px-4 flex-shrink-0"
          style={{
            background: "var(--c-surface)",
            borderBottom: "1px solid var(--c-border)",
            boxShadow: "0 1px 4px rgba(13,115,119,.06)",
            height: "52px",
          }}>
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger — only on mobile */}
            <button className="lg:hidden p-1.5 rounded-lg flex-shrink-0"
              style={{ color: "var(--c-text3)" }}
              onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </button>
            <h1 className="text-sm font-semibold truncate" style={{ color: "var(--c-text)" }}>
              {PAGE_TITLES[loc.pathname] || "LungDenoise AI"}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!apiOk && (
              <span className="tag tag-red text-[10px] hidden sm:inline-flex animate-pulse">
                <WifiOff size={9} /> No API
              </span>
            )}
            <span className="tag tag-teal text-[10px] hidden sm:inline-flex">
              <Activity size={9} /> AGF+DWT+DnCNN+TV
            </span>
            <span className="tag tag-green text-[10px] hidden md:inline-flex">
              <FlaskConical size={9} /> PSNR 34.76 dB
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5">
          {!apiOk && (
            <div className="mb-4 p-3 rounded-xl border flex items-start gap-3 text-sm"
              style={{ background: "var(--c-danger-l)", borderColor: "var(--c-danger)", color: "var(--c-danger)" }}>
              <WifiOff size={16} className="mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <strong>Cannot reach backend API.</strong>{" "}
                Set <code className="font-mono bg-white/60 px-1 rounded">VITE_API_URL</code> in Vercel env vars
                to your Render backend URL, e.g.{" "}
                <code className="font-mono bg-white/60 px-1 rounded">https://lungdenoise-api.onrender.com</code>.
                Backend may be cold-starting — wait 30 s and refresh.
              </div>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

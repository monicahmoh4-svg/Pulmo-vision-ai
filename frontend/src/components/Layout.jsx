import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Upload, Wand2, BarChart3, Eye,
  Layers, Database, GitBranch, Activity, Wifi, WifiOff,
  FlaskConical, Menu, X, Zap,
} from "lucide-react";
import clsx from "clsx";
import { useQuery } from "react-query";
import { apiHealth } from "../utils/api";
import SoundToggle from "./SoundToggle";

const NAV = [
  {
    label: "Workflow", items: [
      { to: "/",            icon: LayoutDashboard, label: "Dashboard"         },
      { to: "/ingest",      icon: Upload,          label: "Data Ingestion"    },
      { to: "/denoise",     icon: Wand2,           label: "Denoise Pipeline"  },
      { to: "/evaluation",  icon: BarChart3,       label: "Evaluation"        },
    ],
  },
  {
    label: "Clinical", items: [
      { to: "/radiologist", icon: Eye,    label: "Radiologist View"  },
      { to: "/batch",       icon: Layers, label: "Batch Processing"  },
    ],
  },
  {
    label: "System", items: [
      { to: "/dataset",      icon: Database,  label: "Dataset Info"   },
      { to: "/architecture", icon: GitBranch, label: "Architecture"   },
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

/* ── Ticker items shown in the header bar ────────────────────── */
const TICKER_ITEMS = [
  "🫁 LungDenoise AI v1.0",
  "★ PSNR 34.76 dB at 5% noise",
  "★ SSIM 1.0000 — perfect structural match",
  "Pipeline: AGF → Haar DWT L2 → BayesShrink → DnCNN → TV Smoothing",
  "Dataset: IQ-OTH/NCCD · 1,294 CT scans",
  "Noise estimator: Donoho-Johnstone Wavelet HH1",
  "★ MSE 26.46 at 5% AGBN — near-lossless denoising",
  "Outperforms BM3D, NLM, Bilateral, Gaussian, Median, DnCNN-only",
];

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
        <div className="flex items-center gap-3 animate-fade-right">
          <div
            className="logo-icon w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#0d7377,#2d8c5c)", boxShadow: "0 4px 14px rgba(13,115,119,.35)" }}
          >
            🫁
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: "var(--c-text)" }}>LungDenoise</div>
            <div className="text-[10px] font-semibold" style={{ color: "var(--c-primary)" }}>
              AI Clinical · v1.0
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {NAV.map((group, gi) => (
          <div key={group.label} className="animate-fade-up" style={{ animationDelay: `${gi * 80}ms` }}>
            <div className="section-label px-1">{group.label}</div>
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to} to={to} end={to === "/"}
                  onClick={onNavClick}
                  className={({ isActive }) => clsx("nav-link", isActive && "active")}
                >
                  <Icon size={14} className="flex-shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Status footer */}
      <div className="p-3 space-y-2 flex-shrink-0 animate-fade-up delay-400"
        style={{ borderTop: "1px solid var(--c-border)" }}>

        {/* API status with animated dot */}
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all"
          style={{ background: apiOk ? "var(--c-secondary-l)" : "var(--c-danger-l)" }}>
          <span className={`status-dot ${apiOk ? "online" : "offline"}`} />
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

        {/* Animated wave bars when API is online */}
        {apiOk && (
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="wave-bars">
              <span /><span /><span /><span /><span />
            </div>
            <span className="text-[10px]" style={{ color: "var(--c-text3)" }}>
              Pipeline active
            </span>
          </div>
        )}

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
  const [pageKey,    setPageKey]    = useState(loc.pathname);
  const prevPath = useRef(loc.pathname);

  /* Trigger page transition on route change */
  useEffect(() => {
    if (prevPath.current !== loc.pathname) {
      setPageKey(loc.pathname);
      prevPath.current = loc.pathname;
    }
    setMobileOpen(false);
  }, [loc.pathname]);

  const { data: health, isError } = useQuery(
    "health",
    () => apiHealth().then(r => r.data),
    { refetchInterval: 30000, retry: 1, retryDelay: 3000 }
  );
  const apiOk = !!health && !isError;

  const tickerText = TICKER_ITEMS.join("   ·   ");

  return (
    <div className="flex h-screen overflow-hidden bg-medical-mesh">

      {/* ── Mobile overlay ───────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 h-full w-64 z-50 shadow-2xl"
            style={{
              background: "var(--c-surface)",
              animation: "slideInLeft .28s var(--ease-spring) both",
            }}
          >
            <button
              className="absolute top-3 right-3 p-1.5 rounded-lg transition-all hover:bg-red-50"
              style={{ color: "var(--c-text3)" }}
              onClick={() => setMobileOpen(false)}
            >
              <X size={18} />
            </button>
            <SidebarContent onNavClick={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Desktop sidebar ──────────────────────────────────── */}
      <aside
        className="hidden lg:flex w-56 flex-shrink-0 flex-col animate-fade-right"
        style={{
          background:   "var(--c-surface)",
          borderRight:  "1px solid var(--c-border)",
          boxShadow:    "2px 0 12px rgba(13,115,119,.07)",
        }}
      >
        <SidebarContent onNavClick={() => {}} />
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header
          className="header-bar flex items-center justify-between px-4 flex-shrink-0 animate-fade-down"
          style={{
            background:   "var(--c-surface)",
            boxShadow:    "0 1px 6px rgba(13,115,119,.07)",
            height:       "52px",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="lg:hidden p-1.5 rounded-lg flex-shrink-0 transition-all hover:bg-gray-100 active:scale-90"
              style={{ color: "var(--c-text3)" }}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h1 className="text-sm font-semibold truncate animate-fade-in" style={{ color: "var(--c-text)" }}>
              {PAGE_TITLES[loc.pathname] || "LungDenoise AI"}
            </h1>
          </div>

          {/* Scrolling ticker — desktop only */}
          <div className="hidden md:block flex-1 mx-6 overflow-hidden">
            <div className="ticker-wrap">
              <div className="ticker-track text-[10px] font-medium" style={{ color: "var(--c-text3)" }}>
                {tickerText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{tickerText}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!apiOk && (
              <span className="tag tag-red text-[10px] hidden sm:inline-flex animate-pulse">
                <WifiOff size={9} /> No API
              </span>
            )}
            {apiOk && (
              <span className="tag tag-teal text-[10px] hidden sm:inline-flex">
                <span className="status-dot online" style={{ width:5, height:5 }} />
                Live
              </span>
            )}
            <span className="tag tag-teal text-[10px] hidden lg:inline-flex">
              <Activity size={9} /> AGF+DWT+DnCNN+TV
            </span>
            <span className="tag tag-green text-[10px] hidden xl:inline-flex">
              <Zap size={9} /> PSNR 34.76 dB
            </span>
            <SoundToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5">
          {!apiOk && (
            <div
              className="mb-4 p-3 rounded-xl border flex items-start gap-3 animate-fade-down"
              style={{ background: "var(--c-danger-l)", borderColor: "var(--c-danger)", color: "var(--c-danger)" }}
            >
              <WifiOff size={16} className="mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <strong>Cannot reach backend API.</strong>{" "}
                Set <code className="font-mono bg-white/60 px-1 rounded">VITE_API_URL</code> in Vercel env
                to your Render URL, e.g.{" "}
                <code className="font-mono bg-white/60 px-1 rounded">https://lungdenoise-api.onrender.com</code>.
                Cold-start may take 30 s — refresh after waiting.
              </div>
            </div>
          )}

          {/* Animated page wrapper — key changes on route to trigger animation */}
          <div key={pageKey} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

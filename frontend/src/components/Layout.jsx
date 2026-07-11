import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Upload, Wand2, BarChart3, Eye,
  Layers, Database, GitBranch, Activity, WifiOff,
  Menu, X, Zap, Loader2, RefreshCw,
} from "lucide-react";
import clsx from "clsx";
import { useQuery, useQueryClient } from "react-query";
import { apiHealth } from "../utils/api";
import SoundToggle from "./SoundToggle";

const NAV_GROUPS = [
  {
    label: "Workflow", items: [
      { to: "/",           icon: LayoutDashboard, label: "Dashboard"    },
      { to: "/ingest",     icon: Upload,          label: "Ingest"       },
      { to: "/denoise",    icon: Wand2,           label: "Denoise"      },
      { to: "/evaluation", icon: BarChart3,       label: "Evaluation"   },
    ],
  },
  {
    label: "Clinical", items: [
      { to: "/radiologist", icon: Eye,    label: "Radiologist" },
      { to: "/batch",       icon: Layers, label: "Batch"       },
    ],
  },
  {
    label: "System", items: [
      { to: "/dataset",      icon: Database,  label: "Dataset"      },
      { to: "/architecture", icon: GitBranch, label: "Architecture" },
    ],
  },
];

const ALL_NAV    = NAV_GROUPS.flatMap(g => g.items);
const BOTTOM_NAV = [
  { to: "/",            icon: LayoutDashboard, label: "Home"        },
  { to: "/ingest",      icon: Upload,          label: "Ingest"      },
  { to: "/denoise",     icon: Wand2,           label: "Denoise"     },
  { to: "/evaluation",  icon: BarChart3,       label: "Evaluation"  },
  { to: "/radiologist", icon: Eye,             label: "Radiologist" },
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

const TICKER = [
  "🫁 LungDenoise AI v1.0",
  "★ PSNR 34.76 dB at 5% noise",
  "★ SSIM 1.0000 — perfect structural match",
  "Pipeline: AGF → Haar DWT L2 → BayesShrink → DnCNN → TV Smoothing",
  "Dataset: IQ-OTH/NCCD · 1,294 CT scans",
  "★ MSE 26.46 at 5% AGBN — near-lossless denoising",
  "Outperforms BM3D, NLM, Bilateral, Gaussian, Median, DnCNN-only",
].join("   ·   ");

/* ── Connection status display ───────────────────────────────── */
function StatusBadge({ isLoading, apiOk, onRetry }) {
  if (isLoading) return (
    <span className="tag tag-slate text-[10px] hidden sm:inline-flex gap-1">
      <Loader2 size={9} className="animate-spin" /> Connecting…
    </span>
  );
  if (apiOk) return (
    <span className="tag tag-teal text-[10px] hidden sm:inline-flex gap-1">
      <span className="status-dot online" style={{ width:5, height:5 }} /> Live
    </span>
  );
  return (
    <button onClick={onRetry}
      className="tag tag-red text-[10px] hidden sm:inline-flex gap-1 cursor-pointer hover:opacity-80 transition-opacity"
      title="Click to retry connection">
      <WifiOff size={9} /> Offline — retry
    </button>
  );
}

/* ── Sidebar ─────────────────────────────────────────────────── */
function SidebarContent({ onNavClick, isLoading, apiOk, dbOk, dbType }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 flex-shrink-0" style={{ borderBottom:"1px solid var(--c-border)" }}>
        <div className="flex items-center gap-3">
          <div className="logo-icon w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background:"linear-gradient(135deg,#0d7377,#2d8c5c)", boxShadow:"0 4px 14px rgba(13,115,119,.35)" }}>
            🫁
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color:"var(--c-text)" }}>LungDenoise</div>
            <div className="text-[10px] font-semibold" style={{ color:"var(--c-primary)" }}>AI Clinical · v1.0</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className="animate-fade-up" style={{ animationDelay:`${gi*80}ms` }}>
            <div className="section-label px-1">{group.label}</div>
            <div className="space-y-0.5">
              {group.items.map(({ to, icon:Icon, label }) => (
                <NavLink key={to} to={to} end={to==="/"} onClick={onNavClick}
                  className={({ isActive }) => clsx("nav-link", isActive && "active")}>
                  <Icon size={14} className="flex-shrink-0" /><span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Status footer */}
      <div className="p-3 space-y-2 flex-shrink-0" style={{ borderTop:"1px solid var(--c-border)" }}>
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg" style={{
          background: isLoading ? "var(--c-surface3)" : apiOk ? "var(--c-secondary-l)" : "var(--c-danger-l)",
        }}>
          {isLoading
            ? <Loader2 size={10} className="animate-spin" style={{ color:"var(--c-text3)" }}/>
            : <span className={`status-dot ${apiOk?"online":"offline"}`}/>}
          <span className="text-[11px] font-semibold" style={{
            color: isLoading ? "var(--c-text3)" : apiOk ? "var(--c-secondary)" : "var(--c-danger)",
          }}>
            {isLoading ? "Connecting to Render…" : apiOk ? "API Connected" : "API Unreachable"}
          </span>
        </div>

        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background:"var(--c-surface3)" }}>
          <Database size={11} style={{ color:dbOk?"var(--c-secondary)":"var(--c-text3)" }}/>
          <span className="text-[10px]" style={{ color:"var(--c-text3)" }}>
            DB: {isLoading ? "…" : dbType||"—"}{dbOk?" ✓":""}
          </span>
        </div>

        {apiOk && (
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="wave-bars"><span/><span/><span/><span/><span/></div>
            <span className="text-[10px]" style={{ color:"var(--c-text3)" }}>Pipeline active</span>
          </div>
        )}
        <div className="px-2 text-[10px]" style={{ color:"var(--c-text3)" }}>IQ-OTH/NCCD · 1,294 CT Scans</div>
      </div>
    </div>
  );
}

/* ── More sheet ──────────────────────────────────────────────── */
function MoreDrawer({ open, onClose }) {
  if (!open) return null;
  const extra = ALL_NAV.filter(n => !BOTTOM_NAV.find(b => b.to === n.to));
  return (
    <div className="fixed inset-0 z-50 lg:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"/>
      <div className="absolute bottom-16 left-0 right-0 rounded-t-2xl p-4"
        style={{ background:"var(--c-surface)", boxShadow:"0 -8px 32px rgba(0,0,0,.15)" }}
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background:"var(--c-border2)" }}/>
        <div className="text-xs font-bold mb-3 px-1" style={{ color:"var(--c-text3)" }}>MORE PAGES</div>
        <div className="grid grid-cols-4 gap-2">
          {extra.map(({ to, icon:Icon, label }) => (
            <NavLink key={to} to={to} end={to==="/"} onClick={onClose}
              style={({ isActive }) => ({
                display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                padding:12, borderRadius:12, textAlign:"center", textDecoration:"none",
                background: isActive ? "var(--c-primary-l)" : "var(--c-surface3)",
              })}>
              {({ isActive }) => (
                <>
                  <Icon size={20} style={{ color:isActive?"var(--c-primary)":"var(--c-text3)" }}/>
                  <span style={{ fontSize:10, fontWeight:600, color:isActive?"var(--c-primary)":"var(--c-text3)", lineHeight:1.2 }}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Layout ──────────────────────────────────────────────────── */
export default function Layout() {
  const loc = useLocation();
  const qc  = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen,   setMoreOpen]   = useState(false);
  const [pageKey,    setPageKey]    = useState(loc.pathname);
  const prevPath = useRef(loc.pathname);

  useEffect(() => {
    if (prevPath.current !== loc.pathname) {
      setPageKey(loc.pathname);
      prevPath.current = loc.pathname;
    }
    setMobileOpen(false);
    setMoreOpen(false);
  }, [loc.pathname]);

  const { data:health, isError, isLoading, failureCount } = useQuery(
    "health",
    () => apiHealth().then(r => r.data),
    {
      // Retry every 5 s during cold-start, then every 30 s once connected
      refetchInterval:        (data) => data ? 30000 : 5000,
      // 12 retries × 5 s = 60 s of cold-start tolerance
      retry:                  12,
      retryDelay:             5000,
      // Keep showing stale data while refetching
      keepPreviousData:       true,
      useErrorBoundary:       false,
      // Don't log query errors to console
      onError:                () => {},
    }
  );

  const apiOk  = !!health && !isError;
  const dbOk   = health?.database?.connected ?? false;
  const dbType = health?.database?.type ?? "";

  // Show "Connecting" while loading OR while retrying (failureCount > 0 but not yet error)
  const connecting = isLoading || (!apiOk && failureCount > 0 && failureCount <= 12);

  // Only show offline banner after all 12 retries exhausted (~60 s)
  const showOffline = isError && failureCount > 12;

  const retry = () => qc.invalidateQueries("health");

  return (
    <div className="flex h-screen overflow-hidden bg-medical-mesh">

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}/>
          <aside className="absolute left-0 top-0 h-full w-64 z-50 shadow-2xl"
            style={{ background:"var(--c-surface)", animation:"slideInLeft .28s var(--ease-spring) both" }}>
            <button className="absolute top-3 right-3 p-1.5 rounded-lg"
              style={{ color:"var(--c-text3)" }} onClick={() => setMobileOpen(false)}>
              <X size={18}/>
            </button>
            <SidebarContent onNavClick={() => setMobileOpen(false)}
              isLoading={connecting} apiOk={apiOk} dbOk={dbOk} dbType={dbType}/>
          </aside>
        </div>
      )}

      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)}/>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col"
        style={{ background:"var(--c-surface)", borderRight:"1px solid var(--c-border)", boxShadow:"2px 0 12px rgba(13,115,119,.07)" }}>
        <SidebarContent onNavClick={() => {}}
          isLoading={connecting} apiOk={apiOk} dbOk={dbOk} dbType={dbType}/>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header className="header-bar flex items-center justify-between px-3 sm:px-4 flex-shrink-0"
          style={{ background:"var(--c-surface)", boxShadow:"0 1px 6px rgba(13,115,119,.07)", height:"52px" }}>

          <div className="flex items-center gap-2 min-w-0">
            <button className="lg:hidden p-1.5 rounded-lg flex-shrink-0 transition-all hover:bg-gray-100 active:scale-90"
              style={{ color:"var(--c-text3)" }} onClick={() => setMobileOpen(true)}>
              <Menu size={20}/>
            </button>
            <h1 className="text-sm font-semibold truncate" style={{ color:"var(--c-text)" }}>
              {PAGE_TITLES[loc.pathname] || "LungDenoise AI"}
            </h1>
          </div>

          <div className="hidden md:block flex-1 mx-4 overflow-hidden">
            <div className="ticker-wrap">
              <div className="ticker-track text-[10px] font-medium" style={{ color:"var(--c-text3)" }}>
                {TICKER}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{TICKER}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <StatusBadge isLoading={connecting} apiOk={apiOk} onRetry={retry}/>
            <span className="tag tag-teal text-[10px] hidden xl:inline-flex">
              <Activity size={9}/> AGF+DWT+DnCNN+TV
            </span>
            <span className="tag tag-green text-[10px] hidden 2xl:inline-flex">
              <Zap size={9}/> PSNR 34.76 dB
            </span>
            <SoundToggle/>
          </div>
        </header>

        {/* Offline banner — only after all retries exhausted */}
        {showOffline && (
          <div className="mx-3 sm:mx-4 mt-3 p-3 rounded-xl border flex items-start gap-3 animate-fade-down"
            style={{ background:"var(--c-danger-l)", borderColor:"var(--c-danger)", color:"var(--c-danger)" }}>
            <WifiOff size={14} className="mt-0.5 flex-shrink-0"/>
            <div className="text-xs flex-1">
              <strong>Backend unreachable</strong> after 60 s.
              URL tried:{" "}
              <code className="font-mono bg-white/60 px-1 rounded">
                {import.meta.env.VITE_API_URL || "https://pulmo-vision-ai.onrender.com"}
              </code>.
              {" "}The app works in demo mode — all charts and tables are still visible.
            </div>
            <button onClick={retry}
              className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
              style={{ background:"var(--c-danger)", color:"#fff" }}>
              <RefreshCw size={11}/> Retry
            </button>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5 pb-20 lg:pb-5">
          <div key={pageKey} className="page-enter">
            <Outlet/>
          </div>
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="lg:hidden flex-shrink-0 flex items-stretch"
          style={{
            background:    "var(--c-surface)",
            borderTop:     "1px solid var(--c-border)",
            boxShadow:     "0 -2px 12px rgba(13,115,119,.08)",
            height:        "62px",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}>
          {BOTTOM_NAV.map(({ to, icon:Icon, label }) => (
            <NavLink key={to} to={to} end={to=="/"}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90"
              style={({ isActive }) => ({
                color:      isActive ? "var(--c-primary)" : "var(--c-text3)",
                background: isActive ? "var(--c-primary-l)" : "transparent",
                borderTop:  isActive ? "2px solid var(--c-primary)" : "2px solid transparent",
              })}>
              {({ isActive }) => (
                <>
                  <Icon size={18} style={{ color:isActive?"var(--c-primary)":"var(--c-text3)" }}/>
                  <span className="text-[10px] font-semibold leading-none"
                    style={{ color:isActive?"var(--c-primary)":"var(--c-text3)" }}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
          <button onClick={() => setMoreOpen(o => !o)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90"
            style={{ color:moreOpen?"var(--c-primary)":"var(--c-text3)", background:"none", border:"none", cursor:"pointer" }}>
            <Menu size={18}/>
            <span className="text-[10px] font-semibold leading-none">More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

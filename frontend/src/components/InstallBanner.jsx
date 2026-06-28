import { useState } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

export default function InstallBanner() {
  const { canInstall, install, isInstalled, isIOS, dismissed, dismiss, ready } =
    usePWAInstall();
  const [iosOpen, setIosOpen] = useState(false);

  // Don't render until 3 s have passed (gives beforeinstallprompt time to fire)
  if (!ready)                    return null;
  // Already running as installed app
  if (isInstalled)               return null;
  // User dismissed this session
  if (dismissed)                 return null;
  // Neither Chrome-style prompt nor iOS Safari — nothing to show
  if (!canInstall && !isIOS)     return null;

  const pill = {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 600,
    background: "rgba(255,255,255,.15)",
    color: "rgba(255,255,255,.88)",
    margin: "0 4px 4px 0",
  };

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      zIndex: 99999,
      padding: "0 12px 12px",
      pointerEvents: "none",
    }}>
      <div style={{
        maxWidth: 500,
        margin: "0 auto",
        background: "#0d7377",
        border: "2px solid #2d8c5c",
        borderRadius: 20,
        padding: "16px 16px 14px",
        boxShadow: "0 -2px 40px rgba(13,115,119,.55), 0 8px 32px rgba(0,0,0,.2)",
        pointerEvents: "auto",
        animation: "slideUp .35s cubic-bezier(.22,1,.36,1)",
      }}>

        {/* ── Header ─────────────────────────────── */}
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:34, lineHeight:1, flexShrink:0 }}>🫁</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#fff", lineHeight:1.3 }}>
              Install LungDenoise AI
            </div>
            <div style={{ fontSize:12, marginTop:3, color:"rgba(255,255,255,.75)", lineHeight:1.4 }}>
              {isIOS
                ? "Add to your Home Screen for the full offline app"
                : "Install as a native-like app — offline, fast, no app store"}
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss install banner"
            style={{
              flexShrink:0, background:"none", border:"none",
              cursor:"pointer", padding:6, borderRadius:8,
              color:"rgba(255,255,255,.6)", lineHeight:0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Chrome / Edge / Android / Desktop ──── */}
        {canInstall && (
          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            <button
              onClick={install}
              style={{
                flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                gap:8, padding:"11px 0", borderRadius:12,
                background:"#ffffff", color:"#0d7377",
                border:"none", fontWeight:700, fontSize:13,
                cursor:"pointer", letterSpacing:"-.2px",
                boxShadow:"0 2px 8px rgba(0,0,0,.15)",
              }}
            >
              <Download size={15} />
              Install App
            </button>
            <button
              onClick={dismiss}
              style={{
                padding:"11px 18px", borderRadius:12,
                background:"rgba(255,255,255,.18)", color:"#fff",
                border:"none", fontWeight:600, fontSize:13,
                cursor:"pointer",
              }}
            >
              Later
            </button>
          </div>
        )}

        {/* ── iOS Safari manual steps ─────────────── */}
        {isIOS && !canInstall && (
          <div style={{ marginTop:14 }}>
            <button
              onClick={() => setIosOpen(o => !o)}
              style={{
                width:"100%", display:"flex", alignItems:"center",
                justifyContent:"center", gap:8,
                padding:"11px 0", borderRadius:12,
                background:"rgba(255,255,255,.2)", color:"#fff",
                border:"none", fontWeight:700, fontSize:13,
                cursor:"pointer",
              }}
            >
              <Smartphone size={15} />
              {iosOpen ? "Hide Instructions" : "How to install on iPhone / iPad"}
            </button>

            {iosOpen && (
              <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:7 }}>
                {[
                  { e:"⬆️", t:'Tap the Share button at the bottom of Safari (square with upward arrow)' },
                  { e:"➕", t:'Scroll down in the share sheet and tap "Add to Home Screen"' },
                  { e:"✅", t:'Tap "Add" in the top right — the 🫁 icon appears on your Home Screen' },
                ].map(({ e, t }, i) => (
                  <div key={i} style={{
                    display:"flex", alignItems:"flex-start", gap:10,
                    padding:"10px 12px", borderRadius:12,
                    background:"rgba(255,255,255,.14)",
                  }}>
                    <span style={{ fontSize:20, flexShrink:0, lineHeight:1.25 }}>{e}</span>
                    <p style={{ margin:0, fontSize:12, color:"rgba(255,255,255,.92)", lineHeight:1.55 }}>{t}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Feature pills ────────────────────────── */}
        <div style={{ marginTop:12 }}>
          {["Works offline","No app store","Auto-updates","Fast load","All devices"].map(f => (
            <span key={f} style={pill}>✓ {f}</span>
          ))}
        </div>
      </div>

      {/* Slide-up keyframe injected inline */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

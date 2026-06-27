import { useState } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

export default function InstallBanner() {
  const { canInstall, install, isInstalled, isIOS, dismissed, dismiss } =
    usePWAInstall();
  const [iosOpen, setIosOpen] = useState(false);

  // Don't render anything until we know the install state
  if (isInstalled || dismissed) return null;
  if (!canInstall && !isIOS)    return null;

  return (
    <div
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        zIndex: 9999, padding: "12px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: 480, margin: "0 auto",
          background: "#0d7377",
          border: "2px solid #2d8c5c",
          borderRadius: 20,
          padding: "16px",
          boxShadow: "0 -4px 32px rgba(13,115,119,.4)",
          pointerEvents: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
          <span style={{ fontSize:32, flexShrink:0 }}>🫁</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>
              Install LungDenoise AI
            </div>
            <div style={{ fontSize:12, marginTop:2, color:"rgba(255,255,255,.75)" }}>
              {isIOS
                ? "Add to Home Screen for the full app experience"
                : "Install as an app — works offline, no app store needed"}
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            style={{
              flexShrink:0, background:"none", border:"none",
              cursor:"pointer", padding:4, color:"rgba(255,255,255,.65)",
              lineHeight:1,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Android / Chrome / Edge / Desktop */}
        {canInstall && (
          <div style={{ display:"flex", gap:8, marginTop:12 }}>
            <button
              onClick={install}
              style={{
                flex:1, display:"flex", alignItems:"center",
                justifyContent:"center", gap:8,
                padding:"10px 0", borderRadius:12,
                background:"#fff", color:"#0d7377",
                border:"none", fontWeight:700, fontSize:13,
                cursor:"pointer",
              }}
            >
              <Download size={15} /> Install App
            </button>
            <button
              onClick={dismiss}
              style={{
                padding:"10px 16px", borderRadius:12,
                background:"rgba(255,255,255,.18)", color:"#fff",
                border:"none", fontWeight:600, fontSize:13,
                cursor:"pointer",
              }}
            >
              Later
            </button>
          </div>
        )}

        {/* iOS Safari — manual steps */}
        {isIOS && !canInstall && (
          <div style={{ marginTop:12 }}>
            <button
              onClick={() => setIosOpen(o => !o)}
              style={{
                width:"100%", display:"flex", alignItems:"center",
                justifyContent:"center", gap:8,
                padding:"10px 0", borderRadius:12,
                background:"rgba(255,255,255,.18)", color:"#fff",
                border:"none", fontWeight:700, fontSize:13,
                cursor:"pointer",
              }}
            >
              <Smartphone size={15} />
              {iosOpen ? "Hide Instructions" : "How to Install on iPhone / iPad"}
            </button>

            {iosOpen && (
              <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:8 }}>
                {[
                  { icon:"⬆️", text:'Tap the Share button at the bottom of Safari (the square with the arrow)' },
                  { icon:"➕", text:'Scroll down in the share sheet and tap "Add to Home Screen"' },
                  { icon:"✅", text:'Tap "Add" in the top-right — the LungDenoise icon will appear on your Home Screen' },
                ].map(({ icon, text }, i) => (
                  <div key={i}
                    style={{
                      display:"flex", alignItems:"flex-start", gap:10,
                      padding:"10px 12px", borderRadius:12,
                      background:"rgba(255,255,255,.13)",
                    }}
                  >
                    <span style={{ fontSize:18, flexShrink:0, lineHeight:1.3 }}>{icon}</span>
                    <p style={{ margin:0, fontSize:12, color:"rgba(255,255,255,.92)", lineHeight:1.5 }}>
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Feature pills */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:12 }}>
          {["Works offline","No app store","Auto-updates","All devices"].map(f => (
            <span key={f}
              style={{
                padding:"2px 10px", borderRadius:99, fontSize:11, fontWeight:600,
                background:"rgba(255,255,255,.15)", color:"rgba(255,255,255,.88)",
              }}
            >
              ✓ {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

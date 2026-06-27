import { useState } from "react";
import { Download, X, Smartphone, Share } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

export default function InstallBanner() {
  const { canInstall, install, isInstalled, isIOS, dismissed, dismiss } =
    usePWAInstall();
  const [iosExpanded, setIosExpanded] = useState(false);

  if (isInstalled || dismissed) return null;
  if (!canInstall && !isIOS) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4"
      style={{ pointerEvents: "none" }}>
      <div className="max-w-lg mx-auto rounded-2xl shadow-2xl border-2 p-4"
        style={{
          background: "#0d7377", borderColor: "#2d8c5c",
          pointerEvents: "auto",
          boxShadow: "0 -4px 32px rgba(13,115,119,.35)",
        }}>

        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="text-3xl flex-shrink-0">🫁</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white">Install LungDenoise AI</div>
            <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,.75)" }}>
              {isIOS
                ? "Add to Home Screen for the full app experience"
                : "Install as an app — works offline, no app store needed"}
            </div>
          </div>
          <button onClick={dismiss} className="flex-shrink-0 p-1 rounded-lg"
            style={{ color: "rgba(255,255,255,.6)" }} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>

        {/* Chrome / Edge / Android / Desktop install button */}
        {canInstall && (
          <div className="mt-3 flex gap-2">
            <button onClick={install}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
              style={{ background: "white", color: "#0d7377" }}>
              <Download size={15} /> Install App
            </button>
            <button onClick={dismiss}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(255,255,255,.15)", color: "white" }}>
              Later
            </button>
          </div>
        )}

        {/* iOS Safari manual steps */}
        {isIOS && !canInstall && (
          <div className="mt-3">
            <button onClick={() => setIosExpanded(e => !e)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm"
              style={{ background: "rgba(255,255,255,.18)", color: "white" }}>
              <Smartphone size={15} /> How to Install on iPhone / iPad
            </button>
            {iosExpanded && (
              <div className="mt-3 space-y-2">
                {[
                  { icon: "⬆️", text: 'Tap the Share button at the bottom of Safari (square with arrow pointing up)' },
                  { icon: "➕", text: 'Scroll down in the share sheet and tap "Add to Home Screen"' },
                  { icon: "✅", text: 'Tap "Add" in the top-right corner — the LungDenoise icon appears on your Home Screen' },
                ].map(({ icon, text }, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl"
                    style={{ background: "rgba(255,255,255,.12)" }}>
                    <span className="text-base flex-shrink-0">{icon}</span>
                    <p className="text-xs leading-snug" style={{ color: "rgba(255,255,255,.9)" }}>{text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Feature pills */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["Works offline","No app store","Auto-updates","Fast load","All devices"].map(f => (
            <span key={f} className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: "rgba(255,255,255,.15)", color: "rgba(255,255,255,.85)" }}>
              ✓ {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

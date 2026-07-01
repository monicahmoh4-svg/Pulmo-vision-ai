import { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";

const STORAGE_KEY = "lungdenoise-sound-enabled";

/**
 * SoundToggle
 * A small button placed in the header that globally enables/disables
 * all medical sounds. State is persisted in localStorage.
 *
 * Other components read window.__soundEnabled before playing sounds.
 */
export default function SoundToggle() {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== "0"; }
    catch { return true; }
  });

  useEffect(() => {
    window.__soundEnabled = enabled;
    try { localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0"); }
    catch {}
  }, [enabled]);

  // Initialise global on first mount
  useEffect(() => { window.__soundEnabled = enabled; }, []); // eslint-disable-line

  const toggle = () => setEnabled(e => !e);

  return (
    <button
      onClick={toggle}
      title={enabled ? "Mute medical sounds" : "Enable medical sounds"}
      className="btn btn-xs tooltip-wrap"
      style={{
        borderColor: enabled ? "var(--c-primary)" : "var(--c-border)",
        color:       enabled ? "var(--c-primary)" : "var(--c-text3)",
        background:  enabled ? "var(--c-primary-l)" : "var(--c-surface)",
        transition:  "all 200ms ease",
        minWidth: 32,
        justifyContent: "center",
      }}
      aria-label={enabled ? "Mute sounds" : "Unmute sounds"}
    >
      {enabled
        ? <Volume2 size={13} />
        : <VolumeX size={13} />
      }
      <span className="tooltip-box" style={{ whiteSpace:"nowrap" }}>
        {enabled ? "Mute medical sounds" : "Enable medical sounds"}
      </span>
    </button>
  );
}

/**
 * Helper used by all sound-playing components:
 * returns true only if sounds are globally enabled.
 */
export function isSoundEnabled() {
  return window.__soundEnabled !== false;
}

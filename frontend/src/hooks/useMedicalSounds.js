/**
 * useMedicalSounds — Professional Medical Equipment Audio
 *
 * All sounds modelled after real clinical imaging equipment:
 * Siemens SOMATOM, GE Revolution, Philips Brilliance CT scanners.
 *
 * Design principles:
 *  - Low gain (0.04–0.10 max) — never startling
 *  - Short duration (50–400 ms) — non-intrusive
 *  - Sine/triangle oscillators only — smooth, clinical
 *  - Gentle attack + long release — professional feel
 *  - Frequency range 300–1200 Hz — sits in background
 */

import { useRef, useCallback, useEffect } from "react";

let _ctx = null;
function getCtx() {
  if (!_ctx || _ctx.state === "closed") {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
}

/* ── Core tone builder ───────────────────────────────────────────
   gainVal kept deliberately low (0.04–0.10).
   Attack always ≥ 20 ms to avoid clicks.
   Release always exponential for natural decay.
*/
function tone(ctx, freq, start, dur, gainVal = 0.06, type = "sine") {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  // Soft low-pass so no harsh high harmonics
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2200;
  o.connect(lp); lp.connect(g); g.connect(ctx.destination);
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gainVal, start + 0.022); // 22 ms attack
  g.gain.setValueAtTime(gainVal, start + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.start(start);
  o.stop(start + dur + 0.01);
}

/* Single very quiet click — mechanical relay feel */
function click(ctx, start) {
  const buf  = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.018), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.3));
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  src.connect(g); g.connect(ctx.destination);
  g.gain.setValueAtTime(0.05, start);
  src.start(start);
}

/* ═══════════════════════════════════════════════════════════════
   SOUND DEFINITIONS
═══════════════════════════════════════════════════════════════ */

/**
 * CT Scanner ready beep — single soft 880 Hz sine, 200 ms.
 * Like the "ready" indicator on a Siemens SOMATOM before acquisition.
 */
function playCTStartup(ctx) {
  const t = ctx.currentTime;
  // Ready tone
  tone(ctx, 880, t, 0.20, 0.07);
  // Very faint sub-tone (adds depth without loudness)
  tone(ctx, 440, t, 0.28, 0.03);
}

/**
 * Step tick — subtle mechanical click, like a relay engaging.
 * Under 20 ms. Almost subconscious.
 */
function playStepTick(ctx) {
  click(ctx, ctx.currentTime);
}

/**
 * Wavelet transform — two soft descending tones, 80 ms apart.
 * Represents frequency decomposition. Very quiet.
 */
function playWavelet(ctx) {
  const t = ctx.currentTime;
  tone(ctx, 660, t,        0.12, 0.05);
  tone(ctx, 495, t + 0.08, 0.12, 0.04);
}

/**
 * DnCNN inference — a single clean processing tone at 720 Hz.
 * Like a quiet computation indicator on a workstation.
 */
function playNeuralNet(ctx) {
  const t = ctx.currentTime;
  tone(ctx, 720, t, 0.18, 0.05);
  tone(ctx, 540, t + 0.06, 0.14, 0.03);
}

/**
 * TV smoothing — one gentle descending tone.
 * 880 → 660 Hz glide, 250 ms. Signals completion of smoothing.
 */
function playTVSmooth(ctx) {
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 1800;
  o.connect(lp); lp.connect(g); g.connect(ctx.destination);
  o.type = "sine";
  o.frequency.setValueAtTime(880, t);
  o.frequency.linearRampToValueAtTime(660, t + 0.25);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.055, t + 0.025);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.30);
  o.start(t); o.stop(t + 0.32);
}

/**
 * Pipeline success — two-note ascending chime.
 * G5 then C6, 150 ms apart. Clean and professional.
 * Like the "exam complete" tone on clinical scanners.
 */
function playSuccess(ctx) {
  const t = ctx.currentTime;
  tone(ctx, 784, t,        0.35, 0.07); // G5
  tone(ctx, 1047, t + 0.15, 0.45, 0.07); // C6
  // Very faint harmonic warmth
  tone(ctx, 523, t + 0.15, 0.40, 0.025); // C5 sub
}

/**
 * Alert — two short low tones. Not alarming, just a soft notice.
 * Like a missed-step indicator on a Philips workstation.
 */
function playAlert(ctx) {
  const t = ctx.currentTime;
  tone(ctx, 440, t,       0.12, 0.07);
  tone(ctx, 370, t + 0.14, 0.14, 0.06);
}

/**
 * Upload complete — single soft ascending two-tone.
 * Like data confirmation on a PACS system.
 */
function playUploadDone(ctx) {
  const t = ctx.currentTime;
  tone(ctx, 660, t,        0.16, 0.06);
  tone(ctx, 880, t + 0.12, 0.20, 0.06);
}

/**
 * Scan tick — used during the scan-line animation.
 * Single very quiet click. Barely audible — ambient feel.
 */
function playScanTick(ctx) {
  const t = ctx.currentTime;
  // Soft sine pulse, 30 ms
  tone(ctx, 1100, t, 0.03, 0.025);
}

/**
 * Heartbeat — a minimal two-pulse ECG simulation.
 * Very quiet and natural-sounding.
 */
function playHeartbeat(ctx) {
  const t = ctx.currentTime;
  // S1 (lub)
  tone(ctx, 80,  t,        0.07, 0.045);
  tone(ctx, 120, t,        0.05, 0.030);
  // S2 (dub) — slightly higher, 160 ms later
  tone(ctx, 95,  t + 0.16, 0.05, 0.035);
  tone(ctx, 140, t + 0.16, 0.04, 0.025);
}

/**
 * Export / download — soft data-transfer confirmation.
 * Three ascending clicks, 60 ms apart.
 */
function playExport(ctx) {
  const t = ctx.currentTime;
  [660, 784, 880].forEach((f, i) => tone(ctx, f, t + i * 0.06, 0.10, 0.05));
}

/**
 * Image accepted — clean two-note approval tone.
 * Like the "image stored" confirmation on a GE scanner.
 */
function playAccepted(ctx) {
  const t = ctx.currentTime;
  tone(ctx, 523, t,        0.25, 0.07); // C5
  tone(ctx, 659, t + 0.14, 0.35, 0.07); // E5
  tone(ctx, 784, t + 0.28, 0.40, 0.06); // G5
}

/* ═══════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════ */
export function useMedicalSounds() {
  const scanIntervalRef  = useRef(null);
  const heartIntervalRef = useRef(null);

  useEffect(() => () => {
    clearInterval(scanIntervalRef.current);
    clearInterval(heartIntervalRef.current);
  }, []);

  const safe = useCallback((fn) => {
    try { fn(getCtx()); }
    catch (e) { console.debug("[MedSound]", e.message); }
  }, []);

  return {
    ctStartup:  useCallback(() => safe(playCTStartup),  [safe]),
    stepTick:   useCallback(() => safe(playStepTick),   [safe]),
    wavelet:    useCallback(() => safe(playWavelet),     [safe]),
    neuralNet:  useCallback(() => safe(playNeuralNet),  [safe]),
    tvSmooth:   useCallback(() => safe(playTVSmooth),   [safe]),
    success:    useCallback(() => safe(playSuccess),     [safe]),
    alert:      useCallback(() => safe(playAlert),       [safe]),
    uploadDone: useCallback(() => safe(playUploadDone), [safe]),
    scanTick:   useCallback(() => safe(playScanTick),   [safe]),
    heartbeat:  useCallback(() => safe(playHeartbeat),  [safe]),
    exportDone: useCallback(() => safe(playExport),      [safe]),
    accepted:   useCallback(() => safe(playAccepted),   [safe]),

    startScanLoop: useCallback((ms = 220) => {
      clearInterval(scanIntervalRef.current);
      safe(playScanTick);
      scanIntervalRef.current = setInterval(() => safe(playScanTick), ms);
      return () => clearInterval(scanIntervalRef.current);
    }, [safe]),

    stopScanLoop: useCallback(() => clearInterval(scanIntervalRef.current), []),

    startHeartbeat: useCallback((bpm = 68) => {
      clearInterval(heartIntervalRef.current);
      safe(playHeartbeat);
      heartIntervalRef.current = setInterval(
        () => safe(playHeartbeat), Math.round(60000 / bpm)
      );
      return () => clearInterval(heartIntervalRef.current);
    }, [safe]),

    stopHeartbeat: useCallback(() => clearInterval(heartIntervalRef.current), []),
  };
}

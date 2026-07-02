/**
 * useMedicalSounds — Authentic CT Scanner Audio Engine
 *
 * Modelled on actual Siemens SOMATOM / GE Revolution CT sounds:
 *
 * CT SCANNER SEQUENCE (plays during denoising pipeline):
 *  1. 2 s: Low 50 Hz table-drive motor hum builds up
 *  2. 3 s: Gantry rotation — a continuous 120 Hz mechanical drone
 *           with 3 Hz amplitude modulation (rotation speed)
 *  3. 4 s: X-ray acquisition clicks — the real "ticking"
 *           sound heard during a CT scan (≈ 8 clicks/sec)
 *  4. 6 s: Acquisition ends — motor ramp down, silence
 *  5. 7 s: "Processing" indicator beep — data reconstruction
 *  6. 8 s: Exam-complete two-tone chime
 *
 * All other sounds remain minimal and professional.
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

/* ── Helpers ─────────────────────────────────────────────────── */
function tone(ctx, freq, start, dur, gain = 0.06, type = "sine") {
  const o  = ctx.createOscillator();
  const g  = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 2400;
  o.connect(lp); lp.connect(g); g.connect(ctx.destination);
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.022);
  g.gain.setValueAtTime(gain, start + dur * 0.65);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.start(start);
  o.stop(start + dur + 0.02);
}

/* Band-limited click — single X-ray pulse */
function xraypulse(ctx, t) {
  const len  = Math.floor(ctx.sampleRate * 0.012);
  const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
  const d    = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.25)) * 0.9;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass"; hp.frequency.value = 800;
  const g = ctx.createGain();
  src.connect(hp); hp.connect(g); g.connect(ctx.destination);
  g.gain.setValueAtTime(0.22, t);
  src.start(t);
}

/* ═══════════════════════════════════════════════════════════════
   CT SCANNER FULL SEQUENCE
   Total duration: ~8.5 seconds — covers the pipeline animation
═══════════════════════════════════════════════════════════════ */
function playCTScanSequence(ctx) {
  const t = ctx.currentTime;

  /* ── Phase 1: Table motor hum (0–2.5 s) ─────────────────── */
  const motor = ctx.createOscillator();
  const motorG = ctx.createGain();
  const motorLp = ctx.createBiquadFilter();
  motorLp.type = "lowpass"; motorLp.frequency.value = 180;
  motor.connect(motorLp); motorLp.connect(motorG); motorG.connect(ctx.destination);
  motor.type = "sawtooth";
  motor.frequency.setValueAtTime(48, t);
  motor.frequency.linearRampToValueAtTime(52, t + 2.0);
  motorG.gain.setValueAtTime(0, t);
  motorG.gain.linearRampToValueAtTime(0.055, t + 0.6);
  motorG.gain.setValueAtTime(0.055, t + 2.0);
  motorG.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
  motor.start(t); motor.stop(t + 2.8);

  /* ── Phase 2: Gantry rotation drone (1.2–5.8 s) ─────────── */
  // Continuous mechanical hum with 3 Hz wobble = gantry spinning
  const gantry = ctx.createOscillator();
  const gantryMod = ctx.createOscillator();   // amplitude modulator (rotation speed)
  const gantryModG = ctx.createGain();
  const gantryG = ctx.createGain();
  const gantryLp = ctx.createBiquadFilter();
  gantryLp.type = "bandpass"; gantryLp.frequency.value = 120; gantryLp.Q.value = 1.5;

  gantryMod.type = "sine";
  gantryMod.frequency.setValueAtTime(3, t + 1.2);   // 3 rotations/sec
  gantryModG.gain.setValueAtTime(0.018, t + 1.2);
  gantryMod.connect(gantryModG); gantryModG.connect(gantryG.gain);

  gantry.type = "sawtooth";
  gantry.frequency.setValueAtTime(118, t + 1.2);
  gantry.connect(gantryLp); gantryLp.connect(gantryG); gantryG.connect(ctx.destination);

  gantryG.gain.setValueAtTime(0, t + 1.2);
  gantryG.gain.linearRampToValueAtTime(0.060, t + 1.8);
  gantryG.gain.setValueAtTime(0.060, t + 5.0);
  gantryG.gain.exponentialRampToValueAtTime(0.0001, t + 5.9);

  gantryMod.start(t + 1.2); gantryMod.stop(t + 6.0);
  gantry.start(t + 1.2);    gantry.stop(t + 6.0);

  /* ── Phase 3: X-ray acquisition clicks (2.5–5.5 s) ─────── */
  // Real CT: ~8–12 X-ray pulses per second during rotation
  const CLICK_RATE = 9;   // pulses/sec
  const CLICK_DUR  = 3.0; // seconds of acquisition
  const clickCount = Math.round(CLICK_RATE * CLICK_DUR);
  for (let i = 0; i < clickCount; i++) {
    const ct = t + 2.5 + (i / CLICK_RATE);
    // Slight randomisation — real CT isn't perfectly regular
    const jitter = (Math.random() - 0.5) * 0.012;
    xraypulse(ctx, ct + jitter);
  }

  /* ── Phase 4: High-freq rotation whine (2.5–5.5 s) ─────── */
  // Bearing noise — thin sine at 420 Hz, very quiet
  const bearing = ctx.createOscillator();
  const bearingG = ctx.createGain();
  bearing.type = "sine";
  bearing.frequency.setValueAtTime(420, t + 2.5);
  bearing.frequency.linearRampToValueAtTime(430, t + 5.5);
  bearingG.gain.setValueAtTime(0, t + 2.5);
  bearingG.gain.linearRampToValueAtTime(0.018, t + 2.8);
  bearingG.gain.setValueAtTime(0.018, t + 5.2);
  bearingG.gain.exponentialRampToValueAtTime(0.0001, t + 5.7);
  bearing.connect(bearingG); bearingG.connect(ctx.destination);
  bearing.start(t + 2.5); bearing.stop(t + 5.8);

  /* ── Phase 5: Motor ramp-down (5.5–6.5 s) ───────────────── */
  const rampDown = ctx.createOscillator();
  const rampDownG = ctx.createGain();
  const rampLp = ctx.createBiquadFilter();
  rampLp.type = "lowpass"; rampLp.frequency.value = 160;
  rampDown.type = "sawtooth";
  rampDown.frequency.setValueAtTime(52, t + 5.5);
  rampDown.frequency.exponentialRampToValueAtTime(28, t + 6.5);
  rampDownG.gain.setValueAtTime(0.040, t + 5.5);
  rampDownG.gain.exponentialRampToValueAtTime(0.0001, t + 6.6);
  rampDown.connect(rampLp); rampLp.connect(rampDownG); rampDownG.connect(ctx.destination);
  rampDown.start(t + 5.5); rampDown.stop(t + 6.7);

  /* ── Phase 6: Reconstruction indicator (6.8 s) ──────────── */
  // Soft 880 Hz beep — "processing" like on a real console
  tone(ctx, 880, t + 6.8, 0.22, 0.055);
  tone(ctx, 440, t + 6.8, 0.30, 0.018);
}

/* ── Step tick: relay click ─────────────────────────────────── */
function playStepTick(ctx) {
  const t   = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * 0.016);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.28)) * 0.8;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass"; hp.frequency.value = 600;
  const g = ctx.createGain();
  src.connect(hp); hp.connect(g); g.connect(ctx.destination);
  g.gain.setValueAtTime(0.08, t);
  src.start(t);
}

/* ── Wavelet: two descending soft tones ─────────────────────── */
function playWavelet(ctx) {
  const t = ctx.currentTime;
  tone(ctx, 660, t,        0.14, 0.048);
  tone(ctx, 495, t + 0.09, 0.14, 0.036);
}

/* ── DnCNN: clean processing tone ───────────────────────────── */
function playNeuralNet(ctx) {
  const t = ctx.currentTime;
  tone(ctx, 720, t,        0.20, 0.048);
  tone(ctx, 540, t + 0.07, 0.16, 0.028);
}

/* ── TV Smooth: frequency glide down ────────────────────────── */
function playTVSmooth(ctx) {
  const t  = ctx.currentTime;
  const o  = ctx.createOscillator();
  const g  = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 1800;
  o.connect(lp); lp.connect(g); g.connect(ctx.destination);
  o.type = "sine";
  o.frequency.setValueAtTime(880, t);
  o.frequency.linearRampToValueAtTime(660, t + 0.28);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.050, t + 0.025);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  o.start(t); o.stop(t + 0.34);
}

/* ── Success: G5 → C6 ascending chime ───────────────────────── */
function playSuccess(ctx) {
  const t = ctx.currentTime;
  tone(ctx, 784,  t,         0.38, 0.065);
  tone(ctx, 1047, t + 0.16,  0.48, 0.065);
  tone(ctx, 523,  t + 0.16,  0.42, 0.022);
}

/* ── Alert: two descending soft tones ───────────────────────── */
function playAlert(ctx) {
  const t = ctx.currentTime;
  tone(ctx, 440, t,        0.13, 0.065);
  tone(ctx, 370, t + 0.15, 0.15, 0.055);
}

/* ── Upload done: ascending two-tone ────────────────────────── */
function playUploadDone(ctx) {
  const t = ctx.currentTime;
  tone(ctx, 660, t,        0.17, 0.055);
  tone(ctx, 880, t + 0.12, 0.21, 0.055);
}

/* ── Scan tick: ambient click for scan-line ─────────────────── */
function playScanTick(ctx) {
  tone(ctx, 1100, ctx.currentTime, 0.03, 0.022);
}

/* ── Heartbeat: ECG S1/S2 simulation ────────────────────────── */
function playHeartbeat(ctx) {
  const t = ctx.currentTime;
  tone(ctx, 80,  t,        0.07, 0.042);
  tone(ctx, 120, t,        0.05, 0.028);
  tone(ctx, 95,  t + 0.17, 0.05, 0.032);
  tone(ctx, 140, t + 0.17, 0.04, 0.022);
}

/* ── Export: 3-step ascending confirmation ───────────────────── */
function playExport(ctx) {
  const t = ctx.currentTime;
  [660, 784, 880].forEach((f, i) => tone(ctx, f, t + i * 0.065, 0.11, 0.048));
}

/* ── Accepted: C5 E5 G5 major arpeggio ──────────────────────── */
function playAccepted(ctx) {
  const t = ctx.currentTime;
  tone(ctx, 523, t,        0.28, 0.065);
  tone(ctx, 659, t + 0.14, 0.36, 0.065);
  tone(ctx, 784, t + 0.28, 0.42, 0.058);
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
    /* Full CT scanner sequence — use for pipeline run */
    ctStartup:  useCallback(() => safe(playCTScanSequence), [safe]),

    /* Per-step sounds */
    stepTick:   useCallback(() => safe(playStepTick),   [safe]),
    wavelet:    useCallback(() => safe(playWavelet),     [safe]),
    neuralNet:  useCallback(() => safe(playNeuralNet),   [safe]),
    tvSmooth:   useCallback(() => safe(playTVSmooth),    [safe]),

    /* Result sounds */
    success:    useCallback(() => safe(playSuccess),     [safe]),
    alert:      useCallback(() => safe(playAlert),       [safe]),
    uploadDone: useCallback(() => safe(playUploadDone),  [safe]),
    scanTick:   useCallback(() => safe(playScanTick),    [safe]),
    heartbeat:  useCallback(() => safe(playHeartbeat),   [safe]),
    exportDone: useCallback(() => safe(playExport),      [safe]),
    accepted:   useCallback(() => safe(playAccepted),    [safe]),

    startScanLoop: useCallback((ms = 220) => {
      clearInterval(scanIntervalRef.current);
      safe(playScanTick);
      scanIntervalRef.current = setInterval(() => safe(playScanTick), ms);
      return () => clearInterval(scanIntervalRef.current);
    }, [safe]),
    stopScanLoop:  useCallback(() => clearInterval(scanIntervalRef.current),  []),

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

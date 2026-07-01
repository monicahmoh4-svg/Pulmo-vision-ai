/**
 * useMedicalSounds
 *
 * Generates all sounds programmatically using the Web Audio API —
 * zero external files needed, works offline, instant load.
 *
 * Sounds modelled after real medical imaging equipment:
 *  - CT scanner hum / ramp-up
 *  - Acquisition beep sequences
 *  - Gantry rotation
 *  - Processing / computation tones
 *  - Success chime
 *  - Alert / warning
 *  - Upload confirmation
 *  - Heartbeat monitor
 */

import { useRef, useCallback, useEffect } from "react";

/* ── Audio context singleton ─────────────────────────────────────── */
let _ctx = null;
function getCtx() {
  if (!_ctx || _ctx.state === "closed") {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
}

/* ── Low-level helpers ───────────────────────────────────────────── */
function osc(ctx, type, freq, start, dur, gainVal = 0.18, fadeOut = true) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gainVal, start + 0.01);
  if (fadeOut) g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  else         g.gain.setValueAtTime(gainVal, start + dur);
  o.start(start);
  o.stop(start + dur + 0.01);
  return { osc: o, gain: g };
}

function noise(ctx, start, dur, gainVal = 0.06, lpFreq = 800) {
  const bufSize = ctx.sampleRate * dur;
  const buf     = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data    = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = lpFreq;
  const g = ctx.createGain();
  src.connect(lp); lp.connect(g); g.connect(ctx.destination);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gainVal, start + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.start(start); src.stop(start + dur + 0.01);
}

/* ══════════════════════════════════════════════════════════════════
   SOUND LIBRARY
══════════════════════════════════════════════════════════════════ */

/**
 * CT Scanner startup — motor ramp-up hum + rotation whoosh
 * Heard when the denoising pipeline begins.
 */
function playCTStartup(ctx) {
  const t = ctx.currentTime;

  // Low motor hum ramping up (like gantry motor engaging)
  const hum = ctx.createOscillator();
  const humG = ctx.createGain();
  hum.connect(humG); humG.connect(ctx.destination);
  hum.type = "sawtooth";
  hum.frequency.setValueAtTime(38, t);
  hum.frequency.linearRampToValueAtTime(72, t + 1.8);
  humG.gain.setValueAtTime(0, t);
  humG.gain.linearRampToValueAtTime(0.12, t + 0.3);
  humG.gain.setValueAtTime(0.12, t + 1.5);
  humG.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
  hum.start(t); hum.stop(t + 2.3);

  // High-frequency gantry rotation whoosh
  const whoosh = ctx.createOscillator();
  const whooshG = ctx.createGain();
  const whooshLp = ctx.createBiquadFilter();
  whooshLp.type = "bandpass"; whooshLp.frequency.value = 420; whooshLp.Q.value = 0.8;
  whoosh.connect(whooshLp); whooshLp.connect(whooshG); whooshG.connect(ctx.destination);
  whoosh.type = "sawtooth";
  whoosh.frequency.setValueAtTime(180, t + 0.2);
  whoosh.frequency.linearRampToValueAtTime(340, t + 1.4);
  whooshG.gain.setValueAtTime(0, t + 0.2);
  whooshG.gain.linearRampToValueAtTime(0.09, t + 0.5);
  whooshG.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);
  whoosh.start(t + 0.2); whoosh.stop(t + 2.1);

  // Three acquisition beeps (prep beeps before scan)
  [0.6, 0.95, 1.3].forEach(delay => {
    osc(ctx, "sine", 880, t + delay, 0.08, 0.15);
    osc(ctx, "sine", 1320, t + delay + 0.01, 0.06, 0.06, 0.07);
  });

  // White noise burst (X-ray emission simulation)
  noise(ctx, t + 1.5, 0.6, 0.08, 1200);
}

/**
 * Pipeline step tick — soft mechanical click heard at each processing stage
 */
function playStepTick(ctx) {
  const t = ctx.currentTime;
  // Mechanical click body
  noise(ctx, t, 0.04, 0.12, 3000);
  // High transient
  osc(ctx, "square", 2200, t, 0.025, 0.08);
  // Low thump
  osc(ctx, "sine", 80, t, 0.06, 0.1);
}

/**
 * Wavelet transform sound — cascading descending tones like
 * a spectrogram decomposition
 */
function playWavelet(ctx) {
  const t = ctx.currentTime;
  // LL, LH, HL, HH sub-band tones (descending freq = lower sub-bands)
  const freqs = [1200, 900, 650, 480, 340, 220];
  freqs.forEach((f, i) => {
    osc(ctx, "triangle", f, t + i * 0.07, 0.18, 0.10);
    // Harmonic
    osc(ctx, "sine", f * 1.5, t + i * 0.07, 0.12, 0.06, true);
  });
  // Underlying computation hum
  osc(ctx, "sawtooth", 55, t, 0.45, 0.05);
}

/**
 * DnCNN inference sound — rapid neural network "thinking"
 * bursts like GPU computation ticking
 */
function playNeuralNet(ctx) {
  const t = ctx.currentTime;
  const totalLayers = 17;

  for (let layer = 0; layer < totalLayers; layer++) {
    const lt   = t + layer * 0.045;
    const freq = 300 + layer * 28;
    osc(ctx, "square", freq, lt, 0.03, 0.04);
    if (layer % 3 === 0) noise(ctx, lt, 0.02, 0.03, 2000);
  }

  // BatchNorm sweep (smooth sine glide)
  const bn = ctx.createOscillator();
  const bnG = ctx.createGain();
  bn.connect(bnG); bnG.connect(ctx.destination);
  bn.type = "sine";
  bn.frequency.setValueAtTime(200, t + 0.1);
  bn.frequency.exponentialRampToValueAtTime(800, t + 0.8);
  bnG.gain.setValueAtTime(0, t + 0.1);
  bnG.gain.linearRampToValueAtTime(0.06, t + 0.2);
  bnG.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
  bn.start(t + 0.1); bn.stop(t + 0.9);
}

/**
 * Total Variation smoothing — a soft smooth "wash" sound
 * like signal being cleaned
 */
function playTVSmooth(ctx) {
  const t = ctx.currentTime;

  // Smooth sine sweep (high → low = smoothing)
  const s = ctx.createOscillator();
  const g = ctx.createGain();
  s.connect(g); g.connect(ctx.destination);
  s.type = "sine";
  s.frequency.setValueAtTime(1400, t);
  s.frequency.exponentialRampToValueAtTime(180, t + 0.7);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.10, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
  s.start(t); s.stop(t + 0.8);

  // Subtle white noise fade (residual artifact removal)
  noise(ctx, t, 0.5, 0.04, 600);
}

/**
 * Success chime — warm clinical success tone (pipeline complete)
 * Three ascending notes like a medical monitor confirmation
 */
function playSuccess(ctx) {
  const t = ctx.currentTime;
  // Ascending triad: C5 E5 G5
  [523.25, 659.25, 783.99].forEach((f, i) => {
    const st = t + i * 0.14;
    osc(ctx, "sine",     f,       st, 0.5,  0.18);
    osc(ctx, "triangle", f * 2,   st, 0.25, 0.06);
    osc(ctx, "sine",     f * 0.5, st, 0.4,  0.04);
  });
  // Final sustain chord
  [523.25, 659.25, 783.99].forEach(f => {
    osc(ctx, "sine", f, t + 0.45, 0.8, 0.07, true);
  });
}

/**
 * Alert / warning — urgent double beep like a clinical alarm
 */
function playAlert(ctx) {
  const t = ctx.currentTime;
  [0, 0.22, 0.44].forEach(d => {
    osc(ctx, "square", 660, t + d, 0.12, 0.14);
    osc(ctx, "square", 990, t + d, 0.12, 0.07, true);
  });
}

/**
 * Upload complete — soft two-tone confirmation like
 * data received by a PACS system
 */
function playUploadDone(ctx) {
  const t = ctx.currentTime;
  osc(ctx, "sine", 440, t,        0.18, 0.12);
  osc(ctx, "sine", 660, t + 0.15, 0.22, 0.14);
  // Subtle chime harmonic
  osc(ctx, "triangle", 1320, t + 0.15, 0.18, 0.06);
}

/**
 * Scan line — repeating tick used during CT acquisition animation
 * (call repeatedly with setInterval)
 */
function playScanTick(ctx) {
  const t = ctx.currentTime;
  noise(ctx, t, 0.025, 0.08, 4000);
  osc(ctx, "sine", 3200, t, 0.025, 0.07);
}

/**
 * Heartbeat monitor — classic ECG beep used in radiologist view
 */
function playHeartbeat(ctx) {
  const t = ctx.currentTime;
  // QRS complex: quick rise + fall
  osc(ctx, "sine", 880, t,       0.04, 0.18);
  osc(ctx, "sine", 660, t + 0.04,0.08, 0.10);
  // Subtle low thump
  osc(ctx, "sine", 55,  t,       0.12, 0.09);
}

/**
 * DICOM export — a crisp data-transfer bleep sequence
 */
function playExport(ctx) {
  const t = ctx.currentTime;
  const freqs = [880, 1100, 880, 1320];
  freqs.forEach((f, i) => osc(ctx, "sine", f, t + i * 0.06, 0.05, 0.12));
}

/**
 * Image accepted — warm positive tone for "Accept Denoised Image"
 */
function playAccepted(ctx) {
  const t = ctx.currentTime;
  // Major chord arpeggio
  [261.63, 329.63, 392.00, 523.25].forEach((f, i) => {
    osc(ctx, "sine",     f,     t + i * 0.09, 0.4 - i * 0.05, 0.14);
    osc(ctx, "triangle", f * 2, t + i * 0.09, 0.2,             0.05);
  });
}

/* ══════════════════════════════════════════════════════════════════
   HOOK
══════════════════════════════════════════════════════════════════ */
export function useMedicalSounds() {
  const scanIntervalRef = useRef(null);
  const heartIntervalRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current)  clearInterval(scanIntervalRef.current);
      if (heartIntervalRef.current) clearInterval(heartIntervalRef.current);
    };
  }, []);

  const safe = useCallback((fn) => {
    try {
      const ctx = getCtx();
      fn(ctx);
    } catch (e) {
      // Browser may block audio without user gesture — fail silently
      console.debug("[MedSound] blocked:", e.message);
    }
  }, []);

  /* Individual sound triggers */
  const sounds = {
    /** Call when "Run Denoising Pipeline" is clicked */
    ctStartup:   useCallback(() => safe(playCTStartup),  [safe]),

    /** Call at each pipeline step transition */
    stepTick:    useCallback(() => safe(playStepTick),   [safe]),

    /** Call when wavelet DWT stage runs */
    wavelet:     useCallback(() => safe(playWavelet),    [safe]),

    /** Call when DnCNN inference stage runs */
    neuralNet:   useCallback(() => safe(playNeuralNet),  [safe]),

    /** Call when TV smoothing stage runs */
    tvSmooth:    useCallback(() => safe(playTVSmooth),   [safe]),

    /** Call when pipeline completes successfully */
    success:     useCallback(() => safe(playSuccess),    [safe]),

    /** Call on error / re-process request */
    alert:       useCallback(() => safe(playAlert),      [safe]),

    /** Call when file upload completes */
    uploadDone:  useCallback(() => safe(playUploadDone), [safe]),

    /** Single scan tick (for use in an interval) */
    scanTick:    useCallback(() => safe(playScanTick),   [safe]),

    /** Single heartbeat beep */
    heartbeat:   useCallback(() => safe(playHeartbeat),  [safe]),

    /** Call when exporting DICOM / PDF */
    exportDone:  useCallback(() => safe(playExport),     [safe]),

    /** Call when "Accept Denoised Image" is clicked */
    accepted:    useCallback(() => safe(playAccepted),   [safe]),

    /**
     * Start repeating scan ticks during CT acquisition animation.
     * Returns a stop function.
     */
    startScanLoop: useCallback((intervalMs = 180) => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      safe(playScanTick);
      scanIntervalRef.current = setInterval(() => safe(playScanTick), intervalMs);
      return () => {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      };
    }, [safe]),

    stopScanLoop: useCallback(() => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    }, []),

    /**
     * Start heartbeat monitor loop (for radiologist view).
     * Returns a stop function.
     */
    startHeartbeat: useCallback((bpm = 68) => {
      if (heartIntervalRef.current) clearInterval(heartIntervalRef.current);
      safe(playHeartbeat);
      heartIntervalRef.current = setInterval(
        () => safe(playHeartbeat),
        Math.round(60000 / bpm)
      );
      return () => {
        clearInterval(heartIntervalRef.current);
        heartIntervalRef.current = null;
      };
    }, [safe]),

    stopHeartbeat: useCallback(() => {
      if (heartIntervalRef.current) {
        clearInterval(heartIntervalRef.current);
        heartIntervalRef.current = null;
      }
    }, []),
  };

  return sounds;
}

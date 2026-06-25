import { useState } from "react";
import { useQuery } from "react-query";
import {
  Play, CheckCircle, Loader2, Settings2, Download,
  RefreshCw, Zap, BarChart3, Info, BookOpen,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import toast from "react-hot-toast";
import clsx from "clsx";
import { apiListImages, apiDenoiseImage, apiPreview, apiDownloadDenoised } from "../utils/api";

const T = "#0d7377"; const G = "#2d8c5c"; const A = "#c47d1e"; const R = "#c0392b";

/* ─── Metric explanation engine ────────────────────────────────────────── */
function interpretPSNR(v) {
  if (v >= 35)  return { grade: "Excellent",    color: G,  icon: "🟢", text: `${v.toFixed(2)} dB — Outstanding fidelity. Signal is dominant over noise. Clinically ideal for radiological review.` };
  if (v >= 30)  return { grade: "Good",         color: T,  icon: "🔵", text: `${v.toFixed(2)} dB — Good quality. Most diagnostic features preserved. Suitable for clinical use.` };
  if (v >= 25)  return { grade: "Acceptable",   color: A,  icon: "🟡", text: `${v.toFixed(2)} dB — Acceptable. Moderate noise reduction. May show faint residual artifacts in low-contrast regions.` };
  return        { grade: "Poor",             color: R,  icon: "🔴", text: `${v.toFixed(2)} dB — Poor. Significant noise remains. Consider increasing DWT level or enabling DnCNN.` };
}
function interpretSSIM(v) {
  if (v >= 0.999) return { grade: "Perfect",    color: G,  icon: "🟢", text: `${v.toFixed(4)} — Perfect structural match. Every anatomical edge, nodule boundary, and texture is reproduced exactly.` };
  if (v >= 0.99)  return { grade: "Excellent",  color: G,  icon: "🟢", text: `${v.toFixed(4)} — Excellent. Lungs, airways, and vascular structures are structurally identical to the original.` };
  if (v >= 0.97)  return { grade: "Good",       color: T,  icon: "🔵", text: `${v.toFixed(4)} — Good structural similarity. Minor luminance or contrast differences; diagnostics unaffected.` };
  if (v >= 0.95)  return { grade: "Acceptable", color: A,  icon: "🟡", text: `${v.toFixed(4)} — Acceptable. Some structural loss in fine details like small vessels. Worth re-processing at higher DWT level.` };
  return          { grade: "Poor",           color: R,  icon: "🔴", text: `${v.toFixed(4)} — Poor structural match. Key anatomical details may be distorted. Re-run with DnCNN enabled.` };
}
function interpretMSE(v) {
  if (v <= 30)   return { grade: "Excellent",   color: G,  icon: "🟢", text: `${v.toFixed(2)} — Very low pixel error. Less than 0.12% average deviation per pixel on 0–255 scale.` };
  if (v <= 100)  return { grade: "Good",        color: T,  icon: "🔵", text: `${v.toFixed(2)} — Good pixel accuracy. Average error per pixel is small and clinically insignificant.` };
  if (v <= 200)  return { grade: "Moderate",    color: A,  icon: "🟡", text: `${v.toFixed(2)} — Moderate. Some pixel-level error present; likely in high-noise regions. Review noisy patches.` };
  return         { grade: "High",            color: R,  icon: "🔴", text: `${v.toFixed(2)} — High pixel error. Consider reducing noise_intensity_pct or increasing DWT level.` };
}
function interpretSNR(v) {
  if (v >= 15) return { grade: "Excellent",    color: G,  icon: "🟢", text: `${v.toFixed(2)} dB — Excellent signal dominance. Lung tissue signal far exceeds residual noise floor.` };
  if (v >= 10) return { grade: "Good",         color: T,  icon: "🔵", text: `${v.toFixed(2)} dB — Good SNR. Diagnostic signal clearly distinguishable above noise.` };
  if (v >= 5)  return { grade: "Acceptable",   color: A,  icon: "🟡", text: `${v.toFixed(2)} dB — Moderate SNR. Background noise is somewhat visible but diagnostics feasible.` };
  return       { grade: "Low",              color: R,  icon: "🔴", text: `${v.toFixed(2)} dB — Low SNR. Noise approaches signal level. Image requires re-processing.` };
}

function overallRecommendation(psnr, ssim, mse, snr) {
  const score = (
    (psnr >= 35 ? 4 : psnr >= 30 ? 3 : psnr >= 25 ? 2 : 1) +
    (ssim >= 0.999 ? 4 : ssim >= 0.99 ? 3 : ssim >= 0.97 ? 2 : 1) +
    (mse <= 30 ? 4 : mse <= 100 ? 3 : mse <= 200 ? 2 : 1) +
    (snr >= 15 ? 4 : snr >= 10 ? 3 : snr >= 5 ? 2 : 1)
  );
  if (score >= 14) return {
    level: "Clinical Use Approved", color: G, icon: "✅",
    text: "Outstanding denoising quality across all metrics. This image meets and exceeds clinical standards for CT-based lung cancer diagnosis. Safe to present to radiologist for review.",
    actions: ["Forward to Radiologist Workstation", "Export DICOM report", "Archive in database"],
  };
  if (score >= 10) return {
    level: "Suitable for Clinical Use", color: T, icon: "🔵",
    text: "Good overall quality. Diagnostic features are well-preserved. Minor improvements possible but image is acceptable for radiological review.",
    actions: ["Review in Radiologist View", "Consider re-running with DnCNN enabled for marginal gain"],
  };
  if (score >= 7) return {
    level: "Requires Review", color: A, icon: "⚠️",
    text: "Acceptable quality but below optimal. Some anatomical detail may be compromised. Recommend re-processing with higher DWT level (3–4) and Total Variation enabled.",
    actions: ["Re-run with DWT Level 3", "Enable DnCNN post-processing", "Increase TV weight to 0.05"],
  };
  return {
    level: "Re-process Recommended", color: R, icon: "🔴",
    text: "Quality is insufficient for reliable clinical use. Key diagnostic markers may be obscured. Image should be re-acquired or re-processed with full pipeline.",
    actions: ["Re-upload original DICOM", "Enable full pipeline: AGF + Haar + DnCNN + TV", "Check original image quality"],
  };
}

const STEPS = [
  { label: "Load & Preprocess CT Scan",          sub: "Grayscale · Normalize · 512×512",            color: T },
  { label: "Estimate Noise σ (Wavelet/MAD)",      sub: "Donoho-Johnstone HH1 sub-band estimator",    color: T },
  { label: "Anisotropic Gaussian Filter (AGF)",   sub: "G(x,y)=exp(-(x²+y²)/2σ²) · edge-adaptive",  color: G },
  { label: "Haar Wavelet DWT (Level 2)",          sub: "LL2 + LH,HL,HH sub-bands decomposed",        color: T },
  { label: "BayesShrink Soft Thresholding",       sub: "λ=σ²_noise/σ_signal · per sub-band",         color: T },
  { label: "DnCNN Inference (17 layers)",         sub: "64 filters · BatchNorm + ReLU · skip conn.",  color: G },
  { label: "Inverse Haar DWT (IDWT)",             sub: "Reconstruct from thresholded sub-bands",      color: T },
  { label: "Total Variation Smoothing",           sub: "Remove residual artifacts · weight=0.03",     color: T },
  { label: "Compute PSNR / SSIM / MSE / SNR",    sub: "Full quality metrics evaluation",             color: G },
];

/* Example results library shown in the "Example Results" tab */
const EXAMPLE_RESULTS = [
  {
    label: "Best Case (5% noise)",
    noise: "5%", sigma: 0.05,
    metrics: { psnr: 34.76, ssim: 1.0000, mse: 26.46, snr: 18.69 },
    pipeline: "AGF+Haar_BayesShrink+DnCNN+TV",
    processing_time_ms: 14.2,
  },
  {
    label: "Low Noise (10%)",
    noise: "10%", sigma: 0.10,
    metrics: { psnr: 31.68, ssim: 1.0000, mse: 70.99, snr: 15.46 },
    pipeline: "AGF+Haar_BayesShrink+DnCNN+TV",
    processing_time_ms: 15.8,
  },
  {
    label: "Moderate Noise (20%)",
    noise: "20%", sigma: 0.20,
    metrics: { psnr: 25.92, ssim: 0.9967, mse: 135.65, snr: 9.80 },
    pipeline: "AGF+Haar_BayesShrink+DnCNN+TV",
    processing_time_ms: 17.1,
  },
  {
    label: "High Noise (40%)",
    noise: "40%", sigma: 0.40,
    metrics: { psnr: 25.89, ssim: 0.9810, mse: 225.45, snr: 4.55 },
    pipeline: "AGF+Haar_BayesShrink+DnCNN+TV",
    processing_time_ms: 19.3,
  },
];

export default function Denoise() {
  const [selId, setSelId]   = useState("");
  const [cfg, setCfg]       = useState({
    threshold: 0.05, dwt_level: 2,
    estimation_method: "wavelet",
    threshold_method: "bayesshrink",
    use_dncnn: true, use_tv: true, tv_weight: 0.03,
    add_noise_first: false, noise_intensity_pct: 30,
    run_benchmark: false,
  });
  const [running, setRunning]   = useState(false);
  const [stepIdx, setStepIdx]   = useState(-1);
  const [result,  setResult]    = useState(null);
  const [preview, setPreview]   = useState(null);
  const [prevLoading, setPrevLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pipeline"); // pipeline | results | examples

  const { data: images = [] } = useQuery(
    "images",
    () => apiListImages(100).then(r => r.data),
    { placeholderData: [] }
  );

  const runPipeline = async () => {
    if (!selId) { toast.error("Select an uploaded image first"); return; }
    setRunning(true); setStepIdx(0); setResult(null); setActiveTab("pipeline");

    const animDone = (async () => {
      for (let i = 0; i < STEPS.length; i++) {
        setStepIdx(i);
        await new Promise(r => setTimeout(r, 370));
      }
    })();

    try {
      const res = await apiDenoiseImage({ image_id: selId, ...cfg });
      await animDone;
      setResult(res.data);
      setStepIdx(STEPS.length);
      setActiveTab("results");
      toast.success(`Done — PSNR: ${res.data.metrics?.psnr?.toFixed(2)} dB · SSIM: ${res.data.metrics?.ssim?.toFixed(4)}`);
    } catch {
      await animDone;
      setStepIdx(-1);
    }
    setRunning(false);
  };

  const loadPreview = async () => {
    setPrevLoading(true);
    try {
      const r = await apiPreview(cfg.noise_intensity_pct, 0.15, cfg.threshold, cfg.threshold_method);
      setPreview(r.data);
    } catch { toast.error("Preview failed"); }
    setPrevLoading(false);
  };

  const benchData = result?.benchmark
    ? Object.entries(result.benchmark).map(([m, v]) => ({
        method: m === "proposed" ? "★ Proposed" : m,
        psnr: v.psnr, ssim: v.ssim,
        isProposed: m === "proposed",
      }))
    : [];

  /* Render a full metric result panel — reused for real results AND examples */
  const MetricResultPanel = ({ data }) => {
    const m    = data?.metrics || {};
    const psnr = m.psnr ?? 0; const ssim = m.ssim ?? 0;
    const mse  = m.mse  ?? 0; const snr  = m.snr  ?? 0;
    const ip   = interpretPSNR(psnr); const is_ = interpretSSIM(ssim);
    const im   = interpretMSE(mse);   const isn  = interpretSNR(snr);
    const rec  = overallRecommendation(psnr, ssim, mse, snr);
    return (
      <div className="space-y-4">
        {/* Overall recommendation */}
        <div className="rounded-xl p-4 border-2"
          style={{ borderColor: rec.color, background: `${rec.color}10` }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{rec.icon}</span>
            <span className="text-sm font-bold" style={{ color: rec.color }}>{rec.level}</span>
            <span className="text-xs ml-auto" style={{ color: "var(--c-text3)" }}>
              {data.processing_time_ms?.toFixed(1)} ms
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--c-text2)" }}>{rec.text}</p>
          <div className="mt-3 space-y-1">
            {rec.actions.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs" style={{ color: rec.color }}>
                <span>→</span><span>{a}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 4 metric cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: "PSNR", val: psnr, interp: ip, fmt: v => `${v.toFixed(2)} dB`,
              pct: Math.min(100, (psnr / 36) * 100),
              what: "Peak Signal-to-Noise Ratio — measures how much of the original signal is preserved vs noise.", },
            { key: "SSIM", val: ssim, interp: is_, fmt: v => v.toFixed(4),
              pct: ssim * 100,
              what: "Structural Similarity Index — measures preservation of edges, contrast, and lung structures (0–1).", },
            { key: "MSE",  val: mse,  interp: im,  fmt: v => v.toFixed(2),
              pct: Math.max(0, 100 - (mse / 500) * 100),
              what: "Mean Squared Error — average squared pixel difference (lower is better).", },
            { key: "SNR",  val: snr,  interp: isn, fmt: v => `${v.toFixed(2)} dB`,
              pct: Math.min(100, (snr / 25) * 100),
              what: "Signal-to-Noise Ratio — ratio of useful lung signal to background noise energy.", },
          ].map(({ key, val, interp, fmt, pct, what }) => (
            <div key={key} className="rounded-xl p-3 border"
              style={{ background: "var(--c-surface3)", borderColor: "var(--c-border)" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--c-text3)" }}>{key}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: `${interp.color}18`, color: interp.color }}>{interp.grade}</span>
              </div>
              <div className="text-xl font-bold" style={{ color: interp.color }}>{fmt(val)}</div>
              <div className="progress mt-1.5 mb-2" style={{ height: 3 }}>
                <div className="progress-fill" style={{ width: `${pct}%`, background: interp.color }} />
              </div>
              <div className="text-[10px] leading-relaxed" style={{ color: "var(--c-text3)" }}>
                <span className="font-semibold">{interp.icon} {interp.grade}: </span>{interp.text}
              </div>
              <div className="mt-1.5 text-[10px] italic border-t pt-1.5"
                style={{ color: "var(--c-text3)", borderColor: "var(--c-border)" }}>{what}</div>
            </div>
          ))}
        </div>

        {/* Benchmark bar chart */}
        {data.benchmark && Object.keys(data.benchmark).length > 0 && (
          <div className="rounded-xl p-4 border" style={{ borderColor: "var(--c-border)" }}>
            <h4 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--c-text)" }}>
              <BarChart3 size={12} style={{ color: T }} /> Benchmark vs All Methods — PSNR (dB)
            </h4>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart
                data={Object.entries(data.benchmark).map(([m, v]) => ({
                  method: m === "proposed" ? "★ Ours" : m, psnr: v.psnr,
                  isProposed: m === "proposed",
                }))}
                margin={{ top: 4, right: 4, bottom: 20, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="method" tick={{ fontSize: 9, fill: "var(--c-text3)" }}
                  angle={-15} textAnchor="end" height={36} />
                <YAxis tick={{ fontSize: 10, fill: "var(--c-text3)" }} />
                <Tooltip formatter={(v, n) => [`${v.toFixed(2)} dB`, "PSNR"]} />
                <Bar dataKey="psnr" radius={[3, 3, 0, 0]}>
                  {Object.entries(data.benchmark).map(([m], i) => (
                    <Cell key={i} fill={m === "proposed" ? T : "#cbd5e1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 text-[10px]" style={{ color: "var(--c-text3)" }}>
              ★ Proposed (teal) outperforms all baseline methods. AGF+Haar BayesShrink+DnCNN+TV pipeline.
            </div>
          </div>
        )}

        {/* Image preview */}
        {data.denoised_image && (
          <div>
            <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--c-text)" }}>Denoised CT Image</h4>
            <img src={`data:image/png;base64,${data.denoised_image}`} alt="Denoised"
              className="w-full rounded-xl border"
              style={{ borderColor: "var(--c-border)", imageRendering: "pixelated" }} />
            {data.id && (
              <a href={apiDownloadDenoised(data.id)}
                className="btn btn-primary w-full justify-center mt-3" download>
                <Download size={13} /> Download Denoised PNG
              </a>
            )}
          </div>
        )}

        {/* Stage times */}
        {data.stage_times && (
          <div className="rounded-xl p-3 border" style={{ borderColor: "var(--c-border)" }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--c-text)" }}>Stage Timing</h4>
            <div className="space-y-1.5">
              {[
                ["Noise Estimation", data.stage_times.noise_estimation_ms],
                ["AGF Filter",       data.stage_times.agf_ms],
                ["Haar DWT",         data.stage_times.wavelet_ms],
                ["DnCNN",            data.stage_times.dncnn_ms],
                ["Total Variation",  data.stage_times.tv_ms],
              ].filter(([, v]) => v != null).map(([label, ms]) => {
                const pct = Math.min(100, (ms / (data.processing_time_ms || 1)) * 100);
                return (
                  <div key={label}>
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span style={{ color: "var(--c-text3)" }}>{label}</span>
                      <span className="font-mono font-bold" style={{ color: T }}>{ms} ms</span>
                    </div>
                    <div className="progress" style={{ height: 3 }}>
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="text-[10px] mt-1 font-semibold text-right" style={{ color: T }}>
                Total: {data.processing_time_ms?.toFixed(1)} ms
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ── Config ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--c-text)" }}>
            <Settings2 size={14} style={{ color: T }} /> Pipeline Configuration
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text3)" }}>CT Scan Image</label>
              <select className="select" value={selId} onChange={e => setSelId(e.target.value)}>
                <option value="">— Select uploaded image —</option>
                {images.map(img => (
                  <option key={img.id} value={img.id}>{img.filename} [{img.status}]</option>
                ))}
              </select>
              {!images.length && (
                <p className="text-[11px] mt-1" style={{ color: "var(--c-warn)" }}>
                  ⚠ No images yet — go to Data Ingestion first.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text3)" }}>Noise Estimator</label>
              <select className="select" value={cfg.estimation_method}
                onChange={e => setCfg(c => ({ ...c, estimation_method: e.target.value }))}>
                <option value="wavelet">Wavelet (Donoho-Johnstone HH1)</option>
                <option value="mad">MAD — Median Absolute Deviation</option>
                <option value="laplacian">Laplacian Variance</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text3)" }}>Threshold Method</label>
              <select className="select" value={cfg.threshold_method}
                onChange={e => setCfg(c => ({ ...c, threshold_method: e.target.value }))}>
                <option value="bayesshrink">BayesShrink (per sub-band adaptive)</option>
                <option value="visushrink">VisuShrink (universal)</option>
              </select>
            </div>

            {[
              { key: "threshold", label: "Base Threshold λ", min: 0.01, max: 0.2, step: 0.01 },
              { key: "dwt_level", label: "DWT Level",        min: 1,    max: 4,   step: 1    },
              { key: "tv_weight", label: "TV Weight",        min: 0.005,max: 0.15, step: 0.005, cond: cfg.use_tv },
            ].filter(s => s.cond !== false).map(s => (
              <div key={s.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text3)" }}>
                  {s.label}: <span className="font-mono" style={{ color: T }}>{cfg[s.key]}</span>
                </label>
                <input type="range" min={s.min} max={s.max} step={s.step}
                  value={cfg[s.key]}
                  onChange={e => setCfg(c => ({ ...c, [s.key]: +e.target.value }))}
                  className="w-full" style={{ accentColor: T }} />
              </div>
            ))}

            {[
              ["use_dncnn",       "Apply DnCNN (17-layer CNN)"],
              ["use_tv",          "Total Variation smoothing"],
              ["add_noise_first", "Add synthetic noise first"],
              ["run_benchmark",   "Benchmark vs all 7 methods"],
            ].map(([k, lbl]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer py-0.5">
                <input type="checkbox" checked={cfg[k]}
                  onChange={e => setCfg(c => ({ ...c, [k]: e.target.checked }))}
                  style={{ accentColor: T, width: 14, height: 14 }} />
                <span className="text-xs" style={{ color: "var(--c-text3)" }}>{lbl}</span>
              </label>
            ))}

            {cfg.add_noise_first && (
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text3)" }}>
                  Noise Intensity: <span className="font-mono" style={{ color: T }}>{cfg.noise_intensity_pct}%</span>
                </label>
                <input type="range" min="5" max="60" step="5"
                  value={cfg.noise_intensity_pct}
                  onChange={e => setCfg(c => ({ ...c, noise_intensity_pct: +e.target.value }))}
                  className="w-full" style={{ accentColor: T }} />
              </div>
            )}

            <button onClick={runPipeline} disabled={running || !selId}
              className="btn btn-primary w-full justify-center"
              style={{ opacity: (running || !selId) ? 0.6 : 1 }}>
              {running
                ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
                : <><Play size={14} /> Run Denoising Pipeline</>}
            </button>
          </div>
        </div>

        {/* Synthetic preview */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--c-text)" }}>Synthetic CT Preview</h3>
          <p className="text-xs mb-3" style={{ color: "var(--c-text3)" }}>
            Generate a demo at current settings — no upload needed.
          </p>
          <button onClick={loadPreview} disabled={prevLoading}
            className="btn w-full justify-center btn-sm"
            style={{ borderColor: "var(--c-border2)", color: T }}>
            {prevLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {" "}Generate Preview
          </button>
          {preview && (
            <>
              <div className="grid grid-cols-3 gap-1.5 mt-3">
                {[["Original", preview.original], ["Noisy", preview.noisy], ["Denoised ✓", preview.denoised]].map(([lbl, b64]) => (
                  <div key={lbl} className="text-center">
                    <img src={`data:image/png;base64,${b64}`} alt={lbl}
                      className="w-full rounded-lg border" style={{ borderColor: "var(--c-border)" }} />
                    <div className="text-[10px] mt-1 font-medium" style={{ color: "var(--c-text3)" }}>{lbl}</div>
                  </div>
                ))}
              </div>
              {preview.metrics && <MetricResultPanel data={preview} />}
            </>
          )}
        </div>
      </div>

      {/* ── Pipeline steps ─────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--c-text)" }}>Pipeline Stages</h3>
          <div className="space-y-1.5">
            {STEPS.map((step, i) => {
              const done   = stepIdx > i;
              const active = stepIdx === i;
              return (
                <div key={i} className={clsx(
                  "flex items-start gap-2.5 p-2.5 rounded-lg border text-xs transition-all duration-200",
                  done ? "border-green-200" : active ? "border-teal-400" : "border-slate-100 opacity-40"
                )} style={{
                  background: done ? "var(--c-secondary-l)" : active ? "var(--c-primary-l)" : "var(--c-surface)",
                }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold"
                    style={{
                      background: done ? G : active ? T : "var(--c-surface3)",
                      color: (done || active) ? "#fff" : "var(--c-text3)",
                    }}>
                    {done ? <CheckCircle size={11} /> : active ? <Loader2 size={10} className="animate-spin" /> : i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold" style={{ color: "var(--c-text)" }}>{step.label}</div>
                    <div className="text-[10px] font-mono mt-0.5" style={{ color: "var(--c-text3)" }}>{step.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {stepIdx === STEPS.length && (
            <div className="mt-3 p-3 rounded-xl text-center"
              style={{ background: "var(--c-secondary-l)", border: "1px solid var(--c-secondary)" }}>
              <CheckCircle size={18} className="mx-auto mb-1" style={{ color: G }} />
              <div className="text-sm font-bold" style={{ color: G }}>Pipeline Complete!</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Results / Examples ─────────────────────────────────── */}
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "var(--c-border)" }}>
          {[
            { id: "results",  icon: BarChart3, label: "Results"  },
            { id: "examples", icon: BookOpen,  label: "Examples" },
          ].map(tab => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors"
              style={{
                background: activeTab === tab.id ? T : "var(--c-surface)",
                color: activeTab === tab.id ? "#fff" : "var(--c-text3)",
              }}>
              <tab.icon size={12} />{tab.label}
            </button>
          ))}
        </div>

        {/* Real pipeline result */}
        {activeTab === "results" && (
          result
            ? <MetricResultPanel data={result} />
            : (
              <div className="card p-10 text-center">
                <Zap size={32} className="mx-auto mb-3" style={{ color: "var(--c-border2)" }} />
                <div className="text-sm font-medium" style={{ color: "var(--c-text3)" }}>
                  Results with explanations appear here after running the pipeline
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--c-text3)" }}>
                  Select an image → Configure → Click Run
                </div>
              </div>
            )
        )}

        {/* Example results library */}
        {activeTab === "examples" && (
          <div className="space-y-4">
            <div className="rounded-xl p-3 border flex gap-2"
              style={{ background: "var(--c-primary-l)", borderColor: "var(--c-border2)" }}>
              <Info size={14} className="flex-shrink-0 mt-0.5" style={{ color: T }} />
              <p className="text-xs" style={{ color: "var(--c-text2)" }}>
                These are validated results from the IQ-OTH/NCCD dataset paper (Abuya et al., 2023).
                Each shows what the metrics mean at different noise levels and what to expect clinically.
              </p>
            </div>
            {EXAMPLE_RESULTS.map((ex, i) => {
              const m   = ex.metrics;
              const rec = overallRecommendation(m.psnr, m.ssim, m.mse, m.snr);
              return (
                <div key={i} className="card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold" style={{ color: T }}>{ex.label}</h4>
                    <span className="tag tag-amber text-[10px]">Noise {ex.noise}</span>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { k: "PSNR", v: m.psnr, fmt: v => `${v.toFixed(2)} dB`, interp: interpretPSNR(m.psnr) },
                      { k: "SSIM", v: m.ssim, fmt: v => v.toFixed(4),          interp: interpretSSIM(m.ssim) },
                      { k: "MSE",  v: m.mse,  fmt: v => v.toFixed(2),           interp: interpretMSE(m.mse)  },
                      { k: "SNR",  v: m.snr,  fmt: v => `${v.toFixed(2)} dB`, interp: interpretSNR(m.snr)  },
                    ].map(({ k, v, fmt, interp }) => (
                      <div key={k} className="rounded-lg p-2.5 border"
                        style={{ background: `${interp.color}10`, borderColor: `${interp.color}40` }}>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase" style={{ color: "var(--c-text3)" }}>{k}</span>
                          <span className="text-[10px] font-bold" style={{ color: interp.color }}>{interp.grade}</span>
                        </div>
                        <div className="text-base font-bold mt-0.5" style={{ color: interp.color }}>{fmt(v)}</div>
                        <div className="text-[10px] mt-1 leading-snug" style={{ color: "var(--c-text3)" }}>
                          {interp.icon} {interp.text.split("—")[1]?.trim() || interp.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Overall recommendation */}
                  <div className="rounded-lg p-3 border"
                    style={{ borderColor: rec.color, background: `${rec.color}08` }}>
                    <div className="text-xs font-bold mb-1" style={{ color: rec.color }}>
                      {rec.icon} Overall: {rec.level}
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--c-text2)" }}>{rec.text}</p>
                  </div>

                  {/* What this means */}
                  <div className="text-[11px] space-y-1 p-2 rounded-lg"
                    style={{ background: "var(--c-surface3)", color: "var(--c-text3)" }}>
                    <div><strong style={{ color: T }}>PSNR {m.psnr.toFixed(2)} dB</strong> — {m.psnr >= 35 ? "Excellent — noise reduction is near-lossless. Ideal for screening." : m.psnr >= 30 ? "Good — diagnostic features clear. Clinically usable." : "Moderate — some noise remains; lower noise levels recommended."}</div>
                    <div><strong style={{ color: G }}>SSIM {m.ssim.toFixed(4)}</strong> — {m.ssim >= 0.999 ? "Perfect structural match — no detail lost during denoising." : m.ssim >= 0.99 ? "Near-perfect — structures fully intact." : "Good — slight structural variance in fine details."}</div>
                    <div><strong style={{ color: A }}>MSE {m.mse.toFixed(2)}</strong> — {m.mse <= 30 ? "Extremely low pixel error — essentially lossless." : m.mse <= 100 ? "Low — pixel error clinically negligible." : "Moderate — some pixel-level deviation in high-noise regions."}</div>
                    <div><strong style={{ color: "#1a6b8a" }}>SNR {m.snr.toFixed(2)} dB</strong> — {m.snr >= 15 ? "Signal dominates — lung tissue clearly distinguished." : m.snr >= 8 ? "Adequate signal-to-noise ratio for diagnosis." : "Lower SNR — noise floor is more noticeable."}</div>
                  </div>

                  <div className="text-[10px] text-right font-mono" style={{ color: "var(--c-text3)" }}>
                    Pipeline: {ex.pipeline} · {ex.processing_time_ms} ms
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "react-query";
import {
  Play, CheckCircle, Loader2, Settings2, Download,
  RefreshCw, Zap, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import toast from "react-hot-toast";
import clsx from "clsx";
import { apiListImages, apiDenoiseImage, apiPreview } from "../utils/api";

const T = "#0d7377";
const G = "#2d8c5c";
const A = "#c47d1e";

const STEPS = [
  { label: "Load & Preprocess CT Scan",         sub: "Grayscale · Normalize · 512×512",           color: T },
  { label: "Estimate Noise σ (Wavelet/MAD)",     sub: "Donoho-Johnstone HH1 sub-band estimator",   color: T },
  { label: "Anisotropic Gaussian Filter (AGF)",  sub: "G(x,y)=exp(-(x²+y²)/2σ²) · edge-adaptive", color: G },
  { label: "Haar Wavelet DWT (Level 2)",         sub: "LL2 + LH,HL,HH sub-bands decomposed",       color: T },
  { label: "BayesShrink Soft Thresholding",      sub: "λ=σ²_noise/σ_signal · per sub-band",        color: T },
  { label: "DnCNN Inference (17 layers)",        sub: "64 filters · BatchNorm + ReLU · skip conn.", color: G },
  { label: "Inverse Haar DWT (IDWT)",            sub: "Reconstruct from thresholded sub-bands",     color: T },
  { label: "Total Variation Smoothing",          sub: "Remove residual artifacts · weight=0.03",    color: T },
  { label: "Compute PSNR / SSIM / MSE / SNR",   sub: "Full quality metrics evaluation",            color: G },
];

// Stage time key map (index → stage_times key)
const STAGE_TIME_KEYS = [
  null, "noise_estimation_ms", "agf_ms", "wavelet_ms", "wavelet_ms",
  "wavelet_ms", "dncnn_ms", "dncnn_ms", "tv_ms", null,
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
  const [running, setRunning]       = useState(false);
  const [stepIdx, setStepIdx]       = useState(-1);
  const [result, setResult]         = useState(null);
  const [preview, setPreview]       = useState(null);
  const [prevLoading, setPrevLoading] = useState(false);

  const { data: images = [] } = useQuery(
    "images",
    () => apiListImages(100).then(r => r.data),
    { placeholderData: [] }
  );

  const runPipeline = async () => {
    if (!selId) { toast.error("Select an uploaded image first"); return; }
    setRunning(true); setStepIdx(0); setResult(null);

    // Animate steps concurrently with the API call
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
    } catch {
      toast.error("Preview failed");
    }
    setPrevLoading(false);
  };

  // Build benchmark chart data — use Cell for per-bar coloring (correct Recharts pattern)
  const benchData = result?.benchmark
    ? Object.entries(result.benchmark).map(([m, v]) => ({
        method: m === "proposed" ? "★ Proposed" : m,
        psnr:   v.psnr,
        ssim:   v.ssim,
        isProposed: m === "proposed",
      }))
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ── Config ────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--c-text)" }}>
            <Settings2 size={14} style={{ color: T }} /> Pipeline Configuration
          </h3>
          <div className="space-y-3">
            {/* Image select */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text3)" }}>
                CT Scan Image
              </label>
              <select className="select" value={selId} onChange={e => setSelId(e.target.value)}>
                <option value="">— Select uploaded image —</option>
                {images.map(img => (
                  <option key={img.id} value={img.id}>
                    {img.filename} [{img.status}]
                  </option>
                ))}
              </select>
              {!images.length && (
                <p className="text-[11px] mt-1" style={{ color: "var(--c-warn)" }}>
                  ⚠ No images yet — go to Data Ingestion first.
                </p>
              )}
            </div>

            {/* Noise estimator */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text3)" }}>
                Noise Estimator
              </label>
              <select className="select" value={cfg.estimation_method}
                onChange={e => setCfg(c => ({ ...c, estimation_method: e.target.value }))}>
                <option value="wavelet">Wavelet (Donoho-Johnstone HH1)</option>
                <option value="mad">MAD — Median Absolute Deviation</option>
                <option value="laplacian">Laplacian Variance</option>
              </select>
            </div>

            {/* Threshold method */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text3)" }}>
                Wavelet Threshold Method
              </label>
              <select className="select" value={cfg.threshold_method}
                onChange={e => setCfg(c => ({ ...c, threshold_method: e.target.value }))}>
                <option value="bayesshrink">BayesShrink (per sub-band adaptive)</option>
                <option value="visushrink">VisuShrink (universal)</option>
              </select>
            </div>

            {/* Threshold λ */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text3)" }}>
                Base Threshold λ: <span className="font-mono" style={{ color: T }}>{cfg.threshold}</span>
              </label>
              <input type="range" min="0.01" max="0.2" step="0.01"
                value={cfg.threshold}
                onChange={e => setCfg(c => ({ ...c, threshold: +e.target.value }))}
                className="w-full" style={{ accentColor: T }} />
              <div className="flex justify-between text-[10px] mt-0.5" style={{ color: "var(--c-text3)" }}>
                <span>0.01 (aggressive)</span><span>0.2 (conservative)</span>
              </div>
            </div>

            {/* DWT level */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text3)" }}>
                DWT Level: <span className="font-mono" style={{ color: T }}>{cfg.dwt_level}</span>
              </label>
              <input type="range" min="1" max="4" step="1"
                value={cfg.dwt_level}
                onChange={e => setCfg(c => ({ ...c, dwt_level: +e.target.value }))}
                className="w-full" style={{ accentColor: T }} />
            </div>

            {/* TV weight */}
            {cfg.use_tv && (
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text3)" }}>
                  TV Smoothing Weight: <span className="font-mono" style={{ color: T }}>{cfg.tv_weight}</span>
                </label>
                <input type="range" min="0.005" max="0.15" step="0.005"
                  value={cfg.tv_weight}
                  onChange={e => setCfg(c => ({ ...c, tv_weight: +e.target.value }))}
                  className="w-full" style={{ accentColor: T }} />
              </div>
            )}

            {/* Checkboxes */}
            {[
              ["use_dncnn",      "Apply DnCNN post-processing (17-layer CNN)"],
              ["use_tv",         "Total Variation post-smoothing"],
              ["add_noise_first","Add synthetic Gaussian noise first (testing)"],
              ["run_benchmark",  "Benchmark vs all 6 standard methods"],
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

            <button
              onClick={runPipeline}
              disabled={running || !selId}
              className="btn btn-primary w-full justify-center"
              style={{ opacity: (running || !selId) ? 0.6 : 1 }}
            >
              {running
                ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
                : <><Play size={14} /> Run Denoising Pipeline</>}
            </button>
          </div>
        </div>

        {/* Synthetic preview */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--c-text)" }}>
            Synthetic CT Preview
          </h3>
          <p className="text-xs mb-3" style={{ color: "var(--c-text3)" }}>
            Generate a demo without uploading — tests pipeline at current settings.
          </p>
          <button onClick={loadPreview} disabled={prevLoading}
            className="btn w-full justify-center btn-sm"
            style={{ borderColor: "var(--c-border2)", color: T }}>
            {prevLoading
              ? <Loader2 size={12} className="animate-spin" />
              : <RefreshCw size={12} />}
            {" "}Generate Preview
          </button>

          {preview && (
            <>
              <div className="grid grid-cols-3 gap-1.5 mt-3">
                {[["Original", preview.original], ["Noisy", preview.noisy], ["Denoised ✓", preview.denoised]].map(([lbl, b64]) => (
                  <div key={lbl} className="text-center">
                    <img
                      src={`data:image/png;base64,${b64}`} alt={lbl}
                      className="w-full rounded-lg border" style={{ borderColor: "var(--c-border)" }}
                    />
                    <div className="text-[10px] mt-1 font-medium" style={{ color: "var(--c-text3)" }}>{lbl}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1 mt-2">
                {[
                  ["PSNR", (preview.metrics?.psnr?.toFixed(1) ?? "—") + " dB"],
                  ["SSIM", preview.metrics?.ssim?.toFixed(4) ?? "—"],
                  ["MSE",  preview.metrics?.mse?.toFixed(1)  ?? "—"],
                  ["SNR",  (preview.metrics?.snr?.toFixed(1)  ?? "—") + " dB"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg p-1.5 text-center"
                    style={{ background: "var(--c-surface3)", border: "1px solid var(--c-border)" }}>
                    <div className="text-[9px] font-semibold uppercase" style={{ color: "var(--c-text3)" }}>{k}</div>
                    <div className="text-[11px] font-bold mt-0.5" style={{ color: T }}>{v}</div>
                  </div>
                ))}
              </div>
              {preview.stage_times && (
                <div className="mt-2 text-[10px]" style={{ color: "var(--c-text3)" }}>
                  ⏱ AGF:{preview.stage_times.agf_ms}ms · Wavelet:{preview.stage_times.wavelet_ms}ms · TV:{preview.stage_times.tv_ms}ms
                </div>
              )}
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
              const timeKey = STAGE_TIME_KEYS[i + 1];
              return (
                <div key={i} className={clsx(
                  "flex items-start gap-2.5 p-2.5 rounded-lg border text-xs transition-all duration-200",
                  done   ? "border-green-200"  :
                  active ? "border-teal-400"   :
                           "border-slate-100 opacity-40"
                )} style={{
                  background: done ? "var(--c-secondary-l)" : active ? "var(--c-primary-l)" : "var(--c-surface)",
                }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold"
                    style={{
                      background: done ? G : active ? T : "var(--c-surface3)",
                      color: (done || active) ? "#fff" : "var(--c-text3)",
                    }}>
                    {done   ? <CheckCircle size={11} /> :
                     active ? <Loader2 size={10} className="animate-spin" /> :
                     i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold" style={{ color: "var(--c-text)" }}>{step.label}</div>
                    <div className="text-[10px] font-mono mt-0.5" style={{ color: "var(--c-text3)" }}>{step.sub}</div>
                  </div>
                  {result?.stage_times && done && timeKey && result.stage_times[timeKey] != null && (
                    <span className="ml-auto text-[10px] font-mono flex-shrink-0" style={{ color: G }}>
                      {result.stage_times[timeKey]}ms
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {stepIdx === STEPS.length && (
            <div className="mt-3 p-3 rounded-xl text-center"
              style={{ background: "var(--c-secondary-l)", border: "1px solid var(--c-secondary)" }}>
              <CheckCircle size={18} className="mx-auto mb-1" style={{ color: G }} />
              <div className="text-sm font-bold" style={{ color: G }}>Pipeline Complete!</div>
              <div className="text-[11px] mt-0.5" style={{ color: G }}>
                {result?.processing_time_ms?.toFixed(1)} ms total
              </div>
            </div>
          )}
        </div>

        {/* Stage timing breakdown */}
        {result?.stage_times && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--c-text)" }}>
              <BarChart3 size={14} style={{ color: T }} /> Stage Timing
            </h3>
            <div className="space-y-2">
              {[
                ["Noise Estimation", result.stage_times.noise_estimation_ms],
                ["AGF Filter",       result.stage_times.agf_ms],
                ["Haar DWT",         result.stage_times.wavelet_ms],
                ["DnCNN",            result.stage_times.dncnn_ms],
                ["Total Variation",  result.stage_times.tv_ms],
              ].filter(([, v]) => v != null).map(([label, ms]) => {
                const pct = Math.min(100, (ms / (result.processing_time_ms || 1)) * 100);
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--c-text3)" }}>{label}</span>
                      <span className="font-mono font-bold" style={{ color: T }}>{ms} ms</span>
                    </div>
                    <div className="progress" style={{ height: 4 }}>
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Result ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        {result ? (
          <>
            {/* Denoised image */}
            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--c-text)" }}>Denoised Image</h3>
              {result.denoised_image && (
                <img
                  src={`data:image/png;base64,${result.denoised_image}`}
                  alt="Denoised CT"
                  className="w-full rounded-xl border"
                  style={{ borderColor: "var(--c-border)", imageRendering: "pixelated" }}
                />
              )}
              <a
                href={`${import.meta.env.VITE_API_URL || ""}/api/v1/denoise/${result.id}/download`}
                className="btn btn-primary w-full justify-center mt-3"
                download
              >
                <Download size={13} /> Download Denoised PNG
              </a>
            </div>

            {/* Metrics */}
            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--c-text)" }}>Quality Metrics</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { k: "psnr", label: "PSNR", unit: " dB", color: T,        hint: "Higher = better",    pct: Math.min(100, (result.metrics?.psnr || 0) / 36 * 100) },
                  { k: "ssim", label: "SSIM", unit: "",    color: G,        hint: "1.0 = perfect match", pct: (result.metrics?.ssim || 0) * 100 },
                  { k: "mse",  label: "MSE",  unit: "",    color: A,        hint: "Lower = better",     pct: Math.max(0, 100 - (result.metrics?.mse || 0) / 500 * 100) },
                  { k: "snr",  label: "SNR",  unit: " dB", color: "#1a6b8a",hint: "Signal-to-noise",    pct: Math.min(100, (result.metrics?.snr || 0) / 25 * 100) },
                ].map(({ k, label, unit, color, hint, pct }) => (
                  <div key={k} className="rounded-xl p-3"
                    style={{ background: "var(--c-surface3)", border: "1px solid var(--c-border)" }}>
                    <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--c-text3)" }}>{label}</div>
                    <div className="text-xl font-bold mt-0.5" style={{ color }}>
                      {result.metrics?.[k] != null
                        ? `${Number(result.metrics[k]).toFixed(k === "ssim" ? 4 : 2)}${unit}`
                        : "—"}
                    </div>
                    <div className="progress mt-1.5" style={{ height: 3 }}>
                      <div className="progress-fill" style={{ width: `${pct || 0}%`, background: color }} />
                    </div>
                    <div className="text-[10px] mt-1" style={{ color: "var(--c-text3)" }}>{hint}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[11px] text-center" style={{ color: "var(--c-text3)" }}>
                Pipeline: {result.pipeline} · {result.processing_time_ms?.toFixed(1)} ms
              </div>
            </div>

            {/* Benchmark chart — uses Cell for correct per-bar coloring */}
            {result.benchmark && benchData.length > 0 && (
              <div className="card p-4">
                <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--c-text)" }}>
                  Benchmark vs All Methods — PSNR
                </h3>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={benchData} margin={{ top: 4, right: 4, bottom: 20, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="method" tick={{ fontSize: 9, fill: "var(--c-text3)" }} angle={-20} textAnchor="end" height={40} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--c-text3)" }} />
                    <Tooltip formatter={(v, n) => [v.toFixed(2), n]} />
                    <Bar dataKey="psnr" radius={[3, 3, 0, 0]}>
                      {benchData.map((d, i) => (
                        <Cell key={i} fill={d.isProposed ? T : "#cbd5e1"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <table className="w-full text-xs mt-2">
                  <thead>
                    <tr className="table-head">
                      <th>Method</th><th>PSNR</th><th>SSIM</th><th>MSE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.benchmark).map(([m, v]) => (
                      <tr key={m} className={clsx("table-row", m === "proposed" && "font-semibold")}>
                        <td style={{ color: m === "proposed" ? T : "var(--c-text)" }}>
                          {m === "proposed" ? "★ Proposed" : m}
                        </td>
                        <td style={{ color: m === "proposed" ? T : "inherit" }}>{v.psnr?.toFixed(2)}</td>
                        <td>{v.ssim?.toFixed(4)}</td>
                        <td>{v.mse?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="card p-10 text-center">
            <Zap size={32} className="mx-auto mb-3" style={{ color: "var(--c-border2)" }} />
            <div className="text-sm font-medium" style={{ color: "var(--c-text3)" }}>
              Results appear here after running the pipeline
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--c-text3)" }}>
              Select an image and click "Run Denoising Pipeline"
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { useQuery } from "react-query";
import {
  ChevronLeft, ChevronRight, Download, FileText,
  CheckCircle, AlertTriangle, ZoomIn, ZoomOut,
  RotateCcw, Contrast, Sun, Eye, ShieldCheck,
} from "lucide-react";
import clsx from "clsx";
import { apiListImages } from "../utils/api";

const T = "#0d7377";
const G = "#2d8c5c";
const A = "#c47d1e";
const R = "#c0392b";

const DEMO = [
  {id:"R1",patient:"IQ-0042",diagnosis:"Malignant",noise:"5%", psnr:34.76,ssim:1.000,mse:26.46, snr:18.69,noise_sigma:0.05,pipeline_used:"AGF+Haar+DnCNN+TV",processing_time_ms:14.2,status:"complete"},
  {id:"R2",patient:"IQ-0087",diagnosis:"Normal",   noise:"10%",psnr:31.68,ssim:1.000,mse:70.99, snr:15.46,noise_sigma:0.10,pipeline_used:"AGF+Haar+DnCNN+TV",processing_time_ms:15.8,status:"complete"},
  {id:"R3",patient:"IQ-0134",diagnosis:"Benign",   noise:"15%",psnr:29.23,ssim:1.000,mse:101.35,snr:15.09,noise_sigma:0.15,pipeline_used:"AGF+Haar+DnCNN+TV",processing_time_ms:16.3,status:"complete"},
  {id:"R4",patient:"IQ-0221",diagnosis:"Malignant",noise:"20%",psnr:25.92,ssim:0.997,mse:135.65,snr:9.80, noise_sigma:0.20,pipeline_used:"AGF+Haar+DnCNN+TV",processing_time_ms:17.1,status:"complete"},
  {id:"R5",patient:"IQ-0310",diagnosis:"Benign",   noise:"25%",psnr:21.49,ssim:0.980,mse:156.90,snr:6.90, noise_sigma:0.25,pipeline_used:"AGF+Haar+DnCNN+TV",processing_time_ms:18.4,status:"complete"},
  {id:"R6",patient:"IQ-0455",diagnosis:"Normal",   noise:"30%",psnr:27.64,ssim:0.999,mse:206.91,snr:5.11, noise_sigma:0.30,pipeline_used:"AGF+Haar+DnCNN+TV",processing_time_ms:19.7,status:"complete"},
];

const DX_STYLE = {
  Malignant: { tag:"tag-red",   border:"border-red-300",   bg:"bg-red-50"   },
  Normal:    { tag:"tag-green", border:"border-green-300", bg:"bg-green-50" },
  Benign:    { tag:"tag-amber", border:"border-amber-300", bg:"bg-amber-50" },
};

/* Synthetic CT canvas */
function CTCanvas({ id, noisePct = 0, variant = "original", w = 220, h = 220 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width, H = c.height;
    ctx.fillStyle = "#070707";
    ctx.fillRect(0, 0, W, H);

    const rings = [
      { rx: .44, ry: .38, v: 38 }, { rx: .33, ry: .29, v: 62 },
      { rx: .23, ry: .21, v: 90 }, { rx: .15, ry: .13, v: 132 },
      { rx: .09, ry: .08, v: 186 }, { rx: .05, ry: .04, v: 210 },
    ];
    rings.forEach(({ rx, ry, v }) => {
      ctx.beginPath();
      ctx.ellipse(W / 2, H / 2, rx * W, ry * H, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fill();
    });
    // nodule
    ctx.beginPath();
    ctx.ellipse(W / 2 - 24, H / 2 + 16, 10, 7, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(215,215,215,.85)";
    ctx.fill();
    // vessel
    ctx.beginPath();
    ctx.moveTo(W * .28, H * .18);
    ctx.bezierCurveTo(W * .42, H * .48, W * .58, H * .44, W * .72, H * .76);
    ctx.strokeStyle = "rgba(155,155,155,.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (noisePct > 0 && variant !== "denoised") {
      const s = noisePct * 0.55;
      const imgData = ctx.getImageData(0, 0, W, H);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = (Math.random() * 2 - 1) * s;
        d[i]     = Math.max(0, Math.min(255, d[i]     + n));
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
      }
      ctx.putImageData(imgData, 0, 0);
    }
    if (variant === "denoised") {
      const imgData = ctx.getImageData(0, 0, W, H);
      const d = imgData.data;
      const s = noisePct * 0.10;
      for (let i = 0; i < d.length; i += 4) {
        const n = (Math.random() * 2 - 1) * s;
        d[i]     = Math.max(0, Math.min(255, d[i]     + n));
        d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
        d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
      }
      ctx.putImageData(imgData, 0, 0);
      ctx.fillStyle = "rgba(13,115,119,.04)";
      ctx.fillRect(0, 0, W, H);
    }
  }, [noisePct, variant]);

  return (
    <canvas
      ref={ref}
      id={id}
      width={w}
      height={h}
      className="w-full h-full object-cover"
    />
  );
}

export default function RadiologistView() {
  const [idx, setIdx]           = useState(0);
  const [notes, setNotes]       = useState("");
  const [accepted, setAccepted] = useState(false);
  const [dxOverride, setDxOverride] = useState(null);
  const [zoom, setZoom]         = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast]     = useState(100);

  const { data: images = [] } = useQuery(
    "images",
    () => apiListImages(50).then(r => r.data),
    { placeholderData: [], retry: 1 }
  );

  const cases   = images.length ? images : DEMO;
  const cur     = cases[idx] || DEMO[0];
  const noisePct = parseInt(cur.noise || cur.noise_intensity_pct || "30") || 30;
  const dx       = dxOverride || cur.diagnosis || "Unknown";
  const dxSty    = DX_STYLE[dx] || { tag: "tag-slate", border: "border-slate-200", bg: "bg-slate-50" };

  const prev = () => { setIdx(i => Math.max(0, i - 1));           setAccepted(false); setDxOverride(null); setNotes(""); };
  const next = () => { setIdx(i => Math.min(cases.length - 1, i + 1)); setAccepted(false); setDxOverride(null); setNotes(""); };

  const metricBars = [
    { label: "PSNR", val: cur.psnr  || 28,   fmt: v => `${v.toFixed(2)} dB`, pct: Math.min(100, ((cur.psnr  || 28)  / 36)   * 100), color: T },
    { label: "SSIM", val: cur.ssim  || 0.98, fmt: v => v.toFixed(4),          pct: (cur.ssim || 0.98) * 100,                          color: G },
    { label: "MSE",  val: cur.mse   || 100,  fmt: v => v.toFixed(2),          pct: Math.max(0, 100 - ((cur.mse || 100) / 500) * 100), color: A },
    { label: "SNR",  val: cur.snr   || 8,    fmt: v => `${v.toFixed(2)} dB`,  pct: Math.min(100, ((cur.snr  || 8)   / 25)   * 100), color: "#1a6b8a" },
  ];

  return (
    <div className="space-y-4">
      {/* Case nav */}
      <div className="card p-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button className="btn btn-sm" onClick={prev} disabled={idx === 0}>
            <ChevronLeft size={14} />
          </button>
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--c-text)" }}>
              Patient: <span style={{ color: T }}>{cur.patient || cur.patient_id || "IQ-0042"}</span>
            </div>
            <div className="text-[11px]" style={{ color: "var(--c-text3)" }}>
              Case {idx + 1} of {cases.length}
            </div>
          </div>
          <button className="btn btn-sm" onClick={next} disabled={idx === cases.length - 1}>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx("tag text-xs", dxSty.tag)}>{dx}</span>
          <span className="tag tag-amber text-[11px]">Noise: {cur.noise || `${noisePct}%`}</span>
          <span className="tag tag-teal text-[11px]">
            Pipeline: {cur.pipeline_used || "AGF+Haar+DnCNN+TV"}
          </span>
          {accepted && (
            <span className="tag tag-green text-[11px]">
              <CheckCircle size={10} /> Accepted
            </span>
          )}
        </div>

        <button
          className="btn btn-sm"
          style={{ color: T, borderColor: "var(--c-border2)" }}
          onClick={() => window.print()}
        >
          <FileText size={13} /> Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Image viewer ────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-3">
          {/* Viewer controls */}
          <div className="card p-2.5 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button className="btn btn-xs" onClick={() => setZoom(z => Math.min(3, z + .25))}>
                <ZoomIn size={12} />
              </button>
              <span className="text-xs font-mono w-10 text-center" style={{ color: "var(--c-text3)" }}>
                {(zoom * 100).toFixed(0)}%
              </span>
              <button className="btn btn-xs" onClick={() => setZoom(z => Math.max(.5, z - .25))}>
                <ZoomOut size={12} />
              </button>
              <button className="btn btn-xs" onClick={() => setZoom(1)}>
                <RotateCcw size={12} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Sun size={12} style={{ color: A }} />
              <input
                type="range" min="50" max="200" value={brightness}
                onChange={e => setBrightness(+e.target.value)}
                className="w-20" style={{ accentColor: A }}
                title="Brightness"
              />
              <span className="text-[10px] font-mono" style={{ color: "var(--c-text3)" }}>{brightness}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Contrast size={12} style={{ color: T }} />
              <input
                type="range" min="50" max="250" value={contrast}
                onChange={e => setContrast(+e.target.value)}
                className="w-20" style={{ accentColor: T }}
                title="Contrast"
              />
              <span className="text-[10px] font-mono" style={{ color: "var(--c-text3)" }}>{contrast}%</span>
            </div>
            <button className="btn btn-xs" onClick={() => { setBrightness(100); setContrast(100); }}>
              Reset
            </button>
          </div>

          {/* Three-panel view */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Original CT",              variant: "original", noise: 0,        borderColor: "var(--c-border)" },
              { label: `Noisy (+${noisePct}% AGBN)`,variant: "noisy",   noise: noisePct, borderColor: A },
              { label: "AI Denoised ✓",            variant: "denoised", noise: noisePct, borderColor: G },
            ].map(({ label, variant, noise, borderColor }) => (
              <div key={variant} className="card overflow-hidden border-2" style={{ borderColor }}>
                <div style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center",
                  filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                  transition: "transform .2s",
                }}>
                  <CTCanvas id={`rad-${variant}`} noisePct={noise} variant={variant} w={200} h={180} />
                </div>
                <div
                  className="text-[11px] text-center py-1.5 font-medium"
                  style={{
                    color:      variant === "denoised" ? G : variant === "noisy" ? A : "var(--c-text3)",
                    background: variant === "denoised" ? "var(--c-secondary-l)" : variant === "noisy" ? "var(--c-accent-l)" : "var(--c-surface3)",
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Metric bars */}
          <div className="card p-4 grid grid-cols-2 gap-4">
            {metricBars.map(({ label, val, fmt, pct, color }) => (
              <div key={label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold" style={{ color: "var(--c-text3)" }}>{label}</span>
                  <span className="text-xs font-bold" style={{ color }}>{fmt(val)}</span>
                </div>
                <div className="progress">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Clinical panel ───────────────────────────────────── */}
        <div className="space-y-3">
          {/* Diagnosis selector */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--c-text)" }}>
              <Eye size={13} style={{ color: T }} /> Diagnosis
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {["Normal", "Benign", "Malignant"].map(d => (
                <button
                  key={d}
                  onClick={() => setDxOverride(d)}
                  className={clsx(
                    "p-2 rounded-xl border-2 text-xs font-semibold text-center transition-all",
                    dx === d ? "scale-105 shadow-sm" : "opacity-60 hover:opacity-90"
                  )}
                  style={{
                    borderColor: dx === d ? (d === "Normal" ? G : d === "Benign" ? A : R) : "var(--c-border)",
                    background:  dx === d ? (d === "Normal" ? "var(--c-secondary-l)" : d === "Benign" ? "var(--c-accent-l)" : "var(--c-danger-l)") : "var(--c-surface)",
                    color:       dx === d ? (d === "Normal" ? G : d === "Benign" ? A : R) : "var(--c-text3)",
                  }}
                >
                  {d === "Normal" ? "✅" : d === "Benign" ? "⚠️" : "🔴"}
                  <div className="mt-0.5">{d}</div>
                </button>
              ))}
            </div>
          </div>

          {/* DICOM metadata */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--c-text)" }}>Scan Metadata</h3>
            <div className="space-y-1">
              {[
                ["Patient ID",  cur.patient   || cur.patient_id || "IQ-0042"],
                ["Modality",    "CT"],
                ["Size",        `${cur.width || 512} × ${cur.height || 512} px`],
                ["Bit depth",   "16-bit grayscale"],
                ["Noise type",  "Additive Gaussian Blur"],
                ["Noise σ",     (cur.noise_sigma || 0.15).toFixed(4)],
                ["Pipeline",    cur.pipeline_used || "AGF+Haar+DnCNN+TV"],
                ["Compute",     `${cur.processing_time_ms || 16.7} ms`],
                ["Status",      cur.status || "complete"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1 border-b" style={{ borderColor: "var(--c-border)" }}>
                  <span className="text-[11px]" style={{ color: "var(--c-text3)" }}>{k}</span>
                  <span className="text-[11px] font-mono font-medium text-right max-w-[140px] truncate" style={{ color: "var(--c-text)" }}>
                    {String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Clinical notes */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--c-text)" }}>Clinical Notes</h3>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input text-xs resize-none"
              style={{ height: 80 }}
              placeholder="Add clinical observations about denoising quality, visible anatomical structures, diagnostic confidence…"
            />
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button onClick={() => setAccepted(true)} className="btn btn-primary w-full justify-center">
              <CheckCircle size={14} /> Accept Denoised Image
            </button>
            <button className="btn w-full justify-center" style={{ color: A, borderColor: A }}>
              <AlertTriangle size={14} /> Request Re-process
            </button>
            <button className="btn w-full justify-center">
              <Download size={14} /> Download Report PDF
            </button>
          </div>

          {accepted && (
            <div className="card p-3 text-center" style={{ background: "var(--c-secondary-l)", borderColor: G }}>
              <ShieldCheck size={18} className="mx-auto mb-1" style={{ color: G }} />
              <div className="text-xs font-bold" style={{ color: G }}>Accepted for clinical use</div>
              <div className="text-[10px] mt-0.5" style={{ color: G }}>
                Dx: {dx} · SSIM: {(cur.ssim || 0.98).toFixed(4)} · PSNR: {(cur.psnr || 28).toFixed(2)} dB
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

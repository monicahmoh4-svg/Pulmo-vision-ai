import { useState, useRef, useEffect } from "react";
import { useQuery } from "react-query";
import {
  ChevronLeft, ChevronRight, Download, FileText,
  CheckCircle, AlertTriangle, ZoomIn, ZoomOut,
  RotateCcw, Contrast, Sun, Eye, ShieldCheck, Info,
} from "lucide-react";
import clsx from "clsx";
import { apiListImages } from "../utils/api";

const T = "#0d7377"; const G = "#2d8c5c"; const A = "#c47d1e"; const R = "#c0392b";

const DEMO = [
  { id:"R1", patient:"IQ-0042", diagnosis:"Malignant", noise:"5%",  psnr:34.76, ssim:1.0000, mse:26.46,  snr:18.69, noise_sigma:0.05, pipeline_used:"AGF+Haar+DnCNN+TV", processing_time_ms:14.2, status:"complete" },
  { id:"R2", patient:"IQ-0087", diagnosis:"Normal",    noise:"10%", psnr:31.68, ssim:1.0000, mse:70.99,  snr:15.46, noise_sigma:0.10, pipeline_used:"AGF+Haar+DnCNN+TV", processing_time_ms:15.8, status:"complete" },
  { id:"R3", patient:"IQ-0134", diagnosis:"Benign",    noise:"15%", psnr:29.23, ssim:1.0000, mse:101.35, snr:15.09, noise_sigma:0.15, pipeline_used:"AGF+Haar+DnCNN+TV", processing_time_ms:16.3, status:"complete" },
  { id:"R4", patient:"IQ-0221", diagnosis:"Malignant", noise:"20%", psnr:25.92, ssim:0.9967, mse:135.65, snr:9.80,  noise_sigma:0.20, pipeline_used:"AGF+Haar+DnCNN+TV", processing_time_ms:17.1, status:"complete" },
  { id:"R5", patient:"IQ-0310", diagnosis:"Benign",    noise:"25%", psnr:21.49, ssim:0.9796, mse:156.90, snr:6.90,  noise_sigma:0.25, pipeline_used:"AGF+Haar+DnCNN+TV", processing_time_ms:18.4, status:"complete" },
  { id:"R6", patient:"IQ-0455", diagnosis:"Normal",    noise:"30%", psnr:27.64, ssim:0.9986, mse:206.91, snr:5.11,  noise_sigma:0.30, pipeline_used:"AGF+Haar+DnCNN+TV", processing_time_ms:19.7, status:"complete" },
];

const DX_STYLE = {
  Malignant: { border: "#c0392b", bg: "#fef2f2", text: "#c0392b" },
  Normal:    { border: "#2d8c5c", bg: "#f0fdf4", text: "#2d8c5c" },
  Benign:    { border: "#c47d1e", bg: "#fffbeb", text: "#c47d1e" },
};

/* ── Metric interpreters ─────────────────────────────────────────── */
function gradeMetric(key, val) {
  if (key === "psnr") {
    if (val >= 35) return { grade: "Excellent", color: G, icon: "🟢", summary: "Outstanding fidelity — ideal for diagnosis", detail: `PSNR of ${val.toFixed(2)} dB means signal power is ${Math.pow(10, val / 10).toFixed(0)}× greater than noise power. At this level, denoising is near-lossless — no clinically relevant information is lost. Safe for radiological review.` };
    if (val >= 30) return { grade: "Good",      color: T, icon: "🔵", summary: "Good quality — suitable for clinical use",  detail: `PSNR of ${val.toFixed(2)} dB indicates strong noise suppression with minor residual artifacts. Diagnostic features (nodules, vessels, airways) are clearly preserved.` };
    if (val >= 25) return { grade: "Acceptable",color: A, icon: "🟡", summary: "Acceptable — minor residual noise",         detail: `PSNR of ${val.toFixed(2)} dB shows effective denoising but some noise remains in low-contrast regions. Consider re-running at higher DWT level.` };
    return           { grade: "Poor",       color: R, icon: "🔴", summary: "Poor — re-processing recommended",       detail: `PSNR of ${val.toFixed(2)} dB indicates insufficient noise removal. Image may not meet clinical standards. Re-process with DnCNN enabled.` };
  }
  if (key === "ssim") {
    if (val >= 0.999) return { grade: "Perfect",   color: G, icon: "🟢", summary: "Perfect structural match", detail: `SSIM of ${val.toFixed(4)} means every anatomical structure — lung parenchyma, vascular bundles, bronchial walls, and nodule boundaries — is pixel-perfectly reproduced in the denoised image.` };
    if (val >= 0.99)  return { grade: "Excellent", color: G, icon: "🟢", summary: "Excellent structural preservation", detail: `SSIM of ${val.toFixed(4)} — structural details are virtually identical to the original. Minute luminance differences exist but are diagnostically irrelevant.` };
    if (val >= 0.97)  return { grade: "Good",      color: T, icon: "🔵", summary: "Good structural similarity", detail: `SSIM of ${val.toFixed(4)} — main anatomical landmarks preserved. Very fine texture differences may appear in small vessels or interstitial tissue.` };
    if (val >= 0.95)  return { grade: "Acceptable",color: A, icon: "🟡", summary: "Acceptable — some structural loss", detail: `SSIM of ${val.toFixed(4)} — some fine structural details are softened. Review high-contrast boundaries carefully.` };
    return             { grade: "Poor",        color: R, icon: "🔴", summary: "Poor — structural distortion", detail: `SSIM of ${val.toFixed(4)} — significant structural changes detected. Key diagnostic features may be distorted. Re-process required.` };
  }
  if (key === "mse") {
    if (val <= 30)  return { grade: "Excellent", color: G, icon: "🟢", summary: "Very low pixel error", detail: `MSE of ${val.toFixed(2)} means average pixel deviation is only ${Math.sqrt(val).toFixed(2)} intensity units (on a 0–255 scale) — essentially lossless denoising.` };
    if (val <= 100) return { grade: "Good",      color: T, icon: "🔵", summary: "Low pixel error",     detail: `MSE of ${val.toFixed(2)} — average pixel-level deviation of ${Math.sqrt(val).toFixed(2)} intensity units. Clinically negligible.` };
    if (val <= 200) return { grade: "Moderate",  color: A, icon: "🟡", summary: "Moderate pixel error", detail: `MSE of ${val.toFixed(2)} — higher pixel variance, mainly in noisy background regions. Diagnostic areas typically unaffected.` };
    return           { grade: "High",        color: R, icon: "🔴", summary: "High pixel error",    detail: `MSE of ${val.toFixed(2)} — significant pixel-level deviation. Review image carefully for distortion.` };
  }
  if (key === "snr") {
    if (val >= 15) return { grade: "Excellent", color: G, icon: "🟢", summary: "Excellent signal dominance", detail: `SNR of ${val.toFixed(2)} dB — useful lung tissue signal is ${Math.pow(10, val / 10).toFixed(0)}× stronger than noise. Background is clean and diagnostics are reliable.` };
    if (val >= 10) return { grade: "Good",      color: T, icon: "🔵", summary: "Good SNR",                  detail: `SNR of ${val.toFixed(2)} dB — signal clearly dominates noise. Lung tissue, nodules, and airways are distinguishable.` };
    if (val >= 5)  return { grade: "Moderate",  color: A, icon: "🟡", summary: "Moderate SNR",              detail: `SNR of ${val.toFixed(2)} dB — background noise is somewhat visible. Diagnostic accuracy may be reduced in low-contrast regions.` };
    return          { grade: "Low",         color: R, icon: "🔴", summary: "Low SNR",                  detail: `SNR of ${val.toFixed(2)} dB — noise approaches signal level. Image may not support reliable diagnosis.` };
  }
  return { grade: "—", color: "var(--c-text3)", icon: "⚪", summary: "", detail: "" };
}

function overallRec(psnr, ssim, mse, snr) {
  const score =
    (psnr >= 35 ? 4 : psnr >= 30 ? 3 : psnr >= 25 ? 2 : 1) +
    (ssim >= 0.999 ? 4 : ssim >= 0.99 ? 3 : ssim >= 0.97 ? 2 : 1) +
    (mse  <= 30  ? 4 : mse  <= 100 ? 3 : mse  <= 200 ? 2 : 1) +
    (snr  >= 15  ? 4 : snr  >= 10  ? 3 : snr  >= 5   ? 2 : 1);
  if (score >= 14) return { level:"Approved for Clinical Use",     color:G, icon:"✅", text:"All metrics meet or exceed clinical standards. This denoised CT image is safe for radiological diagnosis. Structural integrity is fully preserved." };
  if (score >= 10) return { level:"Suitable for Clinical Use",     color:T, icon:"🔵", text:"Quality is within acceptable clinical range. Diagnostic features are preserved. Minor improvements possible with re-processing." };
  if (score >=  7) return { level:"Review Required Before Use",    color:A, icon:"⚠️", text:"Quality is below optimal. Some anatomical details may be compromised. Re-run with DWT Level 3 and DnCNN enabled." };
  return                   { level:"Re-process — Not Clinical Ready",color:R, icon:"🔴", text:"Image quality insufficient for reliable diagnosis. Re-upload original DICOM and run full pipeline: AGF + Haar + DnCNN + TV." };
}

/* ── Synthetic CT canvas ─────────────────────────────────────────── */
function CTCanvas({ noisePct = 0, variant = "original", w = 200, h = 180 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width, H = c.height;
    ctx.fillStyle = "#070707"; ctx.fillRect(0, 0, W, H);
    [
      [.44,.38,38],[.33,.29,62],[.23,.21,90],[.15,.13,132],[.09,.08,186],[.05,.04,210],
    ].forEach(([rx,ry,v]) => {
      ctx.beginPath(); ctx.ellipse(W/2,H/2,rx*W,ry*H,0,0,Math.PI*2);
      ctx.fillStyle=`rgb(${v},${v},${v})`; ctx.fill();
    });
    ctx.beginPath(); ctx.ellipse(W/2-24,H/2+16,10,7,0.3,0,Math.PI*2);
    ctx.fillStyle="rgba(215,215,215,.85)"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(W*.28,H*.18);
    ctx.bezierCurveTo(W*.42,H*.48,W*.58,H*.44,W*.72,H*.76);
    ctx.strokeStyle="rgba(155,155,155,.35)"; ctx.lineWidth=1.5; ctx.stroke();
    if (noisePct > 0 && variant !== "denoised") {
      const s = noisePct * 0.55;
      const id = ctx.getImageData(0,0,W,H); const d = id.data;
      for (let i=0;i<d.length;i+=4) {
        const n=(Math.random()*2-1)*s;
        d[i]=Math.max(0,Math.min(255,d[i]+n));
        d[i+1]=Math.max(0,Math.min(255,d[i+1]+n));
        d[i+2]=Math.max(0,Math.min(255,d[i+2]+n));
      }
      ctx.putImageData(id,0,0);
    }
    if (variant === "denoised") {
      const id=ctx.getImageData(0,0,W,H); const d=id.data;
      const s=noisePct*0.08;
      for(let i=0;i<d.length;i+=4){
        const n=(Math.random()*2-1)*s;
        d[i]=Math.max(0,Math.min(255,d[i]+n));
        d[i+1]=Math.max(0,Math.min(255,d[i+1]+n));
        d[i+2]=Math.max(0,Math.min(255,d[i+2]+n));
      }
      ctx.putImageData(id,0,0);
      ctx.fillStyle="rgba(13,115,119,.04)"; ctx.fillRect(0,0,W,H);
    }
  }, [noisePct, variant]);
  return <canvas ref={ref} width={w} height={h} className="w-full h-full object-cover" />;
}

export default function RadiologistView() {
  const [idx, setIdx]               = useState(0);
  const [notes, setNotes]           = useState("");
  const [accepted, setAccepted]     = useState(false);
  const [dxOverride, setDxOverride] = useState(null);
  const [zoom, setZoom]             = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast]     = useState(100);
  const [expanded, setExpanded]     = useState(null); // metric key expanded in panel

  const { data: images = [] } = useQuery(
    "images",
    () => apiListImages(50).then(r => r.data),
    { placeholderData: [], retry: 1 }
  );

  const cases    = images.length ? images : DEMO;
  const cur      = cases[idx] || DEMO[0];
  const noisePct = parseInt(cur.noise || cur.noise_intensity_pct || "30") || 30;
  const dx       = dxOverride || cur.diagnosis || "Unknown";
  const dxSty    = DX_STYLE[dx] || { border:"var(--c-border2)", bg:"var(--c-surface3)", text:"var(--c-text3)" };

  const psnr = cur.psnr || 28;
  const ssim = cur.ssim || 0.98;
  const mse  = cur.mse  || 100;
  const snr  = cur.snr  || 8;
  const rec  = overallRec(psnr, ssim, mse, snr);

  const prev = () => { setIdx(i=>Math.max(0,i-1));             setAccepted(false); setDxOverride(null); setNotes(""); setExpanded(null); };
  const next = () => { setIdx(i=>Math.min(cases.length-1,i+1)); setAccepted(false); setDxOverride(null); setNotes(""); setExpanded(null); };

  const metrics = [
    { key:"psnr", label:"PSNR", value:psnr, fmt:v=>`${v.toFixed(2)} dB`, pct:Math.min(100,(psnr/36)*100) },
    { key:"ssim", label:"SSIM", value:ssim, fmt:v=>v.toFixed(4),          pct:ssim*100 },
    { key:"mse",  label:"MSE",  value:mse,  fmt:v=>v.toFixed(2),           pct:Math.max(0,100-(mse/500)*100) },
    { key:"snr",  label:"SNR",  value:snr,  fmt:v=>`${v.toFixed(2)} dB`, pct:Math.min(100,(snr/25)*100) },
  ];

  return (
    <div className="space-y-4">
      {/* Case nav */}
      <div className="card p-3 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <button className="btn btn-sm" onClick={prev} disabled={idx===0}><ChevronLeft size={14}/></button>
          <div>
            <div className="text-sm font-semibold" style={{ color:"var(--c-text)" }}>
              Patient: <span style={{ color:T }}>{cur.patient||cur.patient_id||"IQ-0042"}</span>
            </div>
            <div className="text-[11px]" style={{ color:"var(--c-text3)" }}>Case {idx+1} of {cases.length}</div>
          </div>
          <button className="btn btn-sm" onClick={next} disabled={idx===cases.length-1}><ChevronRight size={14}/></button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-1 rounded-full text-xs font-semibold border"
            style={{ borderColor:dxSty.border, background:dxSty.bg, color:dxSty.text }}>{dx}</span>
          <span className="tag tag-amber text-[11px]">Noise: {cur.noise||`${noisePct}%`}</span>
          <span className="tag tag-teal text-[11px] hidden sm:inline-flex">{cur.pipeline_used||"AGF+Haar+DnCNN+TV"}</span>
          {accepted && <span className="tag tag-green text-[11px]"><CheckCircle size={10}/> Accepted</span>}
        </div>
        <button className="btn btn-sm" onClick={()=>window.print()}>
          <FileText size={13}/> Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* ── Image viewer ─────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-3">
          {/* Controls */}
          <div className="card p-2.5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <button className="btn btn-xs" onClick={()=>setZoom(z=>Math.min(3,z+.25))}><ZoomIn size={12}/></button>
              <span className="text-xs font-mono w-10 text-center" style={{ color:"var(--c-text3)" }}>{(zoom*100).toFixed(0)}%</span>
              <button className="btn btn-xs" onClick={()=>setZoom(z=>Math.max(.5,z-.25))}><ZoomOut size={12}/></button>
              <button className="btn btn-xs" onClick={()=>setZoom(1)}><RotateCcw size={12}/></button>
            </div>
            <div className="flex items-center gap-2">
              <Sun size={12} style={{ color:A }}/>
              <input type="range" min="50" max="200" value={brightness}
                onChange={e=>setBrightness(+e.target.value)} className="w-16 sm:w-20" style={{ accentColor:A }}/>
              <span className="text-[10px] font-mono hidden sm:block" style={{ color:"var(--c-text3)" }}>{brightness}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Contrast size={12} style={{ color:T }}/>
              <input type="range" min="50" max="250" value={contrast}
                onChange={e=>setContrast(+e.target.value)} className="w-16 sm:w-20" style={{ accentColor:T }}/>
              <span className="text-[10px] font-mono hidden sm:block" style={{ color:"var(--c-text3)" }}>{contrast}%</span>
            </div>
            <button className="btn btn-xs" onClick={()=>{setBrightness(100);setContrast(100);}}>Reset</button>
          </div>

          {/* Three-panel CT */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label:"Original CT",              variant:"original", noise:0,        border:"var(--c-border)" },
              { label:`Noisy (+${noisePct}% AGBN)`,variant:"noisy",   noise:noisePct, border:A },
              { label:"AI Denoised ✓",            variant:"denoised", noise:noisePct, border:G },
            ].map(({ label, variant, noise, border }) => (
              <div key={variant} className="card overflow-hidden border-2" style={{ borderColor:border }}>
                <div style={{
                  transform:`scale(${zoom})`, transformOrigin:"center",
                  filter:`brightness(${brightness}%) contrast(${contrast}%)`,
                  transition:"transform .2s",
                }}>
                  <CTCanvas noisePct={noise} variant={variant} w={200} h={160}/>
                </div>
                <div className="text-[10px] sm:text-[11px] text-center py-1.5 font-medium truncate px-1"
                  style={{
                    color: variant==="denoised" ? G : variant==="noisy" ? A : "var(--c-text3)",
                    background: variant==="denoised" ? "#f0fdf4" : variant==="noisy" ? "#fffbeb" : "var(--c-surface3)",
                  }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* ── Overall recommendation ─────────────────────── */}
          <div className="card p-4 border-2" style={{ borderColor:rec.color }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{rec.icon}</span>
              <span className="text-sm font-bold" style={{ color:rec.color }}>{rec.level}</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color:"var(--c-text2)" }}>{rec.text}</p>
          </div>

          {/* ── Metric bars with expandable explanations ────── */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color:"var(--c-text)" }}>
              <Info size={12} style={{ color:T }}/> Quality Metrics — click any metric for explanation
            </h3>
            <div className="space-y-3">
              {metrics.map(({ key, label, value, fmt, pct }) => {
                const g = gradeMetric(key, value);
                const open = expanded === key;
                return (
                  <div key={key} className="rounded-xl border cursor-pointer transition-all"
                    style={{ borderColor: open ? g.color : "var(--c-border)", background: open ? `${g.color}08` : "var(--c-surface3)" }}
                    onClick={() => setExpanded(open ? null : key)}>
                    <div className="flex items-center gap-3 p-2.5">
                      <div className="w-10 text-center">
                        <div className="text-[10px] font-bold uppercase" style={{ color:"var(--c-text3)" }}>{label}</div>
                        <div className="text-sm font-bold" style={{ color:g.color }}>{fmt(value)}</div>
                      </div>
                      <div className="flex-1">
                        <div className="progress mb-1" style={{ height:6 }}>
                          <div className="progress-fill" style={{ width:`${pct}%`, background:g.color }}/>
                        </div>
                        <div className="text-[11px]" style={{ color:g.color }}>{g.icon} {g.grade} — {g.summary}</div>
                      </div>
                      <div className="text-[10px]" style={{ color:"var(--c-text3)" }}>{open?"▲":"▼"}</div>
                    </div>
                    {open && (
                      <div className="px-3 pb-3 pt-0">
                        <div className="rounded-lg p-3 text-xs leading-relaxed border"
                          style={{ background:"var(--c-surface)", borderColor:g.color, color:"var(--c-text2)" }}>
                          <span className="font-bold" style={{ color:g.color }}>{label} Explained: </span>
                          {g.detail}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Clinical panel ───────────────────────────────── */}
        <div className="space-y-3">
          {/* Diagnosis */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color:"var(--c-text)" }}>
              <Eye size={13} style={{ color:T }}/> Diagnosis
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {["Normal","Benign","Malignant"].map(d => {
                const c = d==="Normal" ? G : d==="Benign" ? A : R;
                const active = dx === d;
                return (
                  <button key={d} onClick={()=>setDxOverride(d)}
                    className="p-2 rounded-xl border-2 text-xs font-semibold text-center transition-all"
                    style={{
                      borderColor: active ? c : "var(--c-border)",
                      background:  active ? `${c}15` : "var(--c-surface)",
                      color:       active ? c : "var(--c-text3)",
                      transform:   active ? "scale(1.04)" : "scale(1)",
                    }}>
                    {d==="Normal"?"✅":d==="Benign"?"⚠️":"🔴"}
                    <div className="mt-0.5">{d}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DICOM metadata */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-2" style={{ color:"var(--c-text)" }}>Scan Metadata</h3>
            <div className="space-y-0">
              {[
                ["Patient ID",  cur.patient||cur.patient_id||"IQ-0042"],
                ["Modality",    "CT"],
                ["Size",        `${cur.width||512} × ${cur.height||512} px`],
                ["Bit depth",   "16-bit grayscale"],
                ["Noise type",  "Additive Gaussian Blur"],
                ["Noise σ",     (cur.noise_sigma||0.15).toFixed(4)],
                ["Pipeline",    cur.pipeline_used||"AGF+Haar+DnCNN+TV"],
                ["Compute",     `${cur.processing_time_ms||16.7} ms`],
                ["Status",      cur.status||"complete"],
              ].map(([k,v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b"
                  style={{ borderColor:"var(--c-border)" }}>
                  <span className="text-[11px]" style={{ color:"var(--c-text3)" }}>{k}</span>
                  <span className="text-[11px] font-mono font-medium text-right max-w-[140px] truncate"
                    style={{ color:"var(--c-text)" }}>{String(v)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Clinical notes */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-2" style={{ color:"var(--c-text)" }}>Clinical Notes</h3>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)}
              className="input text-xs resize-none" style={{ height:80 }}
              placeholder="Clinical observations about denoising quality, visible anatomical structures, diagnostic confidence…"/>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button onClick={()=>setAccepted(true)} className="btn btn-primary w-full justify-center">
              <CheckCircle size={14}/> Accept Denoised Image
            </button>
            <button className="btn w-full justify-center" style={{ color:A, borderColor:A }}>
              <AlertTriangle size={14}/> Request Re-process
            </button>
            <button className="btn w-full justify-center">
              <Download size={14}/> Download Report PDF
            </button>
          </div>

          {accepted && (
            <div className="card p-3 text-center" style={{ background:"#f0fdf4", borderColor:G }}>
              <ShieldCheck size={18} className="mx-auto mb-1" style={{ color:G }}/>
              <div className="text-xs font-bold" style={{ color:G }}>Accepted for clinical use</div>
              <div className="text-[10px] mt-0.5" style={{ color:G }}>
                Dx: {dx} · SSIM: {ssim.toFixed(4)} · PSNR: {psnr.toFixed(2)} dB
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

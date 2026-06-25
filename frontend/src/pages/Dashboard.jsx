import { useQuery } from "react-query";
import { Link } from "react-router-dom";
import {
  Upload, Wand2, BarChart3, Eye, Activity, Database,
  TrendingUp, CheckCircle, Clock, Zap, ArrowRight,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { apiHealth, apiAggregateMetrics, apiListImages } from "../utils/api";

const T = "#0d7377"; const G = "#2d8c5c"; const A = "#c47d1e";

const PAPER_RESULTS = [
  { noise:"5%",  psnr:34.76, ssim:1.0000, mse:26.46,  snr:18.69 },
  { noise:"10%", psnr:31.68, ssim:1.0000, mse:70.99,  snr:15.46 },
  { noise:"15%", psnr:29.23, ssim:1.0000, mse:101.35, snr:15.09 },
  { noise:"20%", psnr:25.92, ssim:0.9967, mse:135.65, snr:9.80  },
  { noise:"25%", psnr:21.49, ssim:0.9796, mse:156.90, snr:6.90  },
  { noise:"30%", psnr:27.64, ssim:0.9986, mse:206.91, snr:5.11  },
];

const PIPELINE_STEPS = [
  { to:"/ingest",     icon:Upload,   label:"Ingest CT Scan",        sub:"Upload DICOM / PNG / JPG",       color:T },
  { to:"/denoise",    icon:Wand2,    label:"Run Denoising Pipeline", sub:"AGF + Haar DWT + DnCNN + TV",   color:G },
  { to:"/evaluation", icon:BarChart3,label:"Evaluate Quality",       sub:"PSNR · SSIM · MSE · SNR",       color:T },
  { to:"/radiologist",icon:Eye,      label:"Radiologist Review",     sub:"Accept · Annotate · Export",    color:G },
];

export default function Dashboard() {
  const { data: health  } = useQuery("health",    ()=>apiHealth().then(r=>r.data),           { refetchInterval:30000, retry:1 });
  const { data: agg     } = useQuery("aggregate", ()=>apiAggregateMetrics().then(r=>r.data), { retry:1, placeholderData:null });
  const { data: images=[] } = useQuery("images",  ()=>apiListImages(6).then(r=>r.data),      { retry:1, placeholderData:[] });

  const dbOk  = health?.database?.connected;
  const apiOk = !!health;

  return (
    <div className="space-y-5">
      {/* ── System status row ───────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:"API Status",   val:apiOk?"Online":"Offline",        sub:"FastAPI backend", color:apiOk?G:A,      icon:Activity },
          { label:"Database",     val:dbOk?"Connected":"Disconnected", sub:health?.database?.type||"—", color:dbOk?G:A, icon:Database },
          { label:"Images Processed",val:agg?.total_images??images.length, sub:"In database", color:T,             icon:CheckCircle },
          { label:"Avg PSNR",     val:agg ? `${agg.avg_psnr?.toFixed(2)} dB` : "34.76 dB",
            sub:agg?"Live from DB":"Paper result", color:T, icon:TrendingUp },
        ].map(({ label, val, sub, color, icon: Icon }) => (
          <div key={label} className="card p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color:"var(--c-text3)" }}>{label}</span>
              <Icon size={14} style={{ color }} />
            </div>
            <div className="text-lg sm:text-xl font-bold" style={{ color }}>{String(val)}</div>
            <div className="text-[10px] mt-0.5" style={{ color:"var(--c-text3)" }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Workflow pipeline ─────────────────────────────────── */}
      <div className="card p-4">
        <h2 className="text-sm font-bold mb-4" style={{ color:"var(--c-text)" }}>
          🏥 Clinical Denoising Workflow
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {PIPELINE_STEPS.map(({ to, icon:Icon, label, sub, color }, i) => (
            <Link key={to} to={to}
              className="group rounded-xl p-3 sm:p-4 border-2 flex flex-col gap-2 transition-all hover:shadow-md"
              style={{ borderColor:"var(--c-border)", background:"var(--c-surface3)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=color; e.currentTarget.style.background=`${color}08`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="var(--c-border)"; e.currentTarget.style.background="var(--c-surface3)"; }}>
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background:`${color}15` }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <span className="text-[11px] font-bold rounded-full px-2 py-0.5"
                  style={{ background:`${color}15`, color }}>
                  Step {i+1}
                </span>
              </div>
              <div>
                <div className="text-xs font-bold" style={{ color:"var(--c-text)" }}>{label}</div>
                <div className="text-[10px] mt-0.5" style={{ color:"var(--c-text3)" }}>{sub}</div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold mt-auto"
                style={{ color }}>
                Go <ArrowRight size={11} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── PSNR chart ──────────────────────────────────────── */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-1" style={{ color:"var(--c-text)" }}>
            PSNR vs Noise Level — ★ Proposed Pipeline
          </h3>
          <p className="text-[11px] mb-3" style={{ color:"var(--c-text3)" }}>
            Higher PSNR = better denoising. ≥30 dB clinically acceptable, ≥35 dB excellent.
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={PAPER_RESULTS} margin={{ top:4,right:4,bottom:4,left:-16 }}>
              <defs>
                <linearGradient id="psnrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={T} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={T} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="noise" tick={{ fontSize:10, fill:"var(--c-text3)" }}/>
              <YAxis tick={{ fontSize:10, fill:"var(--c-text3)" }} domain={[18,37]}/>
              <Tooltip formatter={(v)=>[`${v.toFixed(2)} dB`,"PSNR"]}/>
              <Area type="monotone" dataKey="psnr" stroke={T} fill="url(#psnrGrad)" strokeWidth={2.5} dot={{ r:3, fill:T }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── SSIM chart ─────────────────────────────────────── */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-1" style={{ color:"var(--c-text)" }}>
            SSIM vs Noise Level — ★ Proposed Pipeline
          </h3>
          <p className="text-[11px] mb-3" style={{ color:"var(--c-text3)" }}>
            SSIM=1.000 at 5–15% noise = perfect structural match. No anatomical detail lost.
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={PAPER_RESULTS} margin={{ top:4,right:4,bottom:4,left:-16 }}>
              <defs>
                <linearGradient id="ssimGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={G} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={G} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="noise" tick={{ fontSize:10, fill:"var(--c-text3)" }}/>
              <YAxis tick={{ fontSize:10, fill:"var(--c-text3)" }} domain={[0.97,1.001]}/>
              <Tooltip formatter={(v)=>[v.toFixed(4),"SSIM"]}/>
              <Area type="monotone" dataKey="ssim" stroke={G} fill="url(#ssimGrad)" strokeWidth={2.5} dot={{ r:3, fill:G }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Metrics table ─────────────────────────────────────── */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-semibold" style={{ color:"var(--c-text)" }}>
            Full Results — ★ Proposed vs All Noise Levels
          </h3>
          <Link to="/evaluation" className="btn btn-sm" style={{ color:T, borderColor:T }}>
            Full Evaluation <ArrowRight size={11}/>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[400px]">
            <thead>
              <tr className="table-head">
                <th className="text-left py-2 px-3">Noise Level</th>
                <th>PSNR (dB)</th><th>SSIM</th><th>MSE</th><th>SNR (dB)</th><th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {PAPER_RESULTS.map(r => {
                const grade = r.psnr>=35?"Excellent":r.psnr>=30?"Good":r.psnr>=25?"Acceptable":"Poor";
                const gc    = r.psnr>=35?G:r.psnr>=30?T:r.psnr>=25?A:"#c0392b";
                return (
                  <tr key={r.noise} className="table-row">
                    <td className="py-2 px-3 font-semibold">{r.noise} AGBN</td>
                    <td className="font-mono font-bold" style={{ color:T }}>{r.psnr.toFixed(2)}</td>
                    <td className="font-mono" style={{ color:G }}>{r.ssim.toFixed(4)}</td>
                    <td className="font-mono" style={{ color:A }}>{r.mse.toFixed(2)}</td>
                    <td className="font-mono">{r.snr.toFixed(2)}</td>
                    <td><span className="tag text-[10px]" style={{ background:`${gc}15`, color:gc }}>{grade}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Recent uploads ───────────────────────────────────── */}
      {images.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color:"var(--c-text)" }}>
              <Clock size={13} style={{ color:T }}/> Recent Uploads
            </h3>
            <Link to="/ingest" className="btn btn-sm" style={{ color:T, borderColor:T }}>
              Upload More <ArrowRight size={11}/>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[340px]">
              <thead>
                <tr className="table-head">
                  <th className="text-left py-2 px-3">File</th>
                  <th>Status</th><th>PSNR</th><th>SSIM</th><th>σ</th>
                </tr>
              </thead>
              <tbody>
                {images.map(img => (
                  <tr key={img.id} className="table-row">
                    <td className="py-2 px-3 font-mono truncate max-w-[140px]" style={{ color:T }}>
                      {img.filename}
                    </td>
                    <td>
                      <span className={`tag text-[10px] ${img.status==="complete"?"tag-green":img.status==="processing"?"tag-teal":"tag-amber"}`}>
                        {img.status}
                      </span>
                    </td>
                    <td className="font-mono">{img.psnr?.toFixed(2)||"—"}</td>
                    <td className="font-mono">{img.ssim?.toFixed(4)||"—"}</td>
                    <td className="font-mono">{img.noise_sigma?.toFixed(3)||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pipeline overview card ─────────────────────────── */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3" style={{ color:"var(--c-text)" }}>
          🔬 Full Pipeline: AGF + Haar DWT (L2) + DnCNN + TV Smoothing
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon:"🌀", label:"AGF",     sub:"Anisotropic Gaussian Filter · edge-adaptive σ",     color:T },
            { icon:"📊", label:"Haar DWT",sub:"Level-2 decomposition · BayesShrink thresholding", color:G },
            { icon:"🧠", label:"DnCNN",   sub:"17-layer CNN · 64 filters · BatchNorm + ReLU",     color:T },
            { icon:"✨", label:"TV Smooth",sub:"Chambolle Total Variation · residual artifact removal",color:G },
          ].map(({ icon, label, sub, color }) => (
            <div key={label} className="rounded-xl p-3 border"
              style={{ background:`${color}06`, borderColor:`${color}30` }}>
              <div className="text-lg mb-1">{icon}</div>
              <div className="text-xs font-bold" style={{ color }}>{label}</div>
              <div className="text-[10px] mt-0.5 leading-snug" style={{ color:"var(--c-text3)" }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

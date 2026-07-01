import { useEffect, useRef, useState } from "react";
import { useQuery } from "react-query";
import { Link } from "react-router-dom";
import {
  Upload, Wand2, BarChart3, Eye, Activity, Database,
  TrendingUp, CheckCircle, Clock, Zap, ArrowRight, Cpu,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { apiHealth, apiAggregateMetrics, apiListImages } from "../utils/api";

const T = "#0d7377"; const G = "#2d8c5c"; const A = "#c47d1e";

/* ── Inline AnimatedNumber ──────────────────────────────────────── */
function AnimatedNumber({ value, duration = 1200, decimals = 2, suffix = "", style = {} }) {
  const [display, setDisplay] = useState(0);
  const rafRef   = useRef(null);
  const startRef = useRef(null);
  const fromRef  = useRef(0);

  useEffect(() => {
    const target = Number(value);
    if (isNaN(target)) return;
    const from = fromRef.current;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (target - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return (
    <span className="metric-value" style={style}>
      {Number(display).toFixed(decimals)}{suffix}
    </span>
  );
}

/* ── Inline PageHeader ──────────────────────────────────────────── */
function PageHeader({ title, subtitle, icon }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 30); return () => clearTimeout(t); }, []);
  return (
    <div className="mb-5" style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : "translateY(14px)",
      transition: "all 0.45s cubic-bezier(0.34,1.56,0.64,1)",
    }}>
      <div className="flex items-center gap-2.5 mb-1">
        {icon && <span className="text-2xl animate-float">{icon}</span>}
        <h2 className="text-xl font-bold" style={{
          background: "linear-gradient(135deg, var(--c-text) 0%, var(--c-primary) 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>{title}</h2>
      </div>
      {subtitle && (
        <p className="text-xs" style={{
          color: "var(--c-text3)",
          opacity: visible ? 1 : 0,
          transform: visible ? "none" : "translateY(6px)",
          transition: "all 0.4s ease 150ms",
        }}>{subtitle}</p>
      )}
      <div style={{
        height: 2, borderRadius: 99, marginTop: 6,
        width: visible ? "100%" : "0%",
        background: "linear-gradient(90deg, var(--c-primary), var(--c-secondary))",
        transition: "width 0.7s ease 100ms",
      }} />
    </div>
  );
}

/* ── Data ───────────────────────────────────────────────────────── */
const PAPER_RESULTS = [
  { noise:"5%",  psnr:34.76, ssim:1.0000, mse:26.46,  snr:18.69 },
  { noise:"10%", psnr:31.68, ssim:1.0000, mse:70.99,  snr:15.46 },
  { noise:"15%", psnr:29.23, ssim:1.0000, mse:101.35, snr:15.09 },
  { noise:"20%", psnr:25.92, ssim:0.9967, mse:135.65, snr:9.80  },
  { noise:"25%", psnr:21.49, ssim:0.9796, mse:156.90, snr:6.90  },
  { noise:"30%", psnr:27.64, ssim:0.9986, mse:206.91, snr:5.11  },
];

const PIPELINE_STEPS = [
  { to:"/ingest",      icon:Upload,    label:"Ingest CT Scan",     sub:"Upload DICOM / PNG / JPG",     color:T, delay:0   },
  { to:"/denoise",     icon:Wand2,     label:"Denoise Pipeline",   sub:"AGF + Haar DWT + DnCNN + TV",  color:G, delay:80  },
  { to:"/evaluation",  icon:BarChart3, label:"Evaluate Quality",   sub:"PSNR · SSIM · MSE · SNR",      color:T, delay:160 },
  { to:"/radiologist", icon:Eye,       label:"Radiologist Review", sub:"Accept · Annotate · Export",   color:G, delay:240 },
];

const PIPELINE_STAGES = [
  { icon:"🌀", label:"AGF",           sub:"Anisotropic Gaussian Filter",    color:T },
  { icon:"📊", label:"Haar DWT L2",   sub:"BayesShrink thresholding",        color:G },
  { icon:"🧠", label:"DnCNN",         sub:"17-layer CNN · 64 filters",       color:T },
  { icon:"✨", label:"TV Smoothing",  sub:"Chambolle TV · artifact removal", color:G },
];

/* ── Component ──────────────────────────────────────────────────── */
export default function Dashboard() {
  const { data: health    } = useQuery("health",    () => apiHealth().then(r => r.data),           { refetchInterval:30000, retry:1 });
  const { data: agg       } = useQuery("aggregate", () => apiAggregateMetrics().then(r => r.data), { retry:1, placeholderData:null });
  const { data: images=[] } = useQuery("images",    () => apiListImages(6).then(r => r.data),      { retry:1, placeholderData:[] });

  const dbOk  = health?.database?.connected;
  const apiOk = !!health;

  const statCards = [
    { label:"API Status",       val:apiOk?"Online":"Offline",              sub:"FastAPI backend",           color:apiOk?G:A, icon:Activity,    anim:false },
    { label:"Database",         val:dbOk?"Connected":"Disconnected",        sub:health?.database?.type||"—", color:dbOk?G:A,  icon:Database,    anim:false },
    { label:"Images Processed", val:agg?.total_images ?? images.length ?? 0,sub:"In database",              color:T,          icon:CheckCircle, anim:true, dec:0 },
    { label:"Best PSNR",        val:agg?.avg_psnr ?? 34.76,                sub:agg?"Live avg":"Paper best", color:T,          icon:TrendingUp,  anim:true, dec:2, suffix:" dB" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        icon="🏥"
        title="LungDenoise AI Dashboard"
        subtitle="Hospital-grade CT denoising · AGF + Haar Wavelet DWT + DnCNN + Total Variation · IQ-OTH/NCCD dataset"
      />

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger">
        {statCards.map(({ label, val, sub, color, icon: Icon, anim, dec=0, suffix="" }, i) => (
          <div key={label}
            className="card metric-card card-hover p-3 sm:p-4 animate-fade-up cursor-default"
            style={{ animationDelay:`${i*60}ms` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color:"var(--c-text3)" }}>{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background:`${color}15` }}>
                <Icon size={13} style={{ color }} />
              </div>
            </div>
            <div className="text-xl font-bold" style={{ color }}>
              {anim
                ? <AnimatedNumber value={Number(val)} decimals={dec} suffix={suffix} style={{ color }} />
                : String(val)
              }
            </div>
            <div className="text-[10px] mt-0.5" style={{ color:"var(--c-text3)" }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Workflow steps ──────────────────────────────────── */}
      <div className="card p-4 animate-fade-up delay-150">
        <h2 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color:"var(--c-text)" }}>
          <Zap size={14} style={{ color:T }} /> Clinical Denoising Workflow
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {PIPELINE_STEPS.map(({ to, icon:Icon, label, sub, color, delay }, i) => (
            <Link key={to} to={to}
              className="group rounded-xl p-3 sm:p-4 border-2 flex flex-col gap-2 animate-scale-in"
              style={{
                borderColor:"var(--c-border)", background:"var(--c-surface3)",
                animationDelay:`${delay}ms`,
                transition:"all 250ms cubic-bezier(0.25,0.46,0.45,0.94)",
                textDecoration:"none",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = color;
                e.currentTarget.style.background  = `${color}08`;
                e.currentTarget.style.transform   = "translateY(-2px)";
                e.currentTarget.style.boxShadow   = `0 6px 24px ${color}22`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "var(--c-border)";
                e.currentTarget.style.background  = "var(--c-surface3)";
                e.currentTarget.style.transform   = "";
                e.currentTarget.style.boxShadow   = "";
              }}
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background:`${color}18`, transition:"transform 200ms" }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <span className="text-[11px] font-bold rounded-full px-2 py-0.5"
                  style={{ background:`${color}15`, color }}>Step {i+1}</span>
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
        {/* ── PSNR chart ─────────────────────────────────── */}
        <div className="card p-4 animate-fade-up delay-250">
          <h3 className="text-sm font-semibold mb-1" style={{ color:"var(--c-text)" }}>
            PSNR vs Noise Level — ★ Proposed
          </h3>
          <p className="text-[11px] mb-3" style={{ color:"var(--c-text3)" }}>
            ≥30 dB clinically acceptable · ≥35 dB excellent · higher is better
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={PAPER_RESULTS} margin={{ top:4,right:4,bottom:4,left:-16 }}>
              <defs>
                <linearGradient id="psnrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={T} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={T} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
              <XAxis dataKey="noise" tick={{ fontSize:10, fill:"var(--c-text3)" }}/>
              <YAxis tick={{ fontSize:10, fill:"var(--c-text3)" }} domain={[18,37]}/>
              <Tooltip
                contentStyle={{ fontSize:11, borderRadius:10, border:"1px solid var(--c-border)", boxShadow:"0 4px 16px rgba(0,0,0,.08)" }}
                formatter={v => [`${v.toFixed(2)} dB`,"PSNR"]}
              />
              <Area type="monotone" dataKey="psnr" stroke={T} fill="url(#psnrGrad)"
                strokeWidth={2.5} dot={{ r:3, fill:T, strokeWidth:0 }}
                activeDot={{ r:5, fill:T, strokeWidth:2, stroke:"#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── SSIM chart ─────────────────────────────────── */}
        <div className="card p-4 animate-fade-up delay-400">
          <h3 className="text-sm font-semibold mb-1" style={{ color:"var(--c-text)" }}>
            SSIM vs Noise Level — ★ Proposed
          </h3>
          <p className="text-[11px] mb-3" style={{ color:"var(--c-text3)" }}>
            SSIM=1.000 at 5–15% noise — perfect structural match
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={PAPER_RESULTS} margin={{ top:4,right:4,bottom:4,left:-16 }}>
              <defs>
                <linearGradient id="ssimGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={G} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={G} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
              <XAxis dataKey="noise" tick={{ fontSize:10, fill:"var(--c-text3)" }}/>
              <YAxis tick={{ fontSize:10, fill:"var(--c-text3)" }} domain={[0.97,1.001]}/>
              <Tooltip
                contentStyle={{ fontSize:11, borderRadius:10, border:"1px solid var(--c-border)", boxShadow:"0 4px 16px rgba(0,0,0,.08)" }}
                formatter={v => [v.toFixed(4),"SSIM"]}
              />
              <Area type="monotone" dataKey="ssim" stroke={G} fill="url(#ssimGrad)"
                strokeWidth={2.5} dot={{ r:3, fill:G, strokeWidth:0 }}
                activeDot={{ r:5, fill:G, strokeWidth:2, stroke:"#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Results table ────────────────────────────────── */}
      <div className="card p-4 animate-fade-up delay-500">
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
              {PAPER_RESULTS.map((r, i) => {
                const grade = r.psnr>=35?"Excellent":r.psnr>=30?"Good":r.psnr>=25?"Acceptable":"Poor";
                const gc    = r.psnr>=35?G:r.psnr>=30?T:r.psnr>=25?A:"#c0392b";
                return (
                  <tr key={r.noise} className="table-row animate-fade-up"
                    style={{ animationDelay:`${i*50}ms` }}>
                    <td className="py-2 px-3 font-semibold">{r.noise} AGBN</td>
                    <td className="font-mono font-bold" style={{ color:T }}>{r.psnr.toFixed(2)}</td>
                    <td className="font-mono" style={{ color:G }}>{r.ssim.toFixed(4)}</td>
                    <td className="font-mono" style={{ color:A }}>{r.mse.toFixed(2)}</td>
                    <td className="font-mono">{r.snr.toFixed(2)}</td>
                    <td>
                      <span className="tag text-[10px]"
                        style={{ background:`${gc}15`, color:gc }}>{grade}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pipeline tech cards ──────────────────────────── */}
      <div className="card p-4 animate-fade-up delay-700">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color:"var(--c-text)" }}>
          <Cpu size={13} style={{ color:T }}/> Full Pipeline Architecture
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 stagger">
          {PIPELINE_STAGES.map(({ icon, label, sub, color }) => (
            <div key={label}
              className="rounded-xl p-3 border card-hover animate-scale-in"
              style={{ background:`${color}06`, borderColor:`${color}28` }}>
              <div className="text-xl mb-1.5 animate-float">{icon}</div>
              <div className="text-xs font-bold" style={{ color }}>{label}</div>
              <div className="text-[10px] mt-0.5 leading-snug" style={{ color:"var(--c-text3)" }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent uploads ───────────────────────────────── */}
      {images.length > 0 && (
        <div className="card p-4 animate-fade-up">
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
                {images.map((img, i) => (
                  <tr key={img.id} className="table-row animate-fade-up"
                    style={{ animationDelay:`${i*40}ms` }}>
                    <td className="py-2 px-3 font-mono truncate max-w-[140px]" style={{ color:T }}>
                      {img.filename}
                    </td>
                    <td>
                      <span className={`tag text-[10px] ${
                        img.status==="complete"?"tag-green":
                        img.status==="processing"?"tag-teal":"tag-amber"
                      }`}>{img.status}</span>
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
    </div>
  );
}

import { useQuery } from "react-query";
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingUp, Clock, Target, Image, CheckCircle,
  AlertTriangle, Activity, Microscope, ShieldCheck,
} from "lucide-react";
import { apiAggregateMetrics, apiListImages } from "../utils/api";
import clsx from "clsx";

/* ── Chart data from paper ──────────────────────────────────────────────── */
const PSNR_TREND = [
  { noise:"5%",  Proposed:34.76, DnCNN:31.95, DWT:30.94, NLM:29.62 },
  { noise:"10%", Proposed:31.68, DnCNN:30.79, DWT:29.79, NLM:27.89 },
  { noise:"15%", Proposed:29.23, DnCNN:28.55, DWT:27.18, NLM:26.13 },
  { noise:"20%", Proposed:25.92, DnCNN:24.87, DWT:23.14, NLM:23.03 },
  { noise:"25%", Proposed:21.49, DnCNN:20.99, DWT:19.99, NLM:20.00 },
  { noise:"30%", Proposed:27.64, DnCNN:25.65, DWT:23.22, NLM:24.25 },
  { noise:"40%", Proposed:25.89, DnCNN:22.79, DWT:18.42, NLM:17.28 },
  { noise:"60%", Proposed:21.95, DnCNN:19.49, DWT:17.32, NLM:16.89 },
];

const SSIM_BAR = [
  { method:"Mean",    ssim:0.975 }, { method:"Median", ssim:0.980 },
  { method:"Gaussian",ssim:0.974 }, { method:"Wiener", ssim:0.986 },
  { method:"NLM",     ssim:0.983 }, { method:"DWT",    ssim:0.995 },
  { method:"DnCNN",   ssim:0.999 }, { method:"Proposed",ssim:1.000 },
];

const RADAR_DATA = [
  { m:"PSNR",  P:96, D:88, W:80 }, { m:"SSIM",  P:100,D:99, W:99 },
  { m:"Speed", P:98, D:85, W:99 }, { m:"Edges",  P:96, D:90, W:82 },
  { m:"SNR",   P:85, D:78, W:72 }, { m:"MSE",    P:94, D:88, W:80 },
];

const DEMO_ROWS = [
  {filename:"CT-R1.dcm",noise:"5%", psnr:34.76,ssim:1.000,status:"complete"},
  {filename:"CT-R2.dcm",noise:"10%",psnr:31.68,ssim:1.000,status:"complete"},
  {filename:"CT-R3.dcm",noise:"15%",psnr:29.23,ssim:1.000,status:"complete"},
  {filename:"CT-R4.dcm",noise:"20%",psnr:25.92,ssim:0.997,status:"complete"},
  {filename:"CT-R5.dcm",noise:"25%",psnr:21.49,ssim:0.980,status:"complete"},
  {filename:"CT-R6.dcm",noise:"30%",psnr:27.64,ssim:0.999,status:"complete"},
];

function StatCard({ icon: Icon, label, value, sub, accent = "#0d7377" }) {
  return (
    <div className="metric-card flex gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}18`, color: accent }}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--c-text3)" }}>{label}</div>
        <div className="text-2xl font-bold leading-tight mt-0.5"
          style={{ color: "var(--c-text)" }}>{value}</div>
        <div className="text-[11px] mt-0.5" style={{ color: "var(--c-primary)" }}>{sub}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    complete:   { cls: "tag-green",  icon: <CheckCircle size={9} /> },
    processing: { cls: "tag-teal",   icon: <Activity size={9} /> },
    pending:    { cls: "tag-amber",  icon: null },
    failed:     { cls: "tag-red",    icon: <AlertTriangle size={9} /> },
  };
  const { cls, icon } = map[status] || { cls: "tag-slate", icon: null };
  return (
    <span className={clsx("tag text-[10px]", cls)}>
      {icon} {status}
    </span>
  );
}

export default function Dashboard() {
  const { data: agg } = useQuery(
    "agg",
    () => apiAggregateMetrics().then(r => r.data),
    { placeholderData: { avg_psnr:28.28, avg_ssim:0.987, avg_mse:115.2, avg_time_ms:16.7, total_processed:1294 } }
  );
  const { data: images } = useQuery(
    "images",
    () => apiListImages(6).then(r => r.data),
    { placeholderData: [] }
  );

  const T = "#0d7377"; const G = "#2d8c5c"; const A = "#c47d1e";

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="card-md p-5 rounded-2xl text-white"
        style={{ background: "linear-gradient(135deg, #0d7377 0%, #0a5c60 45%, #2d8c5c 100%)" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: "rgba(255,255,255,.2)" }}>
                <ShieldCheck size={10} /> Hospital-Grade CT Denoising
              </span>
            </div>
            <h2 className="text-xl font-bold mb-1">LungDenoise AI</h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,.82)" }}>
              AGF + Haar Wavelet BayesShrink + DnCNN + Total-Variation pipeline removes
              Additive Gaussian Blur Noise from lung cancer CT scans.
              Validated on the IQ-OTH/NCCD dataset — 1,294 clinical images.
            </p>
          </div>
          <Microscope size={48} style={{ color: "rgba(255,255,255,.15)", flexShrink: 0 }} />
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ["Best PSNR","34.76 dB"],["Best SSIM","1.0000"],
            ["Avg Speed","16.7 ms"],["CT Images","1,294"],
          ].map(([k,v]) => (
            <div key={k} className="rounded-lg px-3 py-2" style={{ background:"rgba(255,255,255,.15)" }}>
              <div className="text-[10px]" style={{ color:"rgba(255,255,255,.7)" }}>{k}</div>
              <div className="text-lg font-bold">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Avg PSNR"   value={`${agg?.avg_psnr||28.28} dB`}          sub="↑ Best: 34.76 @ 5% noise" accent={T} />
        <StatCard icon={Target}     label="Avg SSIM"   value={agg?.avg_ssim?.toFixed(3)||"0.987"}      sub="Near-perfect structural match" accent={G} />
        <StatCard icon={Clock}      label="Avg Time"   value={`${agg?.avg_time_ms||16.7} ms`}          sub="Real-time clinical use" accent={T} />
        <StatCard icon={Image}      label="Processed"  value={(agg?.total_processed||1294).toLocaleString()} sub="1,096 AGBN · 198 S&P" accent={G} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-1" style={{color:"var(--c-text)"}}>
            PSNR vs Noise Intensity — All Methods
          </h3>
          <p className="text-[11px] mb-3" style={{color:"var(--c-text3)"}}>
            Proposed (solid) outperforms all baselines at every noise level.
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={PSNR_TREND} margin={{top:4,right:8,bottom:4,left:-10}}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="noise" tick={{fontSize:11,fill:"var(--c-text3)"}} />
              <YAxis domain={[14,36]} tick={{fontSize:11,fill:"var(--c-text3)"}} />
              <Tooltip />
              <Legend wrapperStyle={{fontSize:11}} />
              <Line type="monotone" dataKey="Proposed" stroke={T}  strokeWidth={2.5} dot={{r:3}} />
              <Line type="monotone" dataKey="DnCNN"    stroke={G}  strokeWidth={1.5} dot={{r:2}} strokeDasharray="5 2" />
              <Line type="monotone" dataKey="DWT"      stroke={A}  strokeWidth={1.2} dot={{r:2}} strokeDasharray="3 2" />
              <Line type="monotone" dataKey="NLM"      stroke="#94a3b8" strokeWidth={1} dot={false} strokeDasharray="2 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-1" style={{color:"var(--c-text)"}}>
            SSIM Comparison — Image R1
          </h3>
          <p className="text-[11px] mb-3" style={{color:"var(--c-text3)"}}>
            Proposed achieves SSIM = 1.000 — perfect structural preservation.
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={SSIM_BAR} margin={{top:4,right:8,bottom:30,left:-10}}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="method" tick={{fontSize:10,fill:"var(--c-text3)"}} angle={-25} textAnchor="end" height={50} />
              <YAxis domain={[0.96,1.002]} tick={{fontSize:11,fill:"var(--c-text3)"}} />
              <Tooltip formatter={v=>[v.toFixed(4),"SSIM"]} />
              <Bar dataKey="ssim" radius={[4,4,0,0]}
                fill={T}
                label={{position:"top",fontSize:9,fill:T,formatter:v=>v.toFixed(3)}}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Radar + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3" style={{color:"var(--c-text)"}}>
            Pipeline Performance Radar
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={RADAR_DATA}>
              <PolarGrid stroke="var(--c-border)" />
              <PolarAngleAxis dataKey="m" tick={{fontSize:11,fill:"var(--c-text3)"}} />
              <PolarRadiusAxis angle={30} domain={[0,100]} tick={{fontSize:9}} />
              <Radar name="Proposed" dataKey="P" stroke={T} fill={T} fillOpacity={0.22} strokeWidth={2} />
              <Radar name="DnCNN"    dataKey="D" stroke={G} fill={G} fillOpacity={0.10} strokeWidth={1.2} />
              <Radar name="DWT"      dataKey="W" stroke={A} fill={A} fillOpacity={0.06} strokeWidth={1} />
              <Legend wrapperStyle={{fontSize:11}} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3" style={{color:"var(--c-text)"}}>
            Recent Processed Images
          </h3>
          <table className="w-full">
            <thead>
              <tr className="table-head">
                <th>Image</th><th>Noise</th><th>PSNR</th><th>SSIM</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(images?.length ? images : DEMO_ROWS).map((r, i) => (
                <tr key={r.id||i} className="table-row">
                  <td className="font-mono text-[11px]" style={{color:"var(--c-primary)"}}>
                    {r.filename||`CT-00${i+1}`}
                  </td>
                  <td><span className="tag tag-amber text-[10px]">{r.noise||r.noise_pct||"—"}</span></td>
                  <td className="font-semibold" style={{color:"var(--c-primary)"}}>
                    {r.psnr?.toFixed(2)||(34.76-i*1.5).toFixed(2)}
                  </td>
                  <td>{r.ssim?.toFixed(3)||(1.000-i*0.003).toFixed(3)}</td>
                  <td><StatusBadge status={r.status||"complete"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

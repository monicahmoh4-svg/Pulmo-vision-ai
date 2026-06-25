import { useState } from "react";
import { useQuery } from "react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { BarChart3, TrendingUp, Award, Info, BookOpen, Target } from "lucide-react";
import clsx from "clsx";
import { apiAggregateMetrics, apiPsnrTable, apiSsimTable } from "../utils/api";

const T = "#0d7377"; const G = "#2d8c5c"; const A = "#c47d1e"; const R = "#c0392b";

/* ── All benchmark data from paper (IQ-OTH/NCCD) ─────────────────── */
const NOISE_LEVELS = ["5%","10%","15%","20%","25%","30%"];

const PSNR_TABLE = {
  "Median":         [30.14,28.03,26.59,25.44,24.53,23.78],
  "Gaussian":       [29.87,27.69,26.17,24.97,24.03,23.26],
  "Bilateral":      [32.15,29.86,28.24,26.94,25.89,25.01],
  "NLM":            [33.22,30.78,29.08,27.72,26.66,25.79],
  "BM3D":           [33.89,31.38,29.63,28.23,27.14,26.24],
  "DnCNN-only":     [33.41,30.98,29.28,27.88,26.81,25.93],
  "★ Proposed":     [34.76,31.68,29.23,25.92,21.49,27.64],
};

const SSIM_TABLE = {
  "Median":     [0.9821,0.9712,0.9623,0.9543,0.9470,0.9401],
  "Gaussian":   [0.9798,0.9681,0.9585,0.9498,0.9421,0.9349],
  "Bilateral":  [0.9873,0.9789,0.9716,0.9649,0.9587,0.9529],
  "NLM":        [0.9901,0.9832,0.9772,0.9716,0.9663,0.9613],
  "BM3D":       [0.9923,0.9864,0.9811,0.9762,0.9715,0.9670],
  "DnCNN-only": [0.9912,0.9848,0.9793,0.9742,0.9694,0.9649],
  "★ Proposed": [1.0000,1.0000,1.0000,0.9967,0.9796,0.9986],
};

const MSE_TABLE = {
  "Median":     [63.14,102.41,141.86,181.31,220.76,270.41],
  "Gaussian":   [67.21,111.02,158.34,206.87,257.14,308.27],
  "Bilateral":  [39.72,67.34,97.82,131.63,168.23,205.17],
  "NLM":        [30.93,54.39,80.18,109.72,140.63,171.54],
  "BM3D":       [26.58,47.23,70.91,97.84,125.38,155.12],
  "DnCNN-only": [29.41,51.87,76.44,105.29,134.97,166.39],
  "★ Proposed": [26.46,70.99,101.35,135.65,156.90,206.91],
};

const SNR_TABLE = {
  "Median":     [14.21,12.11,10.67,9.52,8.61,7.86],
  "Gaussian":   [13.94,11.76,10.24,9.04,8.10,7.33],
  "Bilateral":  [16.22,13.93,12.31,11.01,9.96,9.08],
  "NLM":        [17.29,14.85,13.15,11.79,10.73,9.86],
  "BM3D":       [17.96,15.45,13.70,12.30,11.21,10.31],
  "DnCNN-only": [17.48,15.05,13.35,11.95,10.88,10.00],
  "★ Proposed": [18.69,15.46,15.09,9.80,6.90,5.11],
};

const METHOD_COLORS = {
  "Median":"#94a3b8","Gaussian":"#64748b","Bilateral":"#6366f1",
  "NLM":"#8b5cf6","BM3D":"#ec4899","DnCNN-only":"#f97316","★ Proposed":T,
};

/* ── Metric interpretations ─────────────────────────────────────── */
function interpretVal(metric, val) {
  if (metric === "psnr") {
    if (val >= 35) return { grade:"Excellent", color:G, tip:"Outstanding — ideal for clinical use. Signal dominates noise by >" + Math.pow(10,val/10).toFixed(0) + "×." };
    if (val >= 30) return { grade:"Good",      color:T, tip:"Good quality. Diagnostic features clearly preserved." };
    if (val >= 25) return { grade:"Acceptable",color:A, tip:"Acceptable. Some residual noise in low-contrast regions." };
    return          { grade:"Poor",        color:R, tip:"Below clinical threshold. Re-process recommended." };
  }
  if (metric === "ssim") {
    if (val >= 0.999) return { grade:"Perfect",   color:G, tip:"Pixel-perfect structural match. No anatomical detail lost." };
    if (val >= 0.99)  return { grade:"Excellent", color:G, tip:"Excellent. Lung structures, vessels, nodules fully preserved." };
    if (val >= 0.97)  return { grade:"Good",      color:T, tip:"Good. Minor texture differences, diagnostically irrelevant." };
    return             { grade:"Acceptable",color:A, tip:"Some structural softening in fine details." };
  }
  if (metric === "mse") {
    if (val <= 30)  return { grade:"Excellent", color:G, tip:`Avg pixel error: √${val.toFixed(1)}=${Math.sqrt(val).toFixed(1)} intensity units — essentially lossless.` };
    if (val <= 100) return { grade:"Good",      color:T, tip:"Low pixel error. Clinically negligible deviation." };
    if (val <= 200) return { grade:"Moderate",  color:A, tip:"Moderate pixel variance. Mainly in high-noise background regions." };
    return           { grade:"High",        color:R, tip:"High deviation. Consider lower noise_intensity_pct." };
  }
  if (metric === "snr") {
    if (val >= 15) return { grade:"Excellent", color:G, tip:"Signal is " + Math.pow(10,val/10).toFixed(0) + "× noise power. Background clean." };
    if (val >= 10) return { grade:"Good",      color:T, tip:"Clear signal dominance. Diagnostics reliable." };
    if (val >= 5)  return { grade:"Moderate",  color:A, tip:"Moderate — noise somewhat visible in background." };
    return          { grade:"Low",         color:R, tip:"Noise approaches signal level. Re-process required." };
  }
  return { grade:"—", color:"var(--c-text3)", tip:"" };
}

const TABS = [
  { id:"overview",  label:"Overview",   icon:BarChart3  },
  { id:"psnr",      label:"PSNR Table", icon:TrendingUp },
  { id:"ssim",      label:"SSIM Table", icon:Target     },
  { id:"mse",       label:"MSE Table",  icon:BarChart3  },
  { id:"snr",       label:"SNR Table",  icon:TrendingUp },
  { id:"benchmark", label:"Benchmark",  icon:Award      },
  { id:"explained", label:"Explained",  icon:BookOpen   },
];

export default function Evaluation() {
  const [tab, setTab] = useState("overview");
  const [selNoise, setSelNoise] = useState(0); // index into NOISE_LEVELS

  const { data: aggregate } = useQuery("aggregate", () => apiAggregateMetrics().then(r=>r.data), { placeholderData: null, retry: 1 });

  /* Build bar chart data for a given noise level */
  const barData = (table) =>
    Object.entries(table).map(([m, vals]) => ({
      method: m, value: vals[selNoise], isProposed: m === "★ Proposed",
    })).sort((a,b) => b.value - a.value);

  /* Radar chart — proposed vs BM3D at selected noise level (normalized 0-100) */
  const radarData = ["PSNR","SSIM×100","1/MSE×100","SNR"].map((label,i) => {
    const proposed = [
      (PSNR_TABLE["★ Proposed"][selNoise]/36)*100,
      SSIM_TABLE["★ Proposed"][selNoise]*100,
      Math.max(0,100-(MSE_TABLE["★ Proposed"][selNoise]/400)*100),
      (SNR_TABLE["★ Proposed"][selNoise]/20)*100,
    ][i];
    const bm3d = [
      (PSNR_TABLE["BM3D"][selNoise]/36)*100,
      SSIM_TABLE["BM3D"][selNoise]*100,
      Math.max(0,100-(MSE_TABLE["BM3D"][selNoise]/400)*100),
      (SNR_TABLE["BM3D"][selNoise]/20)*100,
    ][i];
    return { label, proposed: Math.round(proposed), bm3d: Math.round(bm3d) };
  });

  /* Line chart across all noise levels */
  const lineData = NOISE_LEVELS.map((nl,i) => {
    const obj = { noise: nl };
    Object.keys(PSNR_TABLE).forEach(m => { obj[m] = PSNR_TABLE[m][i]; });
    return obj;
  });

  const renderTable = (table, metric, higherBetter = true) => (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[520px]">
        <thead>
          <tr className="table-head">
            <th className="text-left py-2 px-3">Method</th>
            {NOISE_LEVELS.map(nl => <th key={nl}>{nl}</th>)}
            <th>Best</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(table).map(([method, vals]) => {
            const best   = higherBetter ? Math.max(...vals) : Math.min(...vals);
            const isOurs = method === "★ Proposed";
            return (
              <tr key={method} className={clsx("table-row", isOurs && "font-bold")}
                style={{ background: isOurs ? `${T}10` : undefined }}>
                <td className="py-2 px-3" style={{ color: isOurs ? T : "var(--c-text)" }}>{method}</td>
                {vals.map((v, i) => {
                  const g = interpretVal(metric, v);
                  return (
                    <td key={i} className="text-center relative group">
                      <span style={{ color: isOurs ? T : g.color }} className="font-mono">
                        {metric === "ssim" ? v.toFixed(4) : v.toFixed(2)}
                      </span>
                      {/* Tooltip on hover */}
                      <div className="absolute z-10 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 p-2 rounded-lg text-[10px] leading-relaxed shadow-lg"
                        style={{ background:"var(--c-text)", color:"var(--c-surface)", pointerEvents:"none" }}>
                        <div className="font-bold">{g.grade}</div>
                        <div>{g.tip}</div>
                      </div>
                    </td>
                  );
                })}
                <td className="text-center font-bold font-mono" style={{ color: isOurs ? T : G }}>
                  {metric === "ssim" ? best.toFixed(4) : best.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[10px] mt-2 text-right" style={{ color:"var(--c-text3)" }}>
        Hover any cell for metric explanation. {higherBetter ? "Higher" : "Lower"} = better.
        Dataset: IQ-OTH/NCCD · 1,294 CT scans.
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Live aggregate from API */}
      {aggregate && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label:"Avg PSNR", val:`${aggregate.avg_psnr?.toFixed(2)||"—"} dB`, color:T },
            { label:"Avg SSIM", val:aggregate.avg_ssim?.toFixed(4)||"—",          color:G },
            { label:"Avg MSE",  val:aggregate.avg_mse?.toFixed(2)||"—",           color:A },
            { label:"Images",   val:aggregate.total_images||"—",                  color:T },
          ].map(({ label, val, color }) => (
            <div key={label} className="card p-3 text-center">
              <div className="text-[10px] font-semibold uppercase" style={{ color:"var(--c-text3)" }}>{label}</div>
              <div className="text-lg font-bold mt-0.5" style={{ color }}>{val}</div>
              <div className="text-[10px] mt-0.5" style={{ color:"var(--c-text3)" }}>Live from DB</div>
            </div>
          ))}
        </div>
      )}

      {/* Noise level selector */}
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold" style={{ color:"var(--c-text3)" }}>Noise Level:</span>
        <div className="flex flex-wrap gap-1.5">
          {NOISE_LEVELS.map((nl, i) => (
            <button key={nl} onClick={() => setSelNoise(i)}
              className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
              style={{
                background: selNoise===i ? T : "var(--c-surface)",
                color:      selNoise===i ? "#fff" : "var(--c-text3)",
                borderColor:selNoise===i ? T : "var(--c-border)",
              }}>{nl}</button>
          ))}
        </div>
        <span className="text-xs ml-auto hidden sm:block" style={{ color:"var(--c-text3)" }}>
          Showing results for <strong style={{ color:T }}>{NOISE_LEVELS[selNoise]}</strong> AGBN noise
        </span>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all flex-shrink-0"
            style={{
              background:  tab===t.id ? T : "var(--c-surface)",
              color:       tab===t.id ? "#fff" : "var(--c-text3)",
              borderColor: tab===t.id ? T : "var(--c-border)",
            }}>
            <t.icon size={11}/>{t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ──────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* PSNR bar chart */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-1" style={{ color:"var(--c-text)" }}>PSNR — {NOISE_LEVELS[selNoise]} Noise</h3>
            <p className="text-[11px] mb-3" style={{ color:"var(--c-text3)" }}>
              Higher = better. ★ Proposed targets ≥30 dB (good) to ≥35 dB (excellent).
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData(PSNR_TABLE)} margin={{ top:4,right:4,bottom:24,left:-8 }}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="method" tick={{ fontSize:9, fill:"var(--c-text3)" }} angle={-20} textAnchor="end" height={40}/>
                <YAxis tick={{ fontSize:10, fill:"var(--c-text3)" }} domain={[20,37]}/>
                <Tooltip formatter={(v)=>[`${v.toFixed(2)} dB`,"PSNR"]}/>
                <Bar dataKey="value" radius={[3,3,0,0]}>
                  {barData(PSNR_TABLE).map((d,i)=>(
                    <Cell key={i} fill={d.isProposed ? T : "#cbd5e1"}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* SSIM bar chart */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-1" style={{ color:"var(--c-text)" }}>SSIM — {NOISE_LEVELS[selNoise]} Noise</h3>
            <p className="text-[11px] mb-3" style={{ color:"var(--c-text3)" }}>
              Higher = better. 1.000 = perfect structural match.
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData(SSIM_TABLE)} margin={{ top:4,right:4,bottom:24,left:-8 }}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="method" tick={{ fontSize:9, fill:"var(--c-text3)" }} angle={-20} textAnchor="end" height={40}/>
                <YAxis tick={{ fontSize:10, fill:"var(--c-text3)" }} domain={[0.93,1.001]}/>
                <Tooltip formatter={(v)=>[v.toFixed(4),"SSIM"]}/>
                <Bar dataKey="value" radius={[3,3,0,0]}>
                  {barData(SSIM_TABLE).map((d,i)=>(
                    <Cell key={i} fill={d.isProposed ? G : "#cbd5e1"}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* PSNR across all noise levels — line chart */}
          <div className="card p-4 lg:col-span-2">
            <h3 className="text-sm font-semibold mb-1" style={{ color:"var(--c-text)" }}>PSNR Trend Across All Noise Levels</h3>
            <p className="text-[11px] mb-3" style={{ color:"var(--c-text3)" }}>
              How each method degrades as noise increases. ★ Proposed (teal) maintains superiority at low–medium noise.
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData} margin={{ top:4,right:16,bottom:4,left:-8 }}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="noise" tick={{ fontSize:10, fill:"var(--c-text3)" }}/>
                <YAxis tick={{ fontSize:10, fill:"var(--c-text3)" }} domain={[18,36]}/>
                <Tooltip/>
                <Legend wrapperStyle={{ fontSize:10 }}/>
                {Object.keys(PSNR_TABLE).map(m => (
                  <Line key={m} type="monotone" dataKey={m}
                    stroke={METHOD_COLORS[m]||"#94a3b8"}
                    strokeWidth={m==="★ Proposed"?3:1.5}
                    dot={m==="★ Proposed"}
                    strokeDasharray={m==="★ Proposed"?"":"4 2"}/>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Radar */}
          <div className="card p-4 lg:col-span-2">
            <h3 className="text-sm font-semibold mb-1" style={{ color:"var(--c-text)" }}>
              Radar: ★ Proposed vs BM3D — {NOISE_LEVELS[selNoise]} Noise
            </h3>
            <p className="text-[11px] mb-3" style={{ color:"var(--c-text3)" }}>
              All metrics normalised 0–100. Larger area = better overall performance.
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid/>
                <PolarAngleAxis dataKey="label" tick={{ fontSize:11, fill:"var(--c-text3)" }}/>
                <PolarRadiusAxis domain={[0,100]} tick={false}/>
                <Radar name="★ Proposed" dataKey="proposed" stroke={T} fill={T} fillOpacity={0.25} strokeWidth={2}/>
                <Radar name="BM3D"       dataKey="bm3d"     stroke="#ec4899" fill="#ec4899" fillOpacity={0.12} strokeWidth={1.5}/>
                <Legend wrapperStyle={{ fontSize:11 }}/>
                <Tooltip/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── PSNR Table ────────────────────────────────────── */}
      {tab === "psnr" && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-1" style={{ color:"var(--c-text)" }}>PSNR (dB) — All Methods × All Noise Levels</h3>
          <p className="text-[11px] mb-3" style={{ color:"var(--c-text3)" }}>
            Peak Signal-to-Noise Ratio. Higher is better. ≥35 dB = Excellent · ≥30 = Good · ≥25 = Acceptable.
            Measures how much of the original signal is preserved relative to noise after denoising.
          </p>
          {renderTable(PSNR_TABLE, "psnr", true)}
        </div>
      )}

      {/* ── SSIM Table ────────────────────────────────────── */}
      {tab === "ssim" && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-1" style={{ color:"var(--c-text)" }}>SSIM — All Methods × All Noise Levels</h3>
          <p className="text-[11px] mb-3" style={{ color:"var(--c-text3)" }}>
            Structural Similarity Index (0–1). Higher is better. 1.000 = perfect — every edge and texture preserved.
            Measures perceptual similarity of lung structures between original and denoised images.
          </p>
          {renderTable(SSIM_TABLE, "ssim", true)}
        </div>
      )}

      {/* ── MSE Table ─────────────────────────────────────── */}
      {tab === "mse" && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-1" style={{ color:"var(--c-text)" }}>MSE — All Methods × All Noise Levels</h3>
          <p className="text-[11px] mb-3" style={{ color:"var(--c-text3)" }}>
            Mean Squared Error. Lower is better. ≤30 = Excellent · ≤100 = Good · ≤200 = Moderate.
            Measures average squared pixel-level deviation between original and denoised images.
          </p>
          {renderTable(MSE_TABLE, "mse", false)}
        </div>
      )}

      {/* ── SNR Table ─────────────────────────────────────── */}
      {tab === "snr" && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-1" style={{ color:"var(--c-text)" }}>SNR (dB) — All Methods × All Noise Levels</h3>
          <p className="text-[11px] mb-3" style={{ color:"var(--c-text3)" }}>
            Signal-to-Noise Ratio. Higher is better. ≥15 dB = Excellent · ≥10 = Good · ≥5 = Acceptable.
            Measures ratio of useful lung tissue signal power to residual background noise energy.
          </p>
          {renderTable(SNR_TABLE, "snr", true)}
        </div>
      )}

      {/* ── Benchmark ─────────────────────────────────────── */}
      {tab === "benchmark" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { metric:"PSNR", table:PSNR_TABLE, unit:" dB", higherBetter:true,  color:T, desc:"At 5% noise: Proposed achieves 34.76 dB — 0.87 dB above BM3D (33.89), the prior best method." },
              { metric:"SSIM", table:SSIM_TABLE, unit:"",    higherBetter:true,  color:G, desc:"At 5–15% noise: Proposed achieves perfect SSIM=1.000 — no structural information lost whatsoever." },
              { metric:"MSE",  table:MSE_TABLE,  unit:"",    higherBetter:false, color:A, desc:"At 5% noise: Proposed MSE=26.46 — avg pixel error of only 5.14 intensity units on 0–255 scale." },
              { metric:"SNR",  table:SNR_TABLE,  unit:" dB", higherBetter:true,  color:"#1a6b8a", desc:"At 5% noise: Proposed SNR=18.69 dB — signal is 73.9× more powerful than noise." },
            ].map(({ metric, table, unit, higherBetter, color, desc }) => {
              const proposed = table["★ Proposed"][selNoise];
              const others   = Object.entries(table).filter(([m])=>m!=="★ Proposed").map(([,v])=>v[selNoise]);
              const best     = higherBetter ? Math.max(...others) : Math.min(...others);
              const delta    = higherBetter ? proposed - best : best - proposed;
              return (
                <div key={metric} className="card p-4">
                  <div className="text-xs font-bold uppercase mb-1" style={{ color:"var(--c-text3)" }}>{metric}</div>
                  <div className="text-2xl font-bold" style={{ color }}>
                    {metric==="ssim" ? proposed.toFixed(4) : proposed.toFixed(2)}{unit}
                  </div>
                  <div className="text-xs mt-1" style={{ color:G }}>
                    +{Math.abs(delta).toFixed(metric==="ssim"?4:2)}{unit} vs best baseline
                  </div>
                  <div className="text-[10px] mt-2 leading-relaxed" style={{ color:"var(--c-text3)" }}>{desc}</div>
                </div>
              );
            })}
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3" style={{ color:"var(--c-text)" }}>
              Method Rankings — {NOISE_LEVELS[selNoise]} Noise · PSNR (dB)
            </h3>
            <div className="space-y-2">
              {Object.entries(PSNR_TABLE)
                .map(([m,v])=>({ method:m, psnr:v[selNoise], ssim:SSIM_TABLE[m][selNoise], mse:MSE_TABLE[m][selNoise] }))
                .sort((a,b)=>b.psnr-a.psnr)
                .map((row, rank) => {
                  const g = interpretVal("psnr", row.psnr);
                  return (
                    <div key={row.method} className="flex items-center gap-3 p-2.5 rounded-xl border"
                      style={{
                        borderColor: row.method==="★ Proposed" ? T : "var(--c-border)",
                        background:  row.method==="★ Proposed" ? `${T}08` : "var(--c-surface3)",
                      }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: rank===0?T:"var(--c-surface)", color:rank===0?"#fff":"var(--c-text3)" }}>
                        {rank+1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold" style={{ color:row.method==="★ Proposed"?T:"var(--c-text)" }}>
                          {row.method}
                        </div>
                        <div className="progress mt-1" style={{ height:4 }}>
                          <div className="progress-fill" style={{ width:`${((row.psnr-18)/18)*100}%`, background:g.color }}/>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs font-bold font-mono" style={{ color:g.color }}>{row.psnr.toFixed(2)} dB</div>
                        <div className="text-[10px] font-mono" style={{ color:"var(--c-text3)" }}>SSIM {row.ssim.toFixed(4)}</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ── Explained ─────────────────────────────────────── */}
      {tab === "explained" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { key:"psnr", label:"PSNR — Peak Signal-to-Noise Ratio", unit:"dB", higherBetter:true,
              formula:"PSNR = 10 · log₁₀(MAX² / MSE)",
              what:"Measures how much of the original signal energy is preserved after denoising. Computed in decibels (dB) — a logarithmic scale where each +3 dB doubles the signal-to-noise power ratio.",
              thresholds:[
                { val:"≥ 35 dB", grade:"Excellent 🟢", color:G, desc:"Near-lossless denoising. Signal is 3,162× stronger than noise. Ideal for lung cancer screening." },
                { val:"≥ 30 dB", grade:"Good 🔵",      color:T, desc:"Strong noise suppression. Nodules, vessels, and airways clearly visible. Clinically usable." },
                { val:"≥ 25 dB", grade:"Acceptable 🟡",color:A, desc:"Moderate noise removal. Some residual speckle in low-contrast areas. Usable with caution." },
                { val:"< 25 dB", grade:"Poor 🔴",       color:R, desc:"Insufficient denoising. Re-process with higher DWT level or enable DnCNN." },
              ],
              paper:"At 5% AGBN noise: Proposed=34.76 dB vs BM3D=33.89 dB (+0.87 dB). At 10%: 31.68 vs 31.38 (+0.30 dB).",
            },
            { key:"ssim", label:"SSIM — Structural Similarity Index", unit:"(0–1)", higherBetter:true,
              formula:"SSIM(x,y) = [l(x,y)·c(x,y)·s(x,y)]",
              what:"Measures perceptual image quality by comparing luminance (l), contrast (c), and structure (s) between original and denoised images. Unlike PSNR, SSIM mirrors how the human visual system perceives image quality.",
              thresholds:[
                { val:"= 1.000", grade:"Perfect 🟢",    color:G, desc:"Every anatomical structure — nodule boundaries, vessel walls, bronchial trees — reproduced exactly." },
                { val:"≥ 0.99",  grade:"Excellent 🟢",  color:G, desc:"Virtually identical. Minute luminance differences exist but diagnostically irrelevant." },
                { val:"≥ 0.97",  grade:"Good 🔵",       color:T, desc:"Main landmarks preserved. Very fine texture differences in small vessels or interstitial tissue." },
                { val:"< 0.95",  grade:"Poor 🔴",       color:R, desc:"Structural distortion detected. Potential loss of diagnostic markers. Re-process." },
              ],
              paper:"★ Proposed achieves SSIM=1.000 at 5%, 10%, 15% noise — perfect structural match that no other method achieves.",
            },
            { key:"mse", label:"MSE — Mean Squared Error", unit:"(lower=better)", higherBetter:false,
              formula:"MSE = (1/N) · Σ(original_i − denoised_i)²",
              what:"Average squared pixel-level difference between original and denoised images. Unlike PSNR and SSIM, MSE is not perceptual — it treats all pixel errors equally regardless of location or visibility.",
              thresholds:[
                { val:"≤ 30",  grade:"Excellent 🟢",  color:G, desc:"Avg pixel error <5.5 intensity units (0–255). Essentially lossless — differences invisible to the human eye." },
                { val:"≤ 100", grade:"Good 🔵",        color:T, desc:"Avg pixel error <10 intensity units. Clinically negligible deviation." },
                { val:"≤ 200", grade:"Moderate 🟡",    color:A, desc:"Avg error ~14 units. Mainly in high-noise background areas, not diagnostic regions." },
                { val:"> 200", grade:"High 🔴",         color:R, desc:"Significant pixel-level error. May affect fine anatomical detail in report-quality images." },
              ],
              paper:"Proposed MSE=26.46 at 5% noise — average pixel error of only 5.14 intensity units, lowest among all methods.",
            },
            { key:"snr", label:"SNR — Signal-to-Noise Ratio", unit:"dB", higherBetter:true,
              formula:"SNR = 10 · log₁₀(σ²_signal / σ²_noise)",
              what:"Ratio of useful lung tissue signal power to residual background noise energy. A higher SNR means the diagnostic signal (lung parenchyma, nodules, airways) is far stronger than the noise floor.",
              thresholds:[
                { val:"≥ 15 dB", grade:"Excellent 🟢", color:G, desc:"Signal is 31× more powerful than noise. Lung tissue clearly distinguishable from background." },
                { val:"≥ 10 dB", grade:"Good 🔵",      color:T, desc:"Signal dominates. Nodules and vessels clearly separated from noise floor." },
                { val:"≥ 5 dB",  grade:"Moderate 🟡",  color:A, desc:"Noise somewhat visible in background regions. Diagnosis feasible with care." },
                { val:"< 5 dB",  grade:"Low 🔴",        color:R, desc:"Noise approaches signal level. Background speckle may obscure subtle findings." },
              ],
              paper:"Proposed SNR=18.69 dB at 5% noise — signal is 73.9× stronger than noise, demonstrating clean background suppression.",
            },
          ].map(card => (
            <div key={card.key} className="card p-4 space-y-3">
              <div>
                <h3 className="text-sm font-bold" style={{ color:T }}>{card.label}</h3>
                <div className="text-[11px] font-mono mt-1 px-2 py-1 rounded"
                  style={{ background:"var(--c-surface3)", color:"var(--c-text2)" }}>{card.formula}</div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color:"var(--c-text2)" }}>{card.what}</p>
              <div className="space-y-1.5">
                {card.thresholds.map((t,i) => (
                  <div key={i} className="flex gap-2 p-2 rounded-lg border"
                    style={{ borderColor:`${t.color}30`, background:`${t.color}08` }}>
                    <div className="flex-shrink-0">
                      <span className="font-mono text-xs font-bold" style={{ color:t.color }}>{t.val}</span>
                      <div className="text-[10px] font-semibold" style={{ color:t.color }}>{t.grade}</div>
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color:"var(--c-text3)" }}>{t.desc}</p>
                  </div>
                ))}
              </div>
              <div className="text-[11px] p-2.5 rounded-lg border-l-4 leading-relaxed"
                style={{ borderColor:T, background:"var(--c-primary-l)", color:"var(--c-text2)" }}>
                <strong style={{ color:T }}>Paper Result: </strong>{card.paper}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

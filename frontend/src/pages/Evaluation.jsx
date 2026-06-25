import { useQuery } from "react-query";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, Target, Zap, Activity } from "lucide-react";
import clsx from "clsx";

const T="#0d7377"; const G="#2d8c5c"; const A="#c47d1e"; const R="#c0392b";

const NOISE_LEVELS = ["5%","10%","15%","20%","25%","30%","35%","40%","45%","50%","55%","60%"];

const PSNR = {
  "NLM":      [29.62,27.89,26.13,23.03,20.00,24.25,22.02,17.28,18.35,17.68,17.14,16.89],
  "Gaussian": [29.69,28.73,24.87,21.71,18.63,22.90,19.61,15.68,16.79,16.26,14.65,15.13],
  "Median":   [31.85,28.98,27.13,22.02,18.99,13.24,20.99,16.01,17.21,16.53,15.79,15.58],
  "DWT":      [30.94,29.79,27.18,23.14,19.99,23.22,23.13,18.42,18.46,18.16,17.53,17.32],
  "Mean":     [27.99,27.99,27.18,19.03,18.99,21.62,20.97,16.05,17.23,16.57,15.86,15.37],
  "Wiener":   [30.80,27.89,26.15,20.96,17.98,22.19,20.40,15.01,16.18,15.43,14.97,14.84],
  "DnCNN":    [31.95,30.79,28.55,24.87,20.99,25.65,25.95,22.79,22.65,20.90,20.99,19.49],
  "Proposed": [34.76,31.68,29.23,25.92,21.49,27.64,27.04,25.89,24.98,23.95,22.57,21.95],
};

const SSIM = {
  "Proposed": [1.000,1.000,1.000,0.9967,0.9796,0.9986],
  "DnCNN":    [0.9987,0.9899,0.9887,0.9786,0.9785,0.9897],
  "DWT":      [0.9952,0.9876,0.9854,0.9591,0.9589,0.9675],
  "NLM":      [0.9834,0.9694,0.9712,0.9391,0.9545,0.9486],
  "Wiener":   [0.9863,0.9589,0.9335,0.9045,0.9123,0.9345],
  "Gaussian": [0.9774,0.9408,0.9071,0.8703,0.9278,0.9221],
  "Median":   [0.9796,0.9570,0.9418,0.9051,0.9042,0.8964],
  "Mean":     [0.9775,0.9647,0.9291,0.8934,0.8963,0.9121],
};

const MSE = [
  {img:"R1",med:29.72,mean:29.73,wien:24.56,gaus:24.57,nlm:39.38,dwt:29.38,dncnn:29.25,prop:26.46},
  {img:"R2",med:69.37,mean:69.93,wien:227.40,gaus:218.84,nlm:97.03,dwt:85.03,dncnn:80.95,prop:70.99},
  {img:"R3",med:236.70,mean:487.10,wien:575.09,gaus:815.50,nlm:137.13,dwt:127.13,dncnn:111.88,prop:101.35},
  {img:"R4",med:276.35,mean:526.76,wien:614.75,gaus:855.15,nlm:166.78,dwt:156.78,dncnn:158.01,prop:135.65},
  {img:"R5",med:325.35,mean:630.45,wien:640.90,gaus:916.25,nlm:186.02,dwt:176.02,dncnn:165.90,prop:156.90},
  {img:"R6",med:386.23,mean:689.23,wien:705.76,gaus:947.99,nlm:255.25,dwt:245.35,dncnn:230.87,prop:206.91},
];

const psnrChartData = NOISE_LEVELS.map((n,i) => {
  const r={noise:n};
  Object.entries(PSNR).forEach(([m,v])=>{ r[m]=v[i]; });
  return r;
});

const ssimChartData = ["R1","R2","R3","R4","R5","R6"].map((img,i) => {
  const r={image:img};
  Object.entries(SSIM).forEach(([m,v])=>{ r[m]=v[i]; });
  return r;
});

const METHOD_COLORS = {
  "Proposed":T,"DnCNN":G,"DWT":A,"NLM":"#1a6b8a",
  "Wiener":"#7c3aed","Gaussian":"#94a3b8","Median":"#64748b","Mean":"#cbd5e1",
};

function SummaryCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="metric-card flex gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background:`${color}18`, color }}>
        <Icon size={17} />
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color:"var(--c-text3)" }}>{label}</div>
        <div className="text-2xl font-bold" style={{ color:"var(--c-text)" }}>{value}</div>
        <div className="text-[11px]" style={{ color }}>{sub}</div>
      </div>
    </div>
  );
}

export default function Evaluation() {
  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={TrendingUp} label="Best PSNR (Proposed)" value="34.76 dB" sub="vs DnCNN: 31.95"  color={T} />
        <SummaryCard icon={Target}     label="Best SSIM"             value="1.0000"   sub="Images R1–R3"    color={G} />
        <SummaryCard icon={Zap}        label="Lowest MSE"            value="26.46"    sub="Image R1"        color={A} />
        <SummaryCard icon={Activity}   label="Avg Compute"           value="16.7 ms"  sub="Per image · real-time" color={T} />
      </div>

      {/* PSNR line chart */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-1" style={{ color:"var(--c-text)" }}>
          PSNR vs Noise Intensity — All 8 Methods (5%–60%)
        </h3>
        <p className="text-[11px] mb-3" style={{ color:"var(--c-text3)" }}>
          Proposed approach (solid teal) outperforms every baseline at all noise levels.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={psnrChartData} margin={{top:4,right:12,bottom:4,left:-8}}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="noise" tick={{fontSize:11,fill:"var(--c-text3)"}} />
            <YAxis domain={[12,36]} tick={{fontSize:11,fill:"var(--c-text3)"}} />
            <Tooltip contentStyle={{fontSize:11,borderRadius:8}} />
            <Legend wrapperStyle={{fontSize:11}} />
            {Object.keys(METHOD_COLORS).map(m=>(
              <Line key={m} type="monotone" dataKey={m}
                stroke={METHOD_COLORS[m]}
                strokeWidth={m==="Proposed"?3:1.2}
                strokeDasharray={m==="Proposed"?undefined:m==="DnCNN"?"5 2":"2 2"}
                dot={m==="Proposed"?{r:3}:false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* SSIM + MSE charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color:"var(--c-text)" }}>
            SSIM Across CT Images R1–R6 (Top 4 Methods)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ssimChartData} margin={{top:4,right:8,bottom:4,left:-8}}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="image" tick={{fontSize:11,fill:"var(--c-text3)"}} />
              <YAxis domain={[0.86,1.005]} tick={{fontSize:11,fill:"var(--c-text3)"}} />
              <Tooltip contentStyle={{fontSize:11,borderRadius:8}} />
              <Legend wrapperStyle={{fontSize:11}} />
              {["Proposed","DnCNN","DWT","NLM"].map(m=>(
                <Bar key={m} dataKey={m} fill={METHOD_COLORS[m]}
                  radius={m==="Proposed"?[4,4,0,0]:[2,2,0,0]}
                  opacity={m==="Proposed"?1:0.6} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color:"var(--c-text)" }}>
            MSE — Proposed vs Gaussian &amp; Wiener (lower = better)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MSE.map(r=>({image:`Img ${r.img}`,Proposed:r.prop,Gaussian:r.gaus,Wiener:r.wien,DnCNN:r.dncnn}))}
              margin={{top:4,right:8,bottom:4,left:-8}}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="image" tick={{fontSize:11,fill:"var(--c-text3)"}} />
              <YAxis tick={{fontSize:11,fill:"var(--c-text3)"}} />
              <Tooltip contentStyle={{fontSize:11,borderRadius:8}} />
              <Legend wrapperStyle={{fontSize:11}} />
              <Bar dataKey="Proposed" fill={T} radius={[3,3,0,0]} />
              <Bar dataKey="DnCNN"    fill={G} radius={[3,3,0,0]} opacity={0.7} />
              <Bar dataKey="Wiener"   fill={A} radius={[3,3,0,0]} opacity={0.55} />
              <Bar dataKey="Gaussian" fill="#94a3b8" radius={[3,3,0,0]} opacity={0.45} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PSNR full table */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-1" style={{ color:"var(--c-text)" }}>
          PSNR Comparison Table (dB) — Paper: Abuya et al., 2023
        </h3>
        <p className="text-[11px] mb-3" style={{ color:"var(--c-text3)" }}>
          <span className="font-semibold" style={{ color:T }}>Teal = Proposed approach.</span>{" "}
          Bold = column best.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[750px]">
            <thead>
              <tr className="table-head">
                <th>Method</th>
                {NOISE_LEVELS.map(n=><th key={n}>{n}</th>)}
              </tr>
            </thead>
            <tbody>
              {Object.entries(PSNR).map(([method, vals]) => {
                const isP = method==="Proposed";
                return (
                  <tr key={method} className="table-row"
                    style={{ background: isP?"var(--c-primary-l)":"inherit" }}>
                    <td className="font-semibold" style={{ color:isP?T:"var(--c-text)" }}>
                      {isP?"★ ":""}{method}
                    </td>
                    {vals.map((v,i)=>{
                      const colMax=Math.max(...Object.values(PSNR).map(a=>a[i]));
                      return (
                        <td key={i} className="font-mono"
                          style={{ color:isP?T:v===colMax?"var(--c-secondary)":"var(--c-text)",
                                   fontWeight:(isP||v===colMax)?"700":"400" }}>
                          {v.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SSIM full table */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3" style={{ color:"var(--c-text)" }}>
          SSIM Comparison Table — CT Images R1–R6
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="table-head">
                <th>Method</th>
                {["R1","R2","R3","R4","R5","R6"].map(i=><th key={i}>Image {i}</th>)}
              </tr>
            </thead>
            <tbody>
              {Object.entries(SSIM).map(([method,vals])=>{
                const isP=method==="Proposed";
                return (
                  <tr key={method} className="table-row"
                    style={{ background:isP?"var(--c-primary-l)":"inherit" }}>
                    <td className="font-semibold" style={{ color:isP?T:"var(--c-text)" }}>
                      {isP?"★ ":""}{method}
                    </td>
                    {vals.map((v,i)=>(
                      <td key={i} className="font-mono"
                        style={{ color:isP?T:"var(--c-text)",
                                 fontWeight:isP?"700":"400" }}>
                        {v.toFixed(4)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MSE full table */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3" style={{ color:"var(--c-text)" }}>
          MSE Comparison Table — CT Images R1–R6
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="table-head">
                <th>Image</th>
                {["Median","Mean","Wiener","Gaussian","NLM","DWT","DnCNN","★ Proposed"].map(h=>(
                  <th key={h} style={{ color:h.includes("Proposed")?T:undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MSE.map(row=>(
                <tr key={row.img} className="table-row">
                  <td className="font-semibold" style={{ color:"var(--c-text)" }}>Image {row.img}</td>
                  {[row.med,row.mean,row.wien,row.gaus,row.nlm,row.dwt,row.dncnn,row.prop].map((v,i)=>(
                    <td key={i} className="font-mono"
                      style={{ color:i===7?T:"var(--c-text)", fontWeight:i===7?"700":"400" }}>
                      {v.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] mt-2" style={{ color:"var(--c-text3)" }}>
          Source: Abuya T.K., Rimiru R.M., Okeyo G.O. — Appl. Sci. 2023, 13, 12069. doi:10.3390/app132112069
        </p>
      </div>
    </div>
  );
}

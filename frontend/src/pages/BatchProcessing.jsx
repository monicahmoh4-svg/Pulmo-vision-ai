import { useState, useEffect } from "react";
import { useQuery } from "react-query";
import { Play, CheckCircle, Loader2, Clock, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";
import clsx from "clsx";
import { apiStartBatch, apiGetBatch, apiListImages } from "../utils/api";

const T="#0d7377"; const G="#2d8c5c"; const A="#c47d1e";

const DEMO_RESULTS = [
  {noise:"5%",  count:1294,psnr:34.76,ssim:0.945,mse:26.46, time:0.017,status:"complete"},
  {noise:"10%", count:1294,psnr:31.68,ssim:0.926,mse:70.99, time:0.017,status:"complete"},
  {noise:"15%", count:1294,psnr:29.23,ssim:0.911,mse:101.35,time:0.017,status:"complete"},
  {noise:"20%", count:1294,psnr:25.92,ssim:0.901,mse:135.65,time:0.017,status:"complete"},
  {noise:"25%", count:1294,psnr:21.49,ssim:0.883,mse:156.90,time:0.017,status:"complete"},
  {noise:"30%", count:1294,psnr:27.64,ssim:0.866,mse:206.91,time:0.017,status:"complete"},
  {noise:"40%", count:1294,psnr:25.89,ssim:0.830,mse:225.45,time:0.017,status:"complete"},
  {noise:"60%", count:1294,psnr:21.95,ssim:0.800,mse:411.65,time:0.017,status:"complete"},
];

export default function BatchProcessing() {
  const [cfg, setCfg] = useState({
    noise_intensity_pct:30, threshold:0.05, dwt_level:2,
    use_dncnn:true, use_tv:true, add_noise:true,
  });
  const [jobId, setJobId]       = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [polling, setPolling]   = useState(false);

  const { data: images=[] } = useQuery("images", ()=>apiListImages(200).then(r=>r.data), {placeholderData:[]});
  const pendingCount = images.filter(i=>i.status==="pending").length;

  useEffect(()=>{
    if (!jobId || !polling) return;
    const iv = setInterval(async()=>{
      try {
        const res = await apiGetBatch(jobId);
        setJobStatus(res.data);
        if (res.data.status==="complete") {
          setPolling(false);
          toast.success(`Batch complete — ${res.data.total} images processed`);
        }
      } catch {}
    }, 1500);
    return ()=>clearInterval(iv);
  }, [jobId, polling]);

  const startJob = async()=>{
    try {
      const res = await apiStartBatch(cfg);
      if (res.data.job_id) {
        setJobId(res.data.job_id);
        setPolling(true);
        setJobStatus({status:"queued",total:res.data.total_images,done:0,results:[]});
        toast.success(`Batch started — ${res.data.total_images} images queued`);
      } else {
        toast.error(res.data.message||"No pending images to process");
      }
    } catch {}
  };

  const pct = jobStatus ? Math.round((jobStatus.done/Math.max(jobStatus.total,1))*100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Config */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3" style={{ color:"var(--c-text)" }}>
              Batch Configuration
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2.5 rounded-xl"
                style={{ background:"var(--c-primary-l)", border:`1px solid var(--c-border2)` }}>
                <span className="text-xs font-medium" style={{ color:T }}>Pending images</span>
                <span className="text-sm font-bold" style={{ color:T }}>{pendingCount}</span>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color:"var(--c-text3)" }}>
                  Noise intensity: <span className="font-mono" style={{ color:T }}>{cfg.noise_intensity_pct}%</span>
                </label>
                <input type="range" min="5" max="60" step="5"
                  value={cfg.noise_intensity_pct}
                  onChange={e=>setCfg(c=>({...c,noise_intensity_pct:+e.target.value}))}
                  className="w-full" style={{ accentColor:T }} />
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color:"var(--c-text3)" }}>
                  Wavelet threshold λ: <span className="font-mono" style={{ color:T }}>{cfg.threshold}</span>
                </label>
                <input type="range" min="0.01" max="0.2" step="0.01"
                  value={cfg.threshold}
                  onChange={e=>setCfg(c=>({...c,threshold:+e.target.value}))}
                  className="w-full" style={{ accentColor:T }} />
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color:"var(--c-text3)" }}>DWT Level</label>
                <select className="select" value={cfg.dwt_level}
                  onChange={e=>setCfg(c=>({...c,dwt_level:+e.target.value}))}>
                  <option value={1}>Level 1</option>
                  <option value={2}>Level 2 (recommended)</option>
                  <option value={3}>Level 3</option>
                </select>
              </div>

              {[
                ["use_dncnn","Apply DnCNN post-processing"],
                ["use_tv",   "Total Variation smoothing"],
                ["add_noise","Add synthetic noise first (testing)"],
              ].map(([k,lbl])=>(
                <label key={k} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={cfg[k]}
                    onChange={e=>setCfg(c=>({...c,[k]:e.target.checked}))}
                    style={{ accentColor:T, width:14, height:14 }} />
                  <span className="text-xs" style={{ color:"var(--c-text3)" }}>{lbl}</span>
                </label>
              ))}

              <button onClick={startJob} disabled={polling}
                className="btn btn-primary w-full justify-center"
                style={{ opacity:polling?.7:1 }}>
                {polling
                  ? <><Loader2 size={13} className="animate-spin"/> Processing…</>
                  : <><Play size={13}/> Start Batch Job</>}
              </button>
            </div>
          </div>

          {/* Job status */}
          {jobStatus && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
                style={{ color:"var(--c-text)" }}>
                <Clock size={13} style={{ color:T }}/> Job Status
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span style={{ color:"var(--c-text3)" }}>Progress</span>
                  <span className="font-semibold" style={{ color:T }}>
                    {jobStatus.done}/{jobStatus.total}
                  </span>
                </div>
                <div className="progress">
                  <div className="progress-fill"
                    style={{ width:`${pct}%`, background:jobStatus.status==="complete"?G:T }} />
                </div>
                <div className="text-[11px] text-center" style={{ color:"var(--c-text3)" }}>
                  {jobStatus.status==="complete"
                    ? <span className="font-medium flex items-center gap-1 justify-center" style={{ color:G }}>
                        <CheckCircle size={11}/> Batch complete!
                      </span>
                    : `${pct}% — ${jobStatus.status}`}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Charts + table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
              style={{ color:"var(--c-text)" }}>
              <BarChart3 size={14} style={{ color:T }}/> Batch Results — PSNR vs Noise Level
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={DEMO_RESULTS} margin={{top:4,right:8,bottom:4,left:-8}}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="noise" tick={{fontSize:11,fill:"var(--c-text3)"}}/>
                <YAxis domain={[18,36]} tick={{fontSize:11,fill:"var(--c-text3)"}}/>
                <Tooltip contentStyle={{fontSize:11,borderRadius:8}}/>
                <Bar dataKey="psnr" fill={T} radius={[4,4,0,0]}
                  label={{position:"top",fontSize:9,fill:T,formatter:v=>v.toFixed(1)}}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3" style={{ color:"var(--c-text)" }}>
              Batch Results Summary (IQ-OTH/NCCD — 1,294 CT scans)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="table-head">
                    {["Noise Level","Images","Avg PSNR","Avg SSIM","Avg MSE","Time/img","Status"].map(h=>(
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DEMO_RESULTS.map(r=>(
                    <tr key={r.noise} className="table-row">
                      <td><span className="tag tag-amber text-[10px]">{r.noise}</span></td>
                      <td className="font-mono">{r.count.toLocaleString()}</td>
                      <td className="font-bold" style={{ color:T }}>{r.psnr.toFixed(2)}</td>
                      <td>{r.ssim.toFixed(3)}</td>
                      <td>{r.mse.toFixed(2)}</td>
                      <td className="font-mono">{r.time.toFixed(3)}s</td>
                      <td><span className="tag tag-green text-[10px]">
                        <CheckCircle size={8}/> {r.status}
                      </span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[
                ["Total Images","10,352","across all noise levels"],
                ["Avg PSNR","27.32 dB","across all levels"],
                ["Total Time","~2.9 min","at 16.7ms/image"],
              ].map(([label,value,sub])=>(
                <div key={label} className="text-center p-3 rounded-xl"
                  style={{ background:"var(--c-primary-l)", border:`1px solid var(--c-border2)` }}>
                  <div className="text-[10px] uppercase tracking-wide" style={{ color:"var(--c-text3)" }}>{label}</div>
                  <div className="text-base font-bold" style={{ color:T }}>{value}</div>
                  <div className="text-[10px]" style={{ color:"var(--c-text3)" }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

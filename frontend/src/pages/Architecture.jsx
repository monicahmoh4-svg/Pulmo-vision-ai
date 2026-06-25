import { GitBranch, Server, Globe, Shield, Database, Cpu, Code2 } from "lucide-react";
import clsx from "clsx";

const T="#0d7377"; const G="#2d8c5c"; const A="#c47d1e";

const PIPELINE=[
  {icon:"🏥",label:"Hospital CT Scanner / PACS",    desc:"DICOM export from imaging equipment",               color:T},
  {icon:"📥",label:"Data Ingestion API",             desc:"FastAPI · pydicom · OpenCV · 512×512 grayscale",    color:G},
  {icon:"⚙️",label:"Preprocessing Engine",          desc:"Normalize · patch extraction 45×45 · 2,200/img",    color:T},
  {icon:"🔍",label:"Noise Detection Module",         desc:"Wavelet HH1 / MAD / Laplacian σ estimation",        color:A},
  {icon:"🌀",label:"Anisotropic Gaussian Filter",    desc:"G(x,y)=exp(-(x²+y²)/2σ²) · edge-gradient blend",   color:T},
  {icon:"📊",label:"Haar DWT (Level 2) + BayesShrink",desc:"LL2+LH,HL,HH · λ=σ²_noise/σ_signal per sub-band",color:G},
  {icon:"🧠",label:"DnCNN (17-layer ResNet)",        desc:"64 filters · BatchNorm · ReLU · skip connection",   color:T},
  {icon:"🔄",label:"Inverse Haar DWT (IDWT)",        desc:"Reconstruct denoised image from sub-bands",          color:G},
  {icon:"✨",label:"Total Variation Smoothing",      desc:"Chambolle TV · removes residual artifacts",          color:T},
  {icon:"📈",label:"Evaluation Engine",              desc:"PSNR · SSIM · MSE · SNR · benchmark vs 7 methods",  color:G},
  {icon:"💾",label:"Storage (PostgreSQL / Neon)",    desc:"Async SQLAlchemy · image files · metadata",          color:T},
  {icon:"👁️",label:"Radiologist Interface + API",   desc:"React 18 dashboard · REST endpoints · DICOM export", color:G},
];

const SERVICES=[
  {name:"Ingestion Service",  tech:"FastAPI + pydicom + OpenCV",   port:"8000",color:T},
  {name:"Noise Detector",     tech:"NumPy + PyWavelets (HH1 MAD)", port:"8001",color:G},
  {name:"AGF Processor",      tech:"OpenCV + NumPy (edge-adaptive)",port:"8002",color:T},
  {name:"Wavelet Engine",     tech:"PyWavelets · Haar DWT/IDWT",   port:"8003",color:G},
  {name:"DnCNN Inference",    tech:"TensorFlow/Keras 17-layer",     port:"8004",color:T},
  {name:"TV Smoother",        tech:"NumPy · Chambolle algorithm",   port:"8005",color:G},
  {name:"Metrics Engine",     tech:"NumPy · OpenCV SSIM (no scipy)",port:"8006",color:T},
  {name:"Storage Service",    tech:"SQLAlchemy async · Neon PG",    port:"8007",color:G},
  {name:"Radiologist UI",     tech:"React 18 + Recharts + Vite",   port:"3000",color:A},
];

const DEPLOY=[
  {platform:"Vercel",  role:"Frontend",   detail:"React SPA · CDN · auto-deploy on git push",           color:T},
  {platform:"Render",  role:"Backend",    detail:"FastAPI · Python 3.11 · persistent disk for images",  color:G},
  {platform:"Neon",    role:"Database",   detail:"PostgreSQL serverless · SSL · asyncpg driver",        color:T},
  {platform:"GitHub",  role:"CI/CD",      detail:"Push → Vercel + Render auto-deploy simultaneously",   color:G},
];

export default function Architecture() {
  return (
    <div className="space-y-5">
      {/* Info */}
      <div className="rounded-xl p-3 flex gap-3 border"
        style={{ background:"var(--c-primary-l)", borderColor:"var(--c-border2)" }}>
        <GitBranch size={15} className="flex-shrink-0 mt-0.5" style={{ color:T }}/>
        <p className="text-sm" style={{ color:"var(--c-text2)" }}>
          <strong>Full-stack microservices:</strong> FastAPI (Render) + React (Vercel) + PostgreSQL Neon.
          Five-stage pipeline — AGF → Haar BayesShrink → DnCNN → IDWT → TV.
          No Fortran/SciPy needed — all pre-built wheel packages.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline flow */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"
            style={{ color:"var(--c-text)" }}>
            <Cpu size={14} style={{ color:T }}/> High-Level Pipeline Flow
          </h3>
          <div className="space-y-1">
            {PIPELINE.map((node,i)=>(
              <div key={node.label}>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg border transition-all hover:shadow-sm cursor-default"
                  style={{
                    borderLeft:`3px solid ${node.color}`,
                    borderTop:`1px solid var(--c-border)`,
                    borderRight:`1px solid var(--c-border)`,
                    borderBottom:`1px solid var(--c-border)`,
                    background:"var(--c-surface)",
                  }}>
                  <span className="text-base flex-shrink-0">{node.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color:"var(--c-text)" }}>{node.label}</div>
                    <div className="text-[10px] truncate" style={{ color:"var(--c-text3)" }}>{node.desc}</div>
                  </div>
                </div>
                {i<PIPELINE.length-1 && (
                  <div className="text-center text-sm leading-none py-0.5" style={{ color:"var(--c-border2)" }}>↓</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {/* Microservices */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
              style={{ color:"var(--c-text)" }}>
              <Server size={14} style={{ color:T }}/> Microservices
            </h3>
            <div className="space-y-1.5">
              {SERVICES.map(s=>(
                <div key={s.name} className="flex items-center gap-2.5 p-2 rounded-lg border"
                  style={{ borderColor:"var(--c-border)", background:"var(--c-surface3)" }}>
                  <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background:s.color }}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold" style={{ color:"var(--c-text)" }}>{s.name}</div>
                    <div className="text-[10px]" style={{ color:"var(--c-text3)" }}>{s.tech}</div>
                  </div>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background:"var(--c-surface)", color:"var(--c-text3)", border:`1px solid var(--c-border)` }}>
                    :{s.port}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Deployment */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
              style={{ color:"var(--c-text)" }}>
              <Globe size={14} style={{ color:T }}/> Deployment
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {DEPLOY.map(d=>(
                <div key={d.platform} className="p-3 rounded-xl border"
                  style={{ borderLeft:`3px solid ${d.color}`, borderTop:`1px solid var(--c-border)`,
                           borderRight:`1px solid var(--c-border)`, borderBottom:`1px solid var(--c-border)`,
                           background:"var(--c-surface3)" }}>
                  <div className="text-xs font-bold" style={{ color:d.color }}>{d.platform}</div>
                  <div className="text-[10px] font-semibold mt-0.5" style={{ color:"var(--c-text)" }}>{d.role}</div>
                  <div className="text-[10px] mt-1" style={{ color:"var(--c-text3)" }}>{d.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* DnCNN detail */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
          style={{ color:"var(--c-text)" }}>
          <Code2 size={14} style={{ color:T }}/> DnCNN Architecture (17 layers)
        </h3>
        <div className="flex flex-wrap gap-2 items-center">
          {[
            {label:"Input",     sub:"Noisy CT\n(H×W×1)",  color:"#64748b"},
            {label:"Layer 1",   sub:"Conv(64,3×3)\n+ReLU", color:T},
            {label:"Layers 2–16",sub:"Conv+BN+ReLU\n×15",  color:G},
            {label:"Layer 17",  sub:"Conv(1,3×3)\noutput",  color:T},
            {label:"Subtract",  sub:"input−noise\nresidual",color:G},
            {label:"Output",    sub:"Denoised CT\n(H×W×1)",color:G},
          ].map((l,i,arr)=>(
            <div key={i} className="flex items-center gap-1">
              <div className="px-3 py-2 rounded-xl border text-center min-w-[82px]"
                style={{ borderColor:l.color, background:`${l.color}12`, color:l.color }}>
                <div className="text-[10px] font-bold">{l.label}</div>
                <div className="text-[9px] mt-0.5 leading-tight whitespace-pre-line">{l.sub}</div>
              </div>
              {i<arr.length-1 && <span className="text-xs" style={{ color:"var(--c-border2)" }}>→</span>}
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[
            ["Skip Connection","R(x) = F(x) + x"],
            ["Loss Function",  "L = 1/2N · Σ‖R(y;θ)−(y−x)‖²"],
            ["Optimiser",      "Adam · lr=0.00238 · 47 epochs"],
          ].map(([label,formula])=>(
            <div key={label} className="rounded-xl p-3"
              style={{ background:"var(--c-surface3)", border:`1px solid var(--c-border)` }}>
              <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color:"var(--c-text3)" }}>{label}</div>
              <div className="font-mono text-xs" style={{ color:T }}>{formula}</div>
            </div>
          ))}
        </div>
      </div>

      {/* API reference */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
          style={{ color:"var(--c-text)" }}>
          <Shield size={14} style={{ color:T }}/> REST API Endpoints
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="table-head">
                {["Method","Endpoint","Description"].map(h=><th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ["POST","/api/v1/ingest",                    "Upload CT scan (DICOM/PNG/JPG)"],
                ["GET", "/api/v1/images",                   "List ingested images"],
                ["POST","/api/v1/denoise",                  "Run AGF+Haar+DnCNN+TV pipeline"],
                ["GET", "/api/v1/denoise/{id}/download",    "Download denoised PNG"],
                ["POST","/api/v1/denoise/preview",          "Synthetic CT demo preview"],
                ["POST","/api/v1/enhance",                  "Enhanced pipeline (BayesShrink+NLM)"],
                ["GET", "/api/v1/enhance/noise-analysis/{id}","Multi-scale σ analysis"],
                ["GET", "/api/v1/metrics/{id}",             "PSNR/SSIM/MSE/SNR for image"],
                ["GET", "/api/v1/metrics/aggregate/summary","System-wide aggregate stats"],
                ["POST","/api/v1/batch",                    "Start async batch job"],
                ["GET", "/api/v1/batch/{job_id}",           "Poll batch job status"],
                ["GET", "/api/v1/dataset/info",             "Dataset metadata"],
                ["GET", "/api/v1/health",                   "Deep health check (DB ping)"],
                ["GET", "/api/v1/health/ping",              "Lightweight liveness ping"],
                ["GET", "/api/docs",                        "Swagger UI (interactive)"],
              ].map(([method,path,desc])=>(
                <tr key={path} className="table-row">
                  <td>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{ background:method==="GET"?"var(--c-primary-l)":"var(--c-secondary-l)",
                               color:method==="GET"?T:G }}>
                      {method}
                    </span>
                  </td>
                  <td className="font-mono" style={{ color:T }}>{path}</td>
                  <td style={{ color:"var(--c-text3)" }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Database guidance */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
          style={{ color:"var(--c-text)" }}>
          <Database size={14} style={{ color:T }}/> Database Setup — Neon PostgreSQL (Recommended)
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-xs mb-3" style={{ color:"var(--c-text3)" }}>
              You've created a Neon database on Vercel. Connect it to your Render backend:
            </p>
            <ol className="text-xs space-y-2" style={{ color:"var(--c-text3)" }}>
              {[
                "In Vercel → Storage → your Neon DB → .env.local tab",
                "Copy the POSTGRES_URL (pooled) connection string",
                "In Render → your backend service → Environment",
                `Set DATABASE_URL = postgresql+asyncpg://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`,
                "Also set FRONTEND_URL = https://your-app.vercel.app",
                "Redeploy backend — tables auto-created on startup",
              ].map((step,i)=>(
                <li key={i} className="flex gap-2">
                  <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                    style={{ background:"var(--c-primary-l)", color:T }}>{i+1}</span>
                  <span className={i===3?"font-mono text-[10px]":""}>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <pre className="rounded-xl p-3 text-[10px] font-mono overflow-x-auto"
            style={{ background:"#0d1117", color:"#7ee787" }}>{`# Render environment variables
DATABASE_URL=postgresql+asyncpg://\\
  user:pass@ep-xxx.neon.tech/\\
  neondb?sslmode=require

FRONTEND_URL=https://lungdenoise.vercel.app

EXTRA_ORIGINS=https://lungdenoise-\\
  git-main-yourname.vercel.app

UPLOAD_DIR=/app/uploads
OUTPUT_DIR=/app/outputs
DEBUG=false
USE_PRETRAINED_DNCNN=false`}</pre>
        </div>
      </div>
    </div>
  );
}

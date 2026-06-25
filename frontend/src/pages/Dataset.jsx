import { useQuery } from "react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Database, ExternalLink, BookOpen, Download } from "lucide-react";
import { apiDatasetInfo } from "../utils/api";

const T="#0d7377"; const G="#2d8c5c"; const A="#c47d1e"; const R="#c0392b";

const CLASS_DATA=[{name:"Normal",count:500,color:G},{name:"Benign",count:297,color:A},{name:"Malignant",count:497,color:R}];
const NOISE_DATA=[{name:"Gaussian Blur (AGBN)",count:1096,pct:84.7,color:T},{name:"Salt & Pepper",count:198,pct:15.3,color:"#94a3b8"}];
const SNR_DATA=[
  {level:"5%",snr:18.69},{level:"10%",snr:15.46},{level:"15%",snr:15.09},{level:"20%",snr:9.80},
  {level:"25%",snr:6.90},{level:"30%",snr:5.11},{level:"35%",snr:4.70},{level:"40%",snr:4.55},
  {level:"45%",snr:2.90},{level:"50%",snr:2.50},{level:"55%",snr:2.19},{level:"60%",snr:1.50},
];

export default function Dataset() {
  const { data: info } = useQuery("datasetInfo", ()=>apiDatasetInfo().then(r=>r.data), {
    placeholderData:{ name:"IQ-OTH/NCCD Lung Cancer Dataset", total_images:1294, split:{train:1035,test:259} }
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card-md p-5 rounded-2xl text-white"
        style={{ background:`linear-gradient(135deg, ${T} 0%, #0a5c60 50%, ${G} 100%)` }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background:"rgba(255,255,255,.18)" }}>
            <Database size={22} className="text-white"/>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold">IQ-OTH/NCCD Lung Cancer Dataset</h2>
            <p className="text-sm mt-1" style={{ color:"rgba(255,255,255,.82)" }}>
              Collected over 3 months (Fall 2019) from specialist hospitals in Iraq.
              1,294 CT scans: Normal, Benign, and Malignant classifications.
              85% affected by Additive Gaussian Blur Noise (AGBN).
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
              {[
                ["Primary Dataset", "https://www.kaggle.com/datasets/hamdallak/the-iqothnccd-lung-cancer-dataset"],
                ["Augmented Dataset","https://www.kaggle.com/datasets/aleksandarcvetanov/iq-othnccd-lung-cancer-augmented-dataset"],
                ["Research Paper",   "https://doi.org/10.3390/app132112069"],
              ].map(([label, url])=>(
                <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                  style={{ background:"rgba(255,255,255,.15)" }}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.25)"}
                  onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.15)"}>
                  <ExternalLink size={11}/> {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {label:"Total CT Images",value:"1,294",sub:"Grayscale · 512×512 px"},
          {label:"Training Set",   value:"1,035",sub:"80% of dataset"},
          {label:"Test Set",       value:"259",  sub:"20% of dataset"},
          {label:"Patches/Image",  value:"2,200",sub:"45×45 px patches"},
        ].map(({label,value,sub})=>(
          <div key={label} className="metric-card text-center">
            <div className="text-2xl font-bold" style={{ color:T }}>{value}</div>
            <div className="text-[11px] font-semibold mt-0.5" style={{ color:"var(--c-text)" }}>{label}</div>
            <div className="text-[10px]" style={{ color:"var(--c-text3)" }}>{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Class pie */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color:"var(--c-text)" }}>Class Distribution</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="45%" height={170}>
              <PieChart>
                <Pie data={CLASS_DATA} dataKey="count" nameKey="name" cx="50%" cy="50%"
                  outerRadius={68} innerRadius={34}>
                  {CLASS_DATA.map((d,i)=><Cell key={i} fill={d.color}/>)}
                </Pie>
                <Tooltip formatter={(v,n)=>[`${v} images`,n]}
                  contentStyle={{fontSize:11,borderRadius:8}}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {CLASS_DATA.map(d=>(
                <div key={d.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium" style={{ color:d.color }}>{d.name}</span>
                    <span style={{ color:"var(--c-text3)" }}>{d.count} ({(d.count/1294*100).toFixed(1)}%)</span>
                  </div>
                  <div className="progress">
                    <div className="progress-fill" style={{ width:`${d.count/1294*100}%`, background:d.color }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Noise distribution */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color:"var(--c-text)" }}>Noise Distribution</h3>
          <div className="space-y-4">
            {NOISE_DATA.map(n=>(
              <div key={n.name}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium" style={{ color:n.color }}>{n.name}</span>
                  <span className="font-bold" style={{ color:n.color }}>{n.count} ({n.pct}%)</span>
                </div>
                <div className="progress" style={{ height:10, borderRadius:6 }}>
                  <div style={{ width:`${n.pct}%`, height:"100%", background:n.color, borderRadius:6 }}/>
                </div>
              </div>
            ))}
            <div className="p-3 rounded-xl text-xs" style={{ background:"var(--c-primary-l)", color:T }}>
              <strong>Primary focus:</strong> AGBN dominates 84.7% of images. Noise σ=0.15, tested
              at 5%–60% intensity levels for comprehensive evaluation.
            </div>
          </div>
        </div>
      </div>

      {/* SNR chart */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-1" style={{ color:"var(--c-text)" }}>
          SNR vs Noise Intensity (Proposed Approach)
        </h3>
        <p className="text-[11px] mb-3" style={{ color:"var(--c-text3)" }}>
          As noise intensity increases, SNR decreases — quantifying signal-to-noise preservation.
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={SNR_DATA} margin={{top:4,right:8,bottom:4,left:-8}}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="level" tick={{fontSize:11,fill:"var(--c-text3)"}}/>
            <YAxis tick={{fontSize:11,fill:"var(--c-text3)"}}/>
            <Tooltip contentStyle={{fontSize:11,borderRadius:8}}/>
            <Bar dataKey="snr" fill={T} radius={[4,4,0,0]}
              label={{position:"top",fontSize:9,fill:T,formatter:v=>v.toFixed(1)}}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Hyperparameters */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3" style={{ color:"var(--c-text)" }}>
          Training Hyperparameters (Abuya et al. 2023)
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {[
            ["Noise σ","0.15"],["Noise range","5%–60%"],["Learning rate","0.00238"],
            ["Epochs","47"],["Steps/epoch","846"],["Batch (patch)","45×45 px"],
            ["Patches/image","2,200"],["DWT wavelet","Haar"],["DWT levels","2"],
            ["Threshold method","BayesShrink"],["DnCNN filters","64 @ 3×3"],["DnCNN layers","17"],
            ["TV weight","0.03"],["Optimizer","Adam"],["Loss","MSE pixel-level"],
          ].map(([k,v])=>(
            <div key={k} className="flex justify-between items-center p-2 rounded-lg"
              style={{ background:"var(--c-surface3)", border:`1px solid var(--c-border)` }}>
              <span className="text-[11px]" style={{ color:"var(--c-text3)" }}>{k}</span>
              <span className="text-[11px] font-mono font-bold" style={{ color:T }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Kaggle setup */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color:"var(--c-text)" }}>
          <Download size={14} style={{ color:T }}/> Kaggle Dataset Download
        </h3>
        <pre className="rounded-xl p-4 text-[11px] font-mono overflow-x-auto leading-relaxed"
          style={{ background:"#0d1117", color:"#7ee787" }}>{`# Install Kaggle CLI
pip install kaggle

# Set API credentials (kaggle.com → Account → API Token)
export KAGGLE_USERNAME=your_username
export KAGGLE_KEY=your_api_key

# Download primary dataset (1,294 CT images)
kaggle datasets download hamdallak/the-iqothnccd-lung-cancer-dataset
unzip the-iqothnccd-lung-cancer-dataset.zip -d data/

# Download augmented dataset
kaggle datasets download aleksandarcvetanov/iq-othnccd-lung-cancer-augmented-dataset
unzip iq-othnccd-lung-cancer-augmented-dataset.zip -d data/augmented/

# Train DnCNN on the dataset
cd backend
python train_dncnn.py --data_dir ./data --epochs 47 --sigma 0.15`}</pre>
      </div>
    </div>
  );
}

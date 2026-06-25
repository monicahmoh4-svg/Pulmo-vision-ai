import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload, FileImage, CheckCircle, Loader2,
  AlertTriangle, X, Info, Activity, Database,
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";
import { apiUploadImage, apiNoiseAnalysis } from "../utils/api";

const T = "#0d7377";
const G = "#2d8c5c";

export default function Ingest() {
  const [files, setFiles]         = useState([]);
  const [patientId, setPatientId] = useState("");
  const [diagnosis, setDiagnosis] = useState("unknown");
  const [noiseAnalysis, setNoiseAnalysis] = useState(null);

  // Plain ref to the hidden native <input type="file"> — most reliable cross-browser
  const fileInputRef = useRef(null);

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length) toast.error("Some files rejected — max 50 MB, DICOM/PNG/JPG only");
    setFiles(prev => [
      ...prev,
      ...accepted.map(f => ({
        file:    f,
        id:      Math.random().toString(36).slice(2),
        status:  "idle",
        preview: null,
        result:  null,
      })),
    ]);
  }, []);

  // Native input change handler — picks up files from the OS file picker
  const onNativeChange = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    const MAX = 50 * 1024 * 1024;
    const accepted = []; const rejected = [];
    picked.forEach(f => (f.size <= MAX ? accepted : rejected).push(f));
    if (rejected.length) toast.error("Some files exceed the 50 MB limit");
    setFiles(prev => [
      ...prev,
      ...accepted.map(f => ({
        file: f, id: Math.random().toString(36).slice(2),
        status: "idle", preview: null, result: null,
      })),
    ]);
    // Reset so the same file can be re-selected after removal
    e.target.value = "";
  };

  // Dropzone only handles drag-and-drop; noClick + noKeyboard so it never
  // tries to open its own dialog (we use the native input directly instead)
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*":           [".png", ".jpg", ".jpeg"],
      "application/dicom": [".dcm", ".dicom"],
    },
    maxSize:    50 * 1024 * 1024,
    multiple:   true,
    noClick:    true,
    noKeyboard: true,
  });

  const uploadFile = async (item) => {
    setFiles(p => p.map(f => f.id === item.id ? { ...f, status: "uploading" } : f));
    try {
      const res  = await apiUploadImage(item.file, patientId, diagnosis);
      const data = res.data;
      setFiles(p => p.map(f =>
        f.id === item.id
          ? { ...f, status: "done", result: data,
              preview: data.preview ? `data:image/png;base64,${data.preview}` : null }
          : f
      ));
      toast.success(`✓ ${item.file.name} — σ = ${data.noise_sigma}`);
      try {
        const na = await apiNoiseAnalysis(data.id);
        setNoiseAnalysis(na.data);
      } catch { /* best-effort */ }
    } catch {
      setFiles(p => p.map(f => f.id === item.id ? { ...f, status: "error" } : f));
    }
  };

  const uploadAll = () =>
    files.filter(f => f.status === "idle").forEach(uploadFile);

  const remove    = (id) => setFiles(p => p.filter(f => f.id !== id));
  const idleCount = files.filter(f => f.status === "idle").length;

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="rounded-xl p-3 flex gap-3 border"
        style={{ background: "var(--c-primary-l)", borderColor: "var(--c-border2)" }}>
        <Info size={15} className="flex-shrink-0 mt-0.5" style={{ color: T }} />
        <p className="text-sm" style={{ color: "var(--c-text2)" }}>
          <strong>Accepted:</strong> DICOM (.dcm), PNG, JPG — auto-converted to grayscale 512×512.
          Gaussian noise σ estimated automatically via Haar wavelet (Donoho-Johnstone). Each image
          gets a unique ID for the denoising pipeline.
        </p>
      </div>

      {/*
        Single hidden native file input — lives at the top level, outside any
        click-intercepting div. Triggered directly by fileInputRef.current.click().
      */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.dcm,.dicom,image/*"
        style={{ display: "none" }}
        onChange={onNativeChange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Left: settings ──────────────────────────────── */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--c-text)" }}>
              Patient Metadata
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text3)" }}>
                  Patient ID (optional)
                </label>
                <input className="input" placeholder="e.g. IQ-0042"
                  value={patientId} onChange={e => setPatientId(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text3)" }}>
                  Diagnosis Classification
                </label>
                <select className="select" value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}>
                  <option value="unknown">Unknown</option>
                  <option value="normal">Normal</option>
                  <option value="benign">Benign</option>
                  <option value="malignant">Malignant</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--c-text)" }}>
              Preprocessing Config
            </h3>
            <div className="space-y-1.5">
              {[
                ["Output size",     "512 × 512 px"],
                ["Color mode",      "Force grayscale"],
                ["Normalisation",   "0 – 1 float32"],
                ["Noise estimator", "Haar DWT (HH1)"],
                ["Patch size",      "45×45 → 2,200/img"],
                ["DICOM metadata",  "Auto-extracted"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center py-1.5 border-b"
                  style={{ borderColor: "var(--c-border)" }}>
                  <span className="text-xs" style={{ color: "var(--c-text3)" }}>{k}</span>
                  <span className="font-mono text-xs font-semibold" style={{ color: T }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {noiseAnalysis && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
                style={{ color: "var(--c-text)" }}>
                <Activity size={13} style={{ color: T }} /> Auto Noise Analysis
              </h3>
              <div className="space-y-1.5">
                {Object.entries(noiseAnalysis.multiscale_sigma || {}).map(([lvl, v]) => (
                  <div key={lvl} className="flex justify-between items-center py-1 border-b"
                    style={{ borderColor: "var(--c-border)" }}>
                    <span className="text-xs" style={{ color: "var(--c-text3)" }}>σ {lvl}</span>
                    <span className="font-mono text-xs font-bold" style={{ color: T }}>{v}</span>
                  </div>
                ))}
                {noiseAnalysis.sharpness && (
                  <div className="flex justify-between items-center py-1 border-b"
                    style={{ borderColor: "var(--c-border)" }}>
                    <span className="text-xs" style={{ color: "var(--c-text3)" }}>Sharpness</span>
                    <span className="font-mono text-xs font-bold" style={{ color: G }}>
                      {noiseAnalysis.sharpness}
                    </span>
                  </div>
                )}
                {noiseAnalysis.recommendation && (
                  <div className="mt-2 rounded-lg p-2 text-xs font-medium"
                    style={{ background: "var(--c-primary-l)", color: T }}>
                    Recommended: <strong>{noiseAnalysis.recommendation}</strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: drop zone + queue ─────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Drop zone — drag-and-drop only; click is handled by the button below */}
          <div
            {...getRootProps()}
            className="card p-8 sm:p-10 text-center border-2 border-dashed transition-all duration-200"
            style={{
              borderColor: isDragActive ? T : "var(--c-border2)",
              background:  isDragActive ? "var(--c-primary-l)" : "var(--c-surface)",
              cursor: "default",
            }}
          >
            {/* Dropzone's own hidden input — handles drag-and-drop file reading */}
            <input {...getInputProps()} />

            <div className="flex flex-col items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center transition-colors"
                style={{ background: isDragActive ? "var(--c-primary-l)" : "var(--c-surface3)" }}
              >
                <Upload size={28} style={{ color: T }} />
              </div>

              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--c-text)" }}>
                  {isDragActive ? "Drop CT scans here…" : "Drag & drop CT scans here"}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--c-text3)" }}>
                  or click the button below to browse your device
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--c-text3)" }}>
                  DICOM · PNG · JPG — up to 50 MB per file
                </div>
              </div>

              {/*
                KEY FIX: This button is OUTSIDE getRootProps and calls
                fileInputRef.current.click() directly on the native <input>.
                This bypasses all dropzone click-interception and browser
                security restrictions that block programmatic .click() calls
                not directly triggered by a user gesture on the input itself.
              */}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <FileImage size={14} /> Choose Files from Device
              </button>
            </div>
          </div>

          {/* File queue */}
          {files.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-sm font-semibold" style={{ color: "var(--c-text)" }}>
                  Upload Queue ({files.length})
                </h3>
                <div className="flex items-center gap-2">
                  {idleCount > 0 && (
                    <button className="btn btn-primary btn-sm" onClick={uploadAll}>
                      <Upload size={12} /> Upload All ({idleCount})
                    </button>
                  )}
                  <button
                    className="btn btn-sm"
                    style={{ color: "var(--c-danger)", borderColor: "var(--c-danger)" }}
                    onClick={() => setFiles([])}
                  >
                    <X size={12} /> Clear
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {files.map(item => (
                  <FileRow
                    key={item.id}
                    item={item}
                    onUpload={() => uploadFile(item)}
                    onRemove={() => remove(item.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Post-upload summary table */}
          {files.some(f => f.status === "done") && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"
                style={{ color: "var(--c-text)" }}>
                <Database size={13} style={{ color: G }} /> Uploaded Images
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[400px]">
                  <thead>
                    <tr className="table-head">
                      <th className="text-left py-2 px-3">File</th>
                      <th>Size</th><th>σ (noise)</th><th>Dimensions</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.filter(f => f.result).map(f => (
                      <tr key={f.id} className="table-row">
                        <td className="font-mono py-2 px-3 truncate max-w-[160px]"
                          style={{ color: T }}>{f.file.name.slice(0, 24)}</td>
                        <td>{(f.file.size / 1024).toFixed(0)} KB</td>
                        <td className="font-mono font-bold" style={{ color: T }}>
                          {f.result?.noise_sigma}
                        </td>
                        <td className="font-mono">
                          {f.result?.stats?.width}×{f.result?.stats?.height}
                        </td>
                        <td>
                          <span className="tag tag-green text-[10px]">
                            <CheckCircle size={8} /> Ready
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileRow({ item, onUpload, onRemove }) {
  const { status } = item;
  return (
    <div className={clsx(
      "flex items-center gap-3 p-3 rounded-xl border text-sm transition-colors",
      status === "done"      ? "border-green-200"  :
      status === "error"     ? "border-red-200"    :
      status === "uploading" ? "border-teal-200"   :
                               "border-slate-100"
    )} style={{
      background:
        status === "done"      ? "var(--c-secondary-l)" :
        status === "error"     ? "var(--c-danger-l)"    :
        status === "uploading" ? "var(--c-primary-l)"   :
                                 "var(--c-surface3)",
    }}>
      {/* Thumbnail or status icon */}
      {item.preview
        ? <img src={item.preview} alt=""
            className="w-10 h-10 rounded-lg object-cover border flex-shrink-0"
            style={{ borderColor: "var(--c-border)" }} />
        : <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--c-surface)" }}>
            {status === "uploading" && <Loader2     size={14} className="animate-spin" style={{ color: T }} />}
            {status === "done"      && <CheckCircle size={14} style={{ color: G }} />}
            {status === "error"     && <AlertTriangle size={14} style={{ color: "var(--c-danger)" }} />}
            {status === "idle"      && <FileImage   size={14} style={{ color: "var(--c-text3)" }} />}
          </div>
      }

      {/* File info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-xs truncate" style={{ color: "var(--c-text)" }}>
          {item.file.name}
        </div>
        <div className="text-[11px]" style={{ color: "var(--c-text3)" }}>
          {(item.file.size / 1024).toFixed(0)} KB
          {item.result && ` · σ=${item.result.noise_sigma} · ID:${item.result.id?.slice(0,8)}`}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {status === "idle"      && <button className="btn btn-primary btn-xs" onClick={onUpload}>Upload</button>}
        {status === "done"      && <span className="tag tag-green text-[10px]">Ready</span>}
        {status === "uploading" && <span className="tag tag-teal text-[10px]">Uploading…</span>}
        {status === "error"     && (
          <button className="btn btn-xs" onClick={onUpload}
            style={{ color: "var(--c-danger)", borderColor: "var(--c-danger)" }}>Retry</button>
        )}
        <button onClick={onRemove} className="p-1 rounded transition-colors hover:text-red-500"
          style={{ color: "var(--c-text3)" }}>
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

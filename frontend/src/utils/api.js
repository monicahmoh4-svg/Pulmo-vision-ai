import axios from "axios";
import toast from "react-hot-toast";

// Render backend URL — set VITE_API_URL in Vercel / Render env vars
const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, "")
  : "";

const api = axios.create({
  baseURL:          `${API_BASE}/api/v1`,
  timeout:          90000,       // 90 s — covers Render free-tier cold-start
  withCredentials:  false,
  headers: {
    "Content-Type": "application/json",
    "Accept":       "application/json",
  },
});

// ── Silence flags ─────────────────────────────────────────────────────────
// Calls that should NEVER show an error toast (background polling, health checks)
const SILENT_URLS = ["health", "ping", "aggregate/summary"];

function isSilent(url = "") {
  return SILENT_URLS.some(s => url.includes(s));
}

// ── Deduplicate toasts ────────────────────────────────────────────────────
// Track the last toast message so we don't spam the same error repeatedly
let _lastToastMsg = "";
let _lastToastAt  = 0;
function dedupeToast(msg) {
  const now = Date.now();
  if (msg === _lastToastMsg && now - _lastToastAt < 8000) return;
  _lastToastMsg = msg;
  _lastToastAt  = now;
  toast.error(msg, { duration: 5000 });
}

// ── Response interceptor ──────────────────────────────────────────────────
api.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url || "";

    // Never toast for background/silent endpoints
    if (isSilent(url)) return Promise.reject(err);

    if (err.code === "ERR_NETWORK" || err.code === "ECONNABORTED") {
      // Network error — likely Render cold-start or no internet
      // Show once, not on every retry
      dedupeToast(
        err.code === "ECONNABORTED"
          ? "Request timed out — Render may be cold-starting (wait 30 s)"
          : "Network error — check your connection"
      );
    } else {
      const status = err.response?.status;
      // Don't toast 401/403 (handled by auth), 404 is usually expected
      if (status === 401 || status === 403 || status === 404) {
        return Promise.reject(err);
      }
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "An error occurred";
      dedupeToast(msg);
    }

    return Promise.reject(err);
  }
);

// ── Health ────────────────────────────────────────────────────────────────
export const apiHealth = () => api.get("/health");
export const apiPing   = () => api.get("/health/ping");

// ── Ingest ────────────────────────────────────────────────────────────────
export const apiUploadImage = (file, patientId = "", diagnosis = "unknown") => {
  const form = new FormData();
  form.append("file", file);
  if (patientId) form.append("patient_id", patientId);
  if (diagnosis) form.append("diagnosis",  diagnosis);
  return api.post("/ingest", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
  });
};

export const apiListImages  = (limit = 50, offset = 0) =>
  api.get(`/images?limit=${limit}&offset=${offset}`);
export const apiGetImage    = (id) => api.get(`/images/${id}`);
export const apiDeleteImage = (id) => api.delete(`/images/${id}`);

// ── Denoising ─────────────────────────────────────────────────────────────
export const apiDenoiseImage = (payload) =>
  api.post("/denoise", payload, { timeout: 120000 });

export const apiPreview = (noisePct = 30, sigma = 0.15, threshold = 0.05, method = "bayesshrink") =>
  api.post(
    `/denoise/preview?noise_pct=${noisePct}&sigma=${sigma}&threshold=${threshold}&threshold_method=${method}`
  );

export const apiDownloadDenoised = (imageId) =>
  `${API_BASE}/api/v1/denoise/${imageId}/download`;

// ── Metrics ───────────────────────────────────────────────────────────────
export const apiGetMetrics       = (id) => api.get(`/metrics/${id}`);
export const apiAggregateMetrics = ()   => api.get("/metrics/aggregate/summary");

// ── Batch ─────────────────────────────────────────────────────────────────
export const apiStartBatch = (payload) => api.post("/batch", payload);
export const apiGetBatch   = (jobId)   => api.get(`/batch/${jobId}`);

// ── Dataset ───────────────────────────────────────────────────────────────
export const apiDatasetInfo = () => api.get("/dataset/info");
export const apiPsnrTable   = () => api.get("/dataset/psnr-table");
export const apiSsimTable   = () => api.get("/dataset/ssim-table");
export const apiMseTable    = () => api.get("/dataset/mse-table");

// ── Enhancement ───────────────────────────────────────────────────────────
export const apiEnhance       = (payload) => api.post("/enhance", payload, { timeout: 120000 });
export const apiNoiseAnalysis = (id)      => api.get(`/enhance/noise-analysis/${id}`);

export default api;

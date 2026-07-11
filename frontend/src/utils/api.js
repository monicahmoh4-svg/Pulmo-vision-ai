import axios from "axios";
import toast from "react-hot-toast";

/**
 * API base URL resolution — in order of priority:
 *
 * 1. import.meta.env.VITE_API_URL  (set in vercel.json env section or
 *                                    Vercel dashboard → Settings → Env Vars)
 * 2. window.__API_URL__            (runtime injection fallback)
 * 3. Hard-coded Render URL         (last resort so app always works)
 *
 * VITE_ prefix is required for Vite to embed the value at build time.
 * Without it the variable is undefined in the browser bundle.
 */
const VITE_URL    = import.meta.env.VITE_API_URL;
const RUNTIME_URL = typeof window !== "undefined" ? window.__API_URL__ : undefined;
const FALLBACK    = "https://pulmo-vision-ai.onrender.com";

const API_BASE = (VITE_URL || RUNTIME_URL || FALLBACK).replace(/\/$/, "");

// Log resolved URL during development
if (import.meta.env.DEV) {
  console.log("[API] Base URL:", API_BASE,
    VITE_URL ? "(from VITE_API_URL)" :
    RUNTIME_URL ? "(from window.__API_URL__)" : "(fallback hardcoded)");
}

const api = axios.create({
  baseURL:         `${API_BASE}/api/v1`,
  timeout:         60000,        // 60 s
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    "Accept":       "application/json",
  },
});

// ── Silent endpoints (never show error toasts) ────────────────────────────
const SILENT = ["health", "ping", "aggregate/summary", "dataset/info",
                "dataset/psnr", "dataset/ssim", "dataset/mse"];
const isSilent = (url = "") => SILENT.some(s => url.includes(s));

// ── Toast deduplication ───────────────────────────────────────────────────
let _lastMsg = ""; let _lastAt = 0;
function dedupeToast(msg) {
  const now = Date.now();
  if (msg === _lastMsg && now - _lastAt < 8000) return;
  _lastMsg = msg; _lastAt = now;
  toast.error(msg, { duration: 5000 });
}

// ── Response interceptor ──────────────────────────────────────────────────
api.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url || "";
    if (isSilent(url)) return Promise.reject(err);

    if (err.code === "ERR_NETWORK") {
      dedupeToast("Network error — backend may be cold-starting, retrying…");
    } else if (err.code === "ECONNABORTED") {
      dedupeToast("Request timed out — Render cold-start takes ~30 s, please wait");
    } else {
      const status = err.response?.status;
      if (status === 401 || status === 403 || status === 404) return Promise.reject(err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message || "An error occurred";
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

export const apiPreview = (
  noisePct = 30, sigma = 0.15, threshold = 0.05, method = "bayesshrink"
) => api.post(
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
export const apiEnhance       = (payload) =>
  api.post("/enhance", payload, { timeout: 120000 });
export const apiNoiseAnalysis = (id) =>
  api.get(`/enhance/noise-analysis/${id}`);

export default api;

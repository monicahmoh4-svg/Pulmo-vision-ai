import axios from "axios";
import toast from "react-hot-toast";

// Render backend URL — set VITE_API_URL in Vercel / Render env vars
// e.g. VITE_API_URL=https://your-backend.onrender.com
const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, "")
  : "";

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  timeout: 90000,           // 90 s — covers Render free-tier cold-start
  withCredentials: false,   // no cookies → CORS is simpler
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// ── Response interceptor ────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isHealthCheck = err.config?.url?.includes("health");
    if (err.code === "ERR_NETWORK" || err.code === "ECONNABORTED") {
      if (!isHealthCheck) {
        toast.error(
          `Cannot reach API server.\n` +
          `Check VITE_API_URL = ${API_BASE || "(empty — set in env vars)"}`
        );
      }
    } else {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "An error occurred";
      if (!isHealthCheck) {
        toast.error(msg);
      }
    }
    return Promise.reject(err);
  }
);

// ── Health ──────────────────────────────────────────────────────────────────
export const apiHealth = () => api.get("/health");
export const apiPing   = () => api.get("/health/ping");

// ── Ingest ──────────────────────────────────────────────────────────────────
export const apiUploadImage = (file, patientId = "", diagnosis = "unknown") => {
  const form = new FormData();
  form.append("file", file);
  if (patientId)  form.append("patient_id", patientId);
  if (diagnosis)  form.append("diagnosis",  diagnosis);
  return api.post("/ingest", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
  });
};

export const apiListImages  = (limit = 50, offset = 0) =>
  api.get(`/images?limit=${limit}&offset=${offset}`);
export const apiGetImage    = (id) => api.get(`/images/${id}`);
export const apiDeleteImage = (id) => api.delete(`/images/${id}`);

// ── Denoising ───────────────────────────────────────────────────────────────
export const apiDenoiseImage = (payload) =>
  api.post("/denoise", payload, { timeout: 120000 });

export const apiPreview = (noisePct = 30, sigma = 0.15, threshold = 0.05, method = "bayesshrink") =>
  api.post(
    `/denoise/preview?noise_pct=${noisePct}&sigma=${sigma}&threshold=${threshold}&threshold_method=${method}`
  );

export const apiDownloadDenoised = (imageId) =>
  `${API_BASE}/api/v1/denoise/${imageId}/download`;

// ── Metrics ─────────────────────────────────────────────────────────────────
export const apiGetMetrics       = (id) => api.get(`/metrics/${id}`);
export const apiAggregateMetrics = ()   => api.get("/metrics/aggregate/summary");

// ── Batch ───────────────────────────────────────────────────────────────────
export const apiStartBatch  = (payload) => api.post("/batch", payload);
export const apiGetBatch    = (jobId)   => api.get(`/batch/${jobId}`);

// ── Dataset ─────────────────────────────────────────────────────────────────
export const apiDatasetInfo = () => api.get("/dataset/info");
export const apiPsnrTable   = () => api.get("/dataset/psnr-table");
export const apiSsimTable   = () => api.get("/dataset/ssim-table");
export const apiMseTable    = () => api.get("/dataset/mse-table");

// ── Enhancement ─────────────────────────────────────────────────────────────
export const apiEnhance       = (payload) => api.post("/enhance", payload, { timeout: 120000 });
export const apiNoiseAnalysis = (id)      => api.get(`/enhance/noise-analysis/${id}`);

export default api;

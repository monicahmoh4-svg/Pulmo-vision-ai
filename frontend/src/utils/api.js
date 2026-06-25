import axios from "axios";
import toast from "react-hot-toast";

// Render backend URL — set VITE_API_URL in Vercel env vars
const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, "")   // strip trailing slash
  : "";

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  timeout: 90000,                    // 90 s — Render free tier cold-starts
  withCredentials: false,            // no cookies → CORS simpler
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

// ── Response interceptor ────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.code === "ERR_NETWORK" || err.code === "ECONNABORTED") {
      // Don't fire toast on every health-check retry
      if (!err.config?.url?.includes("health")) {
        toast.error(
          `Cannot reach API server.\n` +
          `Check VITE_API_URL = ${API_BASE || "(empty — set in Vercel env vars)"}`
        );
      }
    } else {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "An error occurred";
      if (!err.config?.url?.includes("health")) {
        toast.error(msg);
      }
    }
    return Promise.reject(err);
  }
);

// ── API methods ─────────────────────────────────────────────────────────────
export const apiHealth = () => api.get("/health");
export const apiPing   = () => api.get("/health/ping");

export const apiUploadImage = (file, patientId = "", diagnosis = "unknown") => {
  const form = new FormData();
  form.append("file", file);
  form.append("patient_id", patientId);
  form.append("diagnosis", diagnosis);
  return api.post("/ingest", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
  });
};

export const apiDenoiseImage   = (payload) => api.post("/denoise", payload, { timeout: 120000 });
export const apiPreview        = (noisePct, sigma, threshold, method = "bayesshrink") =>
  api.post(`/denoise/preview?noise_pct=${noisePct}&sigma=${sigma}&threshold=${threshold}&threshold_method=${method}`);

export const apiGetMetrics       = (id) => api.get(`/metrics/${id}`);
export const apiAggregateMetrics = ()   => api.get("/metrics/aggregate/summary");

export const apiListImages  = (limit = 50, offset = 0) => api.get(`/images?limit=${limit}&offset=${offset}`);
export const apiGetImage    = (id)     => api.get(`/images/${id}`);
export const apiDeleteImage = (id)     => api.delete(`/images/${id}`);

export const apiStartBatch = (payload) => api.post("/batch", payload);
export const apiGetBatch   = (jobId)   => api.get(`/batch/${jobId}`);

export const apiDatasetInfo = () => api.get("/dataset/info");
export const apiPsnrTable   = () => api.get("/dataset/psnr-table");
export const apiSsimTable   = () => api.get("/dataset/ssim-table");
export const apiMseTable    = () => api.get("/dataset/mse-table");

export const apiEnhance       = (payload) => api.post("/enhance", payload, { timeout: 120000 });
export const apiNoiseAnalysis = (id)      => api.get(`/enhance/noise-analysis/${id}`);

export default api;

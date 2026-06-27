import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { Toaster } from "react-hot-toast";

import "./index.css";

import Layout        from "./components/Layout";
import InstallBanner from "./components/InstallBanner";

// Lazy-loaded pages — keeps initial bundle small
const Dashboard    = React.lazy(() => import("./pages/Dashboard"));
const Ingest       = React.lazy(() => import("./pages/Ingest"));
const Denoise      = React.lazy(() => import("./pages/Denoise"));
const Evaluation   = React.lazy(() => import("./pages/Evaluation"));
const Radiologist  = React.lazy(() => import("./pages/RadiologistView"));
const Batch        = React.lazy(() => import("./pages/BatchProcessing"));
const Dataset      = React.lazy(() => import("./pages/Dataset"));
const Architecture = React.lazy(() => import("./pages/Architecture"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           30_000,
      cacheTime:           300_000,
      refetchOnWindowFocus: false,
      retry:               1,
    },
  },
});

function Spinner() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "var(--c-surface2)",
    }}>
      <div style={{
        width: 36, height: 36,
        border: "3px solid #e2e8ec",
        borderTopColor: "#0d7377",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <React.Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index                element={<Dashboard    />} />
              <Route path="ingest"        element={<Ingest       />} />
              <Route path="denoise"       element={<Denoise      />} />
              <Route path="evaluation"    element={<Evaluation   />} />
              <Route path="radiologist"   element={<Radiologist  />} />
              <Route path="batch"         element={<Batch        />} />
              <Route path="dataset"       element={<Dataset      />} />
              <Route path="architecture"  element={<Architecture />} />
            </Route>
          </Routes>
        </React.Suspense>

        {/* PWA install banner — floats above all pages */}
        <InstallBanner />

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background:   "#fff",
              color:        "#0f2027",
              fontSize:     "12px",
              fontWeight:   500,
              border:       "1px solid #e2e8ec",
              borderRadius: "12px",
              boxShadow:    "0 4px 16px rgba(13,115,119,.12)",
            },
            success: { iconTheme: { primary: "#2d8c5c", secondary: "#fff" } },
            error:   { iconTheme: { primary: "#c0392b", secondary: "#fff" } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

// Hide splash screen after React first paint
requestAnimationFrame(() => {
  setTimeout(() => {
    if (window.__hideSplash) window.__hideSplash();
  }, 300);
});

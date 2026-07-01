import { useEffect, useState } from "react";

/**
 * PageHeader
 * Animated page title with gradient text, animated underline, floating icon.
 * Usage: <PageHeader icon="🫁" title="Page Title" subtitle="Description" actions={<button>…</button>} />
 */
export default function PageHeader({ title, subtitle, icon, actions }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="mb-5"
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? "none" : "translateY(14px)",
        transition: "all 0.45s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            {icon && (
              <span className="text-2xl animate-float flex-shrink-0">{icon}</span>
            )}
            <h2
              className="text-xl font-bold truncate"
              style={{
                background:             "linear-gradient(135deg, var(--c-text) 0%, var(--c-primary) 100%)",
                WebkitBackgroundClip:   "text",
                WebkitTextFillColor:    "transparent",
                backgroundClip:         "text",
              }}
            >
              {title}
            </h2>
          </div>

          {subtitle && (
            <p
              className="text-xs"
              style={{
                color:      "var(--c-text3)",
                opacity:    visible ? 1 : 0,
                transform:  visible ? "none" : "translateY(6px)",
                transition: "all 0.4s ease 150ms",
              }}
            >
              {subtitle}
            </p>
          )}

          {/* Animated gradient underline */}
          <div
            style={{
              height:     2,
              borderRadius: 99,
              marginTop:  6,
              width:      visible ? "100%" : "0%",
              background: "linear-gradient(90deg, var(--c-primary), var(--c-secondary))",
              transition: "width 0.7s ease 100ms",
            }}
          />
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0 animate-fade-left">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

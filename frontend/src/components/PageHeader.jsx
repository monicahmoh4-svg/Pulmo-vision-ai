import { useEffect, useState } from "react";

/**
 * PageHeader — animated title block used at the top of every page.
 * Fades in with a staggered subtitle and gradient underline.
 */
export default function PageHeader({ title, subtitle, icon, actions }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  return (
    <div
      className={`mb-5 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionTimingFunction: "var(--ease-spring)" }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            {icon && (
              <span className="text-2xl animate-float" style={{ animationDelay: "200ms" }}>
                {icon}
              </span>
            )}
            <h2
              className="text-xl font-bold"
              style={{
                color: "var(--c-text)",
                background: "linear-gradient(135deg, var(--c-text) 0%, var(--c-primary) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {title}
            </h2>
          </div>
          {subtitle && (
            <p
              className="text-xs"
              style={{
                color: "var(--c-text3)",
                opacity: visible ? 1 : 0,
                transform: visible ? "none" : "translateY(6px)",
                transition: "all 0.4s var(--ease-smooth) 150ms",
              }}
            >
              {subtitle}
            </p>
          )}
          {/* Animated gradient underline */}
          <div
            style={{
              height: 2,
              width:  visible ? "100%" : "0%",
              background: "linear-gradient(90deg, var(--c-primary), var(--c-secondary))",
              borderRadius: 99,
              marginTop: 6,
              transition: "width 0.7s var(--ease-smooth) 100ms",
            }}
          />
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-wrap animate-fade-left">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

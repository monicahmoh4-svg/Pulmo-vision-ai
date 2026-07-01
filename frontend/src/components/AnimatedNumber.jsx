import { useEffect, useRef, useState } from "react";

/**
 * AnimatedNumber
 * Counts from 0 to `value` using requestAnimationFrame with ease-out cubic.
 * Safe to use anywhere — no external dependencies.
 */
export default function AnimatedNumber({
  value,
  duration  = 1200,
  decimals  = 2,
  suffix    = "",
  prefix    = "",
  style     = {},
  className = "",
}) {
  const [display, setDisplay] = useState(0);
  const rafRef   = useRef(null);
  const startRef = useRef(null);
  const fromRef  = useRef(0);

  useEffect(() => {
    const target = Number(value);
    if (isNaN(target)) return;
    const from = fromRef.current;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (target - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        fromRef.current  = target;
        startRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  return (
    <span className={`metric-value ${className}`} style={style}>
      {prefix}{Number(display).toFixed(decimals)}{suffix}
    </span>
  );
}

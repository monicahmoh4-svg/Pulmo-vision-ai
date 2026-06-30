import { useEffect, useRef, useState } from "react";

/**
 * AnimatedNumber
 * Counts from 0 (or prevValue) to `value` over `duration` ms.
 * Professional "odometer" effect for metric cards.
 */
export default function AnimatedNumber({
  value,
  duration = 1200,
  decimals = 2,
  suffix   = "",
  prefix   = "",
  style    = {},
  className = "",
}) {
  const [display, setDisplay] = useState(0);
  const rafRef    = useRef(null);
  const startRef  = useRef(null);
  const fromRef   = useRef(0);

  useEffect(() => {
    if (value == null || isNaN(Number(value))) return;
    const target = Number(value);
    const from   = fromRef.current;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed  = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (target - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        fromRef.current = target;
        startRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  const formatted = Number(display).toFixed(decimals);

  return (
    <span className={`metric-value ${className}`} style={style}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

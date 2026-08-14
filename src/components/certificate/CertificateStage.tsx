'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** useLayoutEffect warns during SSR; fall back to useEffect on the server pass. */
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Scales a fixed-size certificate down to fit the available width while keeping
 * the layout pixel-identical to print output.
 *
 * Before measurement (server render, or if JS never runs) the artwork is shown
 * at full size in a horizontally scrollable box — so a public verification page
 * is never blank. Measuring in a layout effect means the correct scale is applied
 * before the first paint after hydration, so there is no visible reflow.
 */
export default function CertificateStage({
  width,
  height,
  children,
  maxScale = 1,
  className = '',
}: {
  width: number;
  height: number;
  children: React.ReactNode;
  maxScale?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(Math.min(maxScale, w / width));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, maxScale]);

  const measured = scale !== null;

  return (
    <div
      ref={ref}
      className={className}
      style={{ width: '100%', overflowX: measured ? 'hidden' : 'auto', overflowY: 'hidden' }}
    >
      <div style={{ height: measured ? height * scale : height, position: 'relative' }}>
        <div
          style={{
            transform: measured ? `scale(${scale})` : undefined,
            transformOrigin: 'top left',
            width,
            height,
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

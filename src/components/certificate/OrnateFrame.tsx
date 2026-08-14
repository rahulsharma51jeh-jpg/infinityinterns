import type { TemplateConfig } from '@/lib/template';

/**
 * The decorative border, drawn as a single SVG sized to the page so it scales
 * cleanly at any zoom and prints crisply. Colours come from the template.
 */
export default function OrnateFrame({
  frame,
  width,
  height,
  uid,
}: {
  frame: TemplateConfig['frame'];
  width: number;
  height: number;
  uid: string;
}) {
  if (frame.style === 'none') return null;

  const { colorA, colorB, colorAccent, thickness: t, inset: m } = frame;
  const gradId = `g-${uid}`;
  const chevId = `c-${uid}`;

  if (frame.style === 'minimal') {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={svgStyle} aria-hidden>
        <rect x={m} y={m} width={width - m * 2} height={height - m * 2} fill="none" stroke={colorB} strokeWidth={2} />
      </svg>
    );
  }

  if (frame.style === 'double-line') {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={svgStyle} aria-hidden>
        <rect x={m} y={m} width={width - m * 2} height={height - m * 2} fill="none" stroke={colorB} strokeWidth={5} />
        <rect
          x={m + 11}
          y={m + 11}
          width={width - (m + 11) * 2}
          height={height - (m + 11) * 2}
          fill="none"
          stroke={colorAccent}
          strokeWidth={1.6}
        />
      </svg>
    );
  }

  /* ---------------- ornate-gold ---------------- */
  const ox = m; // outer edge of the gold band
  const oy = m;
  const ow = width - m * 2;
  const oh = height - m * 2;

  // The band is split by a thin white stripe, mirroring the printed artwork.
  const hair = 3; // outer hairline thickness
  const gap = 3.5; // white stripe
  const band = t - hair - gap; // inner solid band

  const bx = ox + hair + gap;
  const by = oy + hair + gap;
  const bw = ow - (hair + gap) * 2;
  const bh = oh - (hair + gap) * 2;

  const ix = bx + band; // inner content boundary
  const iy = by + band;
  const iw = bw - band * 2;
  const ih = bh - band * 2;

  const wedge = t * 1.7; // corner accent reach

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={svgStyle} aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colorB} />
          <stop offset="18%" stopColor={colorA} />
          <stop offset="38%" stopColor={colorB} />
          <stop offset="55%" stopColor={colorA} />
          <stop offset="74%" stopColor={colorB} />
          <stop offset="100%" stopColor={colorA} />
        </linearGradient>

        {/* chevron texture running along the band */}
        <pattern id={chevId} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="14" height="14" fill="none" />
          <path d="M0 3 h14 M0 10 h14" stroke={colorAccent} strokeWidth="1.5" opacity="0.42" />
        </pattern>
      </defs>

      {/* outer hairline */}
      <rect
        x={ox + hair / 2}
        y={oy + hair / 2}
        width={ow - hair}
        height={oh - hair}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={hair}
      />

      {/* main band + chevron texture, painted as a stroked rect on the band centreline */}
      <g>
        <rect
          x={bx + band / 2}
          y={by + band / 2}
          width={bw - band}
          height={bh - band}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={band}
        />
        <rect
          x={bx + band / 2}
          y={by + band / 2}
          width={bw - band}
          height={bh - band}
          fill="none"
          stroke={`url(#${chevId})`}
          strokeWidth={band}
        />
      </g>

      {/* corner wedges pointing inward */}
      <g fill={colorAccent} opacity="0.8">
        <path d={`M${bx} ${by} L${bx + wedge} ${by} L${bx} ${by + wedge} Z`} />
        <path d={`M${bx + bw} ${by} L${bx + bw - wedge} ${by} L${bx + bw} ${by + wedge} Z`} />
        <path d={`M${bx} ${by + bh} L${bx + wedge} ${by + bh} L${bx} ${by + bh - wedge} Z`} />
        <path d={`M${bx + bw} ${by + bh} L${bx + bw - wedge} ${by + bh} L${bx + bw} ${by + bh - wedge} Z`} />
      </g>

      {/* mid-edge notches */}
      <g fill={colorAccent} opacity="0.85">
        <path d={`M${ox + ow / 2 - t * 0.7} ${by} L${ox + ow / 2 + t * 0.7} ${by} L${ox + ow / 2} ${by + band} Z`} />
        <path
          d={`M${ox + ow / 2 - t * 0.7} ${by + bh} L${ox + ow / 2 + t * 0.7} ${by + bh} L${ox + ow / 2} ${by + bh - band} Z`}
        />
        <path d={`M${bx} ${oy + oh / 2 - t * 0.7} L${bx} ${oy + oh / 2 + t * 0.7} L${bx + band} ${oy + oh / 2} Z`} />
        <path
          d={`M${bx + bw} ${oy + oh / 2 - t * 0.7} L${bx + bw} ${oy + oh / 2 + t * 0.7} L${bx + bw - band} ${oy + oh / 2} Z`}
        />
      </g>

      {/* inner hairline against the content area */}
      <rect x={ix} y={iy} width={iw} height={ih} fill="none" stroke={colorAccent} strokeWidth={1.4} opacity="0.75" />
    </svg>
  );
}

const svgStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
};

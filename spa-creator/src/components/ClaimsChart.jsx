const W = 720, H = 200;
const PAD = { top: 10, right: 12, bottom: 28, left: 48 };
const COLORS = { claimed: '#f97316', paid: '#0d9488' };
const KEYS   = ['claimed', 'paid'];
const BAR_W  = 14;
const OFFSETS = [-(BAR_W / 2 + 2), BAR_W / 2 + 2];

function niceMax(data) {
  const peak = Math.max(...data.map(d => Math.max(d.claimed ?? 0, d.paid ?? 0)), 10);
  const mag   = Math.pow(10, Math.floor(Math.log10(peak)));
  return Math.ceil(peak / mag) * mag;
}

export default function ClaimsChart({ data = [] }) {
  if (!data.length) return null;

  const max  = niceMax(data);
  const step = max / 4;
  const gridLines = [0, step, step * 2, step * 3, max];
  const cW   = W - PAD.left - PAD.right;
  const cH   = H - PAD.top  - PAD.bottom;
  const gW   = cW / data.length;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', display: 'block' }}
      aria-label="Claims vs Payments trend bar chart"
    >
      {gridLines.map(v => {
        const y = PAD.top + cH - (v / max) * cH;
        return (
          <g key={v}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
              {v >= 1000 ? `${v / 1000}K` : v}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const cx = PAD.left + i * gW + gW / 2;
        return (
          <g key={d.month}>
            {KEYS.map((k, ki) => {
              const val  = d[k] ?? 0;
              const barH = Math.max(val > 0 ? 2 : 0, (val / max) * cH);
              const x    = cx + OFFSETS[ki] - BAR_W / 2;
              const y    = PAD.top + cH - barH;
              return (
                <rect key={k} x={x} y={y} width={BAR_W} height={barH} fill={COLORS[k]} rx="2" opacity="0.9">
                  <title>{d.month} {k}: {val}K</title>
                </rect>
              );
            })}
            <text x={cx} y={H - 6} textAnchor="middle" fontSize="10" fill="#9ca3af">{d.month}</text>
          </g>
        );
      })}
    </svg>
  );
}

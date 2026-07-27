interface Point {
  label: string;
  value: number;
}

interface Props {
  data: Point[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
}

/** Theme-aware area/line trend chart with an emphasized endpoint and a faint fill. */
export function AreaChart({ data, height = 180, color = "var(--color-brand-600)", formatValue }: Props) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-text-secondary">No data to chart.</p>;
  }

  const width = Math.max(320, data.length * 40);
  const pad = { top: 12, right: 12, bottom: 22, left: 12 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);

  const x = (i: number) => pad.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${x(data.length - 1).toFixed(1)} ${(pad.top + innerH).toFixed(1)} L ${x(0).toFixed(1)} ${(pad.top + innerH).toFixed(1)} Z`;
  const last = data[data.length - 1]!;

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend chart">
        <path d={areaPath} fill={color} opacity={0.12} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(data.length - 1)} cy={y(last.value)} r={3.5} fill={color} />
        {data.map((d, i) =>
          i % Math.ceil(data.length / 8) === 0 || i === data.length - 1 ? (
            <text key={d.label} x={x(i)} y={height - 6} textAnchor="middle" className="fill-text-secondary" style={{ fontSize: 9 }}>
              {d.label.slice(5)}
            </text>
          ) : null,
        )}
        <title>{formatValue ? formatValue(last.value) : String(last.value)}</title>
      </svg>
    </div>
  );
}

import { colorAt } from "./palette";

export interface DonutSlice {
  label: string;
  value: number;
}

interface Props {
  data: DonutSlice[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
  formatValue?: (v: number) => string;
}

/** A theme-aware donut with an inline legend. Values ≤ 0 are ignored. */
export function DonutChart({ data, size = 160, centerLabel, centerValue, formatValue }: Props) {
  const slices = data.filter((d) => d.value > 0);
  const total = slices.reduce((s, d) => s + d.value, 0);
  const radius = size / 2;
  const stroke = size * 0.16;
  const r = radius - stroke / 2;
  const circumference = 2 * Math.PI * r;

  if (total === 0) {
    return <p className="py-8 text-center text-sm text-text-secondary">No data to chart.</p>;
  }

  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Donut chart">
        <g transform={`rotate(-90 ${radius} ${radius})`}>
          {slices.map((slice, i) => {
            const fraction = slice.value / total;
            const dash = fraction * circumference;
            const el = (
              <circle
                key={slice.label}
                cx={radius}
                cy={radius}
                r={r}
                fill="none"
                stroke={colorAt(i)}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return el;
          })}
        </g>
        {centerValue ? (
          <text x={radius} y={radius - 2} textAnchor="middle" className="fill-text-primary" style={{ fontSize: size * 0.14, fontWeight: 600 }}>
            {centerValue}
          </text>
        ) : null}
        {centerLabel ? (
          <text x={radius} y={radius + size * 0.12} textAnchor="middle" className="fill-text-secondary" style={{ fontSize: size * 0.075 }}>
            {centerLabel}
          </text>
        ) : null}
      </svg>
      <ul className="flex flex-col gap-1.5">
        {slices.map((slice, i) => (
          <li key={slice.label} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 rounded-sm" style={{ background: colorAt(i) }} />
            <span className="text-text-primary">{slice.label}</span>
            <span className="text-text-secondary">
              {formatValue ? formatValue(slice.value) : slice.value} · {Math.round((slice.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

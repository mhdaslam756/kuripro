interface BarDatum {
  label: string;
  value: number;
}

interface Props {
  data: BarDatum[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
}

/** Simple theme-aware vertical bar chart with value labels on hover (title) and axis labels. */
export function BarChart({ data, height = 180, color = "var(--color-brand-600)", formatValue }: Props) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-text-secondary">No data to chart.</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  const barGap = 8;

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end gap-2" style={{ height, minWidth: data.length * 44 }}>
        {data.map((d) => {
          const h = Math.max(2, (d.value / max) * (height - 28));
          return (
            <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1" style={{ gap: barGap }}>
              <span className="text-[10px] tabular-nums text-text-secondary">
                {formatValue ? formatValue(d.value) : d.value}
              </span>
              <div
                className="w-full max-w-10 rounded-t-sm transition-all"
                style={{ height: h, background: color }}
                title={`${d.label}: ${formatValue ? formatValue(d.value) : d.value}`}
              />
              <span className="max-w-14 truncate text-[10px] text-text-secondary" title={d.label}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

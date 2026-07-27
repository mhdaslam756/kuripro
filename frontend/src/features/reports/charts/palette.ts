/**
 * Categorical chart palette built from the design-system tokens, so charts stay theme-aware
 * (the CSS variables re-resolve in light/dark) and consistent with the rest of the product.
 */
export const CHART_COLORS = [
  "var(--color-brand-600)",
  "var(--color-info-fg)",
  "var(--color-good-fg)",
  "var(--color-warn-fg)",
  "var(--color-bad-fg)",
  "var(--color-brand-300)",
  "var(--color-brand-800)",
];

export function colorAt(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]!;
}

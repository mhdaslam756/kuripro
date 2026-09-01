export const CHART_COLORS = [
  "#8B5CF6", // Bright Purple
  "#A855F7", // Accent Purple
  "#6D28D9", // Primary Purple
  "#22C55E", // Success / Paid Green
  "#F59E0B", // Pending Amber
  "#EF4444", // Error / Unpaid Red
  "#3B82F6", // Info Blue
  "#C4B5FD", // Light Purple
];

export function colorAt(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]!;
}

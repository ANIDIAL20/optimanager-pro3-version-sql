export function formatOpticalValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = parseFloat(value.toString());
  if (isNaN(num)) return '—';
  if (num === 0) return 'Plan';
  return num > 0 ? `+${num.toFixed(2)}` : `${num.toFixed(2)}`;
}

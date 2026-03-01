/**
 * Format a number as Moroccan Dirham using fr-MA locale.
 * Output: "2 156,00 DH" (space thousands separator, comma decimal)
 */
export function formatMAD(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return '0,00 DH';
  return (
    new Intl.NumberFormat('fr-MA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num) + ' DH'
  );
}

/**
 * Currency and Number Formatting Utility for NAIO PARTNER
 * Enforces Indian Rupee (₹) and Indian Numbering System (en-IN).
 */

export async function getCurrencySymbol(): Promise<string> {
  return '₹';
}

export function formatRupees(amount: number, includeDecimals = false): string {
  const rounded = Math.round((amount || 0) * 100) / 100;
  const formattedNumber = rounded.toLocaleString('en-IN', {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });

  return `₹${formattedNumber}`;
}

export function formatIndianNumber(num: number): string {
  return (num || 0).toLocaleString('en-IN');
}

export function formatCurrencyCents(cents: number): string {
  return formatRupees(cents / 100, true);
}

export function formatCurrency(cents: number, symbol = '₹'): string {
  const amount = cents / 100;
  return `${symbol}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export async function formatAmount(cents: number): Promise<string> {
  return formatCurrencyCents(cents);
}

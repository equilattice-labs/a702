// Presentation only: transaction inputs retain their original decimal strings.
export function amountText(amount) {
  const value = Number(amount || 0);
  return value > 0 && value < 0.00001
    ? "<0.00001"
    : value.toLocaleString("en-US", { maximumFractionDigits: 5 });
}

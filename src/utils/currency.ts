export const COMMON_CURRENCIES: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", INR: "₹", JPY: "¥", CNY: "¥",
  AUD: "A$", CAD: "C$", CHF: "Fr", SGD: "S$", THB: "฿", AED: "د.إ",
};

export function formatAmount(amount: number | { toNumber(): number }, currencyCode: string): string {
  const num = typeof amount === "number" ? amount : amount.toNumber();
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

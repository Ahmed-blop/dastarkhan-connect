export const PRICE_LABEL: Record<string, string> = {
  budget: "₨",
  mid: "₨₨",
  premium: "₨₨₨",
  luxury: "₨₨₨₨",
};

export function formatPrice(p: number | null | undefined) {
  if (p == null) return "";
  return `Rs ${Math.round(p).toLocaleString()}`;
}

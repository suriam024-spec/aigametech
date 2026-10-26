export const formatPrice = (price: number) =>
  price === 0 ? "ฟรี" : `฿${price.toLocaleString("th-TH")}`;

export const formatDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
};
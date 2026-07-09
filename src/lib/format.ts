export function money(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("ar-DZ", {
    style: "currency",
    currency: "DZD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function dateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleString("ar-DZ", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function num(value: number | null | undefined): string {
  return new Intl.NumberFormat("ar-DZ").format(Number(value ?? 0));
}

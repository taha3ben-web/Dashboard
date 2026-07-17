export function money(
  value: number | string | null | undefined,
  currency = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "DZD",
): string {
  const n = Number(value ?? 0);
  try {
    return new Intl.NumberFormat("ar-DZ", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${new Intl.NumberFormat("ar-DZ", { maximumFractionDigits: 2 }).format(n)} ${currency}`;
  }
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

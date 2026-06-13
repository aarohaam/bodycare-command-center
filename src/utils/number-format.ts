export const number = (value: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value || 0);

export const compact = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value || 0);

export const percent = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "percent", maximumFractionDigits: 0 }).format(value);

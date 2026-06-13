import type { GenCodeProduct, ProductRow, TrendScore } from "../types";
import { historicalSalesTotal, recentSalesUnits } from "./decision-engine";

export interface SizeStockSummary {
  size: string;
  skuCount: number;
  totalStock: number;
  currentStock: number;
  tronicaStock: number;
}

export interface ColorImageGroup {
  id: string;
  label: string;
  representativeSku: string;
  representativeStock: number;
  colors: string[];
  hasAssortedRows: boolean;
  imageUrls: string[];
  skuCount: number;
  totalStock: number;
  currentStock: number;
  tronicaStock: number;
  historicalSales: number;
  recentSales: number;
  sizes: SizeStockSummary[];
}

const assortedPattern = /^assorted$/i;

export const isAssortedColor = (color: string) => assortedPattern.test(color.trim());

const cleanColor = (color: string) => color.trim() || "Unmapped color";

const sizeSortValue = (size: string) => {
  const value = Number(size);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
};

const firstImageUrl = (row: ProductRow) => row.imageUrls[0] || "";

export const buildColorImageGroups = (product: GenCodeProduct): ColorImageGroup[] => {
  const groups = new Map<
    string,
    {
      colors: Set<string>;
      hasAssortedRows: boolean;
      imageUrls: Set<string>;
      skuCount: number;
      totalStock: number;
      currentStock: number;
      tronicaStock: number;
      historicalSales: number;
      recentSales: number;
      representativeSku: string;
      representativeStock: number;
      sizes: Map<string, SizeStockSummary>;
    }
  >();

  product.variants.forEach((row) => {
    const imageUrl = firstImageUrl(row);
    const color = cleanColor(row.color);
    const key = imageUrl || `missing:${color.toLowerCase()}`;
    const existing =
      groups.get(key) ||
      {
        colors: new Set<string>(),
        hasAssortedRows: false,
        imageUrls: new Set<string>(),
        skuCount: 0,
        totalStock: 0,
        currentStock: 0,
        tronicaStock: 0,
        historicalSales: 0,
        recentSales: 0,
        representativeSku: "",
        representativeStock: -1,
        sizes: new Map<string, SizeStockSummary>(),
      };

    if (isAssortedColor(color)) {
      existing.hasAssortedRows = true;
    } else {
      existing.colors.add(color);
    }
    row.imageUrls.forEach((url) => existing.imageUrls.add(url));
    existing.skuCount += 1;
    existing.totalStock += row.stock;
    existing.currentStock += row.currentStock;
    existing.tronicaStock += row.tronicaStock;
    existing.historicalSales += historicalSalesTotal(row.salesByPeriod);
    existing.recentSales += recentSalesUnits(row.salesByPeriod);
    if (row.stock > existing.representativeStock) {
      existing.representativeSku = row.sku;
      existing.representativeStock = row.stock;
    }

    const size = String(row.size || "Unmapped");
    const sizeSummary =
      existing.sizes.get(size) ||
      {
        size,
        skuCount: 0,
        totalStock: 0,
        currentStock: 0,
        tronicaStock: 0,
      };
    sizeSummary.skuCount += 1;
    sizeSummary.totalStock += row.stock;
    sizeSummary.currentStock += row.currentStock;
    sizeSummary.tronicaStock += row.tronicaStock;
    existing.sizes.set(size, sizeSummary);
    groups.set(key, existing);
  });

  return [...groups.entries()]
    .map(([id, group]) => {
      const colors = [...group.colors];
      return {
        id,
        label: colors.length ? colors.join(", ") : group.hasAssortedRows ? "Assorted" : "Unmapped color",
        representativeSku: group.representativeSku,
        representativeStock: Math.max(0, group.representativeStock),
        colors,
        hasAssortedRows: group.hasAssortedRows,
        imageUrls: [...group.imageUrls],
        skuCount: group.skuCount,
        totalStock: group.totalStock,
        currentStock: group.currentStock,
        tronicaStock: group.tronicaStock,
        historicalSales: group.historicalSales,
        recentSales: group.recentSales,
        sizes: [...group.sizes.values()].sort(
          (a, b) => sizeSortValue(a.size) - sizeSortValue(b.size) || a.size.localeCompare(b.size),
        ),
      };
    })
    .sort((a, b) => b.totalStock - a.totalStock || a.label.localeCompare(b.label));
};

export const colorSummaryForProduct = (product: GenCodeProduct) => {
  const groups = buildColorImageGroups(product);
  if (!groups.length) return "No mapped color image";
  const labels = groups.map((group) => group.label).slice(0, 3);
  const extra = groups.length > labels.length ? ` +${groups.length - labels.length}` : "";
  return `${groups.length} color image${groups.length === 1 ? "" : "s"}: ${labels.join(", ")}${extra}`;
};

export const displayTrendLabel = (trend: TrendScore) =>
  trend === "Insufficient data" ? "Limited trend data" : trend;

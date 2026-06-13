import type {
  Confidence,
  DataQualitySummary,
  Decision,
  DecisionResult,
  DemandScore,
  GenCodeProduct,
  ImageStatus,
  ProductRow,
  RiskLevel,
  RulesConfig,
  SalesByPeriod,
  TrendScore,
} from "../types";

export const DEFAULT_RULES: RulesConfig = {
  historicalHigh: 140,
  historicalMedium: 35,
  recentHigh: 8,
  recentMedium: 2,
  highStock: 70,
  mediumStock: 25,
  manageableStock: 45,
  healthySellThrough: 0.18,
  weakSellThrough: 0.04,
  highCoverMonths: 9,
  staleSeasonYears: 4,
};

export const DECISIONS: Decision[] = [
  "Continue",
  "Refresh",
  "Micro-test",
  "Liquidate",
  "Discontinue",
  "Needs Review",
];

export const decisionClassName = (decision: Decision) =>
  `decision-${decision.toLowerCase().replace(/\s+/g, "-")}`;

const emptySales = (): SalesByPeriod => ({
  fy2023: 0,
  fy2024: 0,
  fy2025: 0,
  aprMay2026: 0,
});

const sumSales = (rows: ProductRow[]): SalesByPeriod =>
  rows.reduce((acc, row) => {
    acc.fy2023 += row.salesByPeriod.fy2023;
    acc.fy2024 += row.salesByPeriod.fy2024;
    acc.fy2025 += row.salesByPeriod.fy2025;
    acc.aprMay2026 += row.salesByPeriod.aprMay2026;
    return acc;
  }, emptySales());

const uniq = <T,>(values: T[]) => [...new Set(values.filter(Boolean))];

const demandScore = (value: number, high: number, medium: number): DemandScore => {
  if (value >= high) return "High";
  if (value >= medium) return "Medium";
  return "Low";
};

const trendScore = (sales: SalesByPeriod): TrendScore => {
  const values = [sales.fy2023, sales.fy2024, sales.fy2025];
  const activeYears = values.filter((value) => value > 0).length;
  if (activeYears < 2) return "Insufficient data";

  const firstMove = sales.fy2024 - sales.fy2023;
  const secondMove = sales.fy2025 - sales.fy2024;
  const baseline = Math.max(1, sales.fy2023 + sales.fy2024);
  const materialMove = baseline * 0.08;

  if (firstMove > materialMove && secondMove >= 0) return "Improving";
  if (firstMove < -materialMove && secondMove <= 0) return "Declining";
  if (sales.fy2025 > sales.fy2024 * 1.12) return "Improving";
  if (sales.fy2025 < sales.fy2024 * 0.82 && sales.fy2024 > 0) return "Declining";
  return "Flat";
};

const seasonAgeYears = (seasonCodes: string[]) => {
  const years = seasonCodes
    .map((season) => String(season).match(/(\d{2})$/)?.[1])
    .filter(Boolean)
    .map((year) => 2000 + Number(year));
  if (!years.length) return null;
  const newestYear = Math.max(...years);
  return Math.max(0, 2026 - newestYear);
};

const stockRiskScore = (stock: number, recent: number, rules: RulesConfig): RiskLevel => {
  if (stock >= rules.highStock && recent <= rules.recentMedium) return "High";
  if (stock >= rules.mediumStock && recent < rules.recentHigh) return "Medium";
  if (stock >= rules.highStock && recent < rules.recentHigh * 1.5) return "Medium";
  return "Low";
};

const imageStatusForRows = (rows: ProductRow[]): ImageStatus => {
  const total = rows.length;
  const withImages = rows.filter((row) => row.imageUrls.length > 0).length;
  if (withImages === 0) return "Missing";
  if (withImages < total) return "Partial";
  return "Ready";
};

const confidenceFor = (
  rows: ProductRow[],
  imageStatus: ImageStatus,
  historicalTotal: number,
  recent: number,
): Confidence => {
  const missingCritical = rows.some((row) => !row.genCode || !row.sku);
  const hasSalesData = rows.some(
    (row) =>
      row.salesByPeriod.fy2023 > 0 ||
      row.salesByPeriod.fy2024 > 0 ||
      row.salesByPeriod.fy2025 > 0 ||
      row.salesByPeriod.aprMay2026 > 0,
  );

  if (missingCritical || imageStatus === "Missing" || !hasSalesData) return "Low";
  if (imageStatus === "Partial" || historicalTotal === 0 || recent < 1) return "Medium";
  return "High";
};

const olderSeason = (seasonCodes: string[]) =>
  seasonCodes.some((season) => {
    const match = String(season).match(/(\d{2})$/);
    if (!match) return false;
    const year = Number(match[1]);
    return year > 0 && year <= 22;
  });

const stockCoverMonths = (stock: number, sales: SalesByPeriod) => {
  const recentMonthlyDemand = sales.aprMay2026 / 2;
  const historicalMonthlyDemand = (sales.fy2024 + sales.fy2025) / 24;
  const monthlyDemand = Math.max(recentMonthlyDemand, historicalMonthlyDemand);
  if (monthlyDemand <= 0) return null;
  return stock / monthlyDemand;
};

const sellThroughRate = (stock: number, recent: number) => {
  const denominator = stock + recent;
  if (denominator <= 0) return 0;
  return recent / denominator;
};

const lifecycleSignal = (natures: string[]) => {
  const text = natures.join(" ").toLowerCase();
  if (text.includes("discontinue")) return "Catalog already marks discontinue";
  if (text.includes("new")) return "New or uncertain product";
  if (text.includes("fashion")) return "Fashion-led product";
  if (text.includes("regular")) return "Regular carry-forward product";
  return "No lifecycle flag";
};

const recommendedActionFor = (decision: Decision): string => {
  switch (decision) {
    case "Continue":
      return "Keep active and protect replenishment if sizes remain balanced.";
    case "Refresh":
      return "Refresh creative, image, or offer before committing bulk depth.";
    case "Micro-test":
      return "Run a small controlled push and review sell-through before scaling.";
    case "Liquidate":
      return "Move with markdown, bundles, or channel-specific exit pressure.";
    case "Discontinue":
      return "Do not repeat; clear any remaining stock with minimal new exposure.";
    case "Needs Review":
      return "Verify data, image mapping, or merchant context before deciding.";
  }
};

export const evaluateGenCode = (rows: ProductRow[], rules: RulesConfig): DecisionResult => {
  const sales = sumSales(rows);
  const historicalTotal = sales.fy2023 + sales.fy2024 + sales.fy2025;
  const totalStock = rows.reduce((sum, row) => sum + row.stock, 0);
  const seasonCodes = uniq(rows.map((row) => row.seasonCode));
  const natures = uniq(rows.map((row) => row.nature));
  const imageStatus = imageStatusForRows(rows);
  const historicalDemandScore = demandScore(
    historicalTotal,
    rules.historicalHigh,
    rules.historicalMedium,
  );
  const recentDemandScore = demandScore(sales.aprMay2026, rules.recentHigh, rules.recentMedium);
  const stockRisk = stockRiskScore(totalStock, sales.aprMay2026, rules);
  const trend = trendScore(sales);
  const confidence = confidenceFor(rows, imageStatus, historicalTotal, sales.aprMay2026);
  const missingCritical = rows.some((row) => !row.genCode || !row.sku);
  const isNew = rows.some((row) => row.nature.toLowerCase().includes("new"));
  const isMarkedDiscontinue = rows.some((row) => row.nature.toLowerCase().includes("discontinue"));
  const stale = olderSeason(seasonCodes);
  const ageYears = seasonAgeYears(seasonCodes);
  const coverMonths = stockCoverMonths(totalStock, sales);
  const sellThrough = sellThroughRate(totalStock, sales.aprMay2026);
  const lifecycle = lifecycleSignal(natures);
  const stockCoverRisk = coverMonths === null ? "unknown" : coverMonths >= rules.highCoverMonths ? "high" : coverMonths >= rules.highCoverMonths / 2 ? "medium" : "healthy";
  const staleRisk = ageYears !== null && ageYears >= rules.staleSeasonYears;

  let decisionScore = 50;
  if (historicalDemandScore === "High") decisionScore += 18;
  if (historicalDemandScore === "Low") decisionScore -= 14;
  if (recentDemandScore === "High") decisionScore += 16;
  if (recentDemandScore === "Low") decisionScore -= 14;
  if (sellThrough >= rules.healthySellThrough) decisionScore += 12;
  if (sellThrough <= rules.weakSellThrough) decisionScore -= 12;
  if (stockRisk === "High") decisionScore -= 18;
  if (stockRisk === "Low") decisionScore += 6;
  if (trend === "Improving") decisionScore += 8;
  if (trend === "Declining") decisionScore -= 10;
  if (stockCoverRisk === "high") decisionScore -= 10;
  if (staleRisk) decisionScore -= 8;
  if (isNew) decisionScore += 3;
  if (isMarkedDiscontinue) decisionScore -= 8;
  if (confidence === "Low") decisionScore -= 16;
  decisionScore = Math.max(0, Math.min(100, Math.round(decisionScore)));

  let decision: Decision;
  let reason: string;

  if (missingCritical || confidence === "Low") {
    decision = "Needs Review";
    reason =
      "Critical fields, image mapping, or sales evidence are incomplete. Review before action.";
  } else if (
    historicalDemandScore === "High" &&
    recentDemandScore === "High" &&
    stockRisk !== "High" &&
    sellThrough >= rules.weakSellThrough
  ) {
    decision = "Continue";
    reason =
      "Strong historical demand and visible Apr-May 2026 movement with manageable stock.";
  } else if (
    historicalDemandScore === "High" &&
    recentDemandScore !== "High" &&
    (stockRisk !== "High" || sellThrough > rules.weakSellThrough)
  ) {
    decision = "Refresh";
    reason =
      "Strong historical sales but weak Apr-May 2026 movement. Refresh or re-test before continuing bulk.";
  } else if (
    stockRisk === "High" &&
    recentDemandScore === "Low" &&
    (trend === "Declining" || stockCoverRisk === "high")
  ) {
    decision = "Liquidate";
    reason =
      "High stock is sitting against weak recent demand and a declining multi-year trend.";
  } else if (
    historicalDemandScore === "Low" &&
    recentDemandScore === "Low" &&
    (stockRisk !== "Low" || stale || isMarkedDiscontinue)
  ) {
    decision = "Discontinue";
    reason =
      "Low historical demand and weak current movement make this a poor repeat candidate.";
  } else if (isNew || trend === "Insufficient data" || historicalDemandScore !== "High") {
    decision = "Micro-test";
    reason =
      "Demand signal is still uncertain. Use a small test before scaling inventory exposure.";
  } else {
    decision = "Needs Review";
    reason = "Signals are mixed enough that a merchandising review is safer than auto-action.";
  }

  return {
    decision,
    confidence,
    reason,
    suggestedAction: recommendedActionFor(decision),
    riskLevel: stockRisk,
    historicalDemandScore,
    recentDemandScore,
    stockRiskScore: stockRisk,
    trendScore: trend,
    sellThroughRate: sellThrough,
    stockCoverMonths: coverMonths,
    catalogAgeYears: ageYears,
    lifecycleSignal: lifecycle,
    decisionScore,
    analyticsSummary: [
      `Sell-through proxy ${(sellThrough * 100).toFixed(1)}%`,
      coverMonths === null ? "Stock cover unavailable because demand is zero" : `Stock cover ${coverMonths.toFixed(1)} months`,
      ageYears === null ? "Season age unavailable" : `Catalog age ${ageYears} years`,
      lifecycle,
    ],
  };
};

export const groupRowsByGenCode = (
  rows: ProductRow[],
  rules: RulesConfig,
  manualDecisions: Record<string, { decision: Decision; updatedAt: string }> = {},
  notes: Record<string, { directorNote: string; merchandisingNote: string; followUpAction: string; updatedAt?: string }> = {},
): GenCodeProduct[] => {
  const grouped = rows.reduce<Record<string, ProductRow[]>>((acc, row) => {
    const key = row.genCode || "Needs Mapping";
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([genCode, variants]) => {
      const salesByPeriod = sumSales(variants);
      const imageUrls = uniq(variants.flatMap((row) => row.imageUrls));
      const recommendation = evaluateGenCode(variants, rules);
      const manualDecision = manualDecisions[genCode];

      return {
        genCode,
        brand: variants[0]?.brand || "Unmapped Brand",
        category: variants[0]?.category || "Boys Sweat Shirts",
        season: uniq(variants.map((row) => row.season)).join(", ") || "Unmapped",
        seasonCodes: uniq(variants.map((row) => row.seasonCode)),
        colors: uniq(variants.map((row) => row.color)),
        natures: uniq(variants.map((row) => row.nature)),
        variants,
        skuCount: variants.length,
        totalStock: variants.reduce((sum, row) => sum + row.stock, 0),
        currentStock: variants.reduce((sum, row) => sum + row.currentStock, 0),
        tronicaStock: variants.reduce((sum, row) => sum + row.tronicaStock, 0),
        salesByPeriod,
        historicalSalesTotal: salesByPeriod.fy2023 + salesByPeriod.fy2024 + salesByPeriod.fy2025,
        imageUrls,
        imageStatus: imageStatusForRows(variants),
        importedAt: variants[0]?.importedAt,
        recommendation,
        manualDecision,
        effectiveDecision: manualDecision?.decision || recommendation.decision,
        notes: notes[genCode],
      } satisfies GenCodeProduct;
    })
    .sort((a, b) => b.totalStock - a.totalStock);
};

export const calculateQualitySummary = (
  rows: ProductRow[],
  products: GenCodeProduct[],
  unmappedImages: number,
): DataQualitySummary => {
  const duplicateKeys = new Set<string>();
  const seen = new Set<string>();
  rows.forEach((row) => {
    const key = `${row.sku}|${row.genCode}`;
    if (seen.has(key)) duplicateKeys.add(key);
    seen.add(key);
  });

  return {
    missingGenCode: rows.filter((row) => !row.genCode).length,
    missingSku: rows.filter((row) => !row.sku).length,
    missingStock: rows.filter((row) => Number.isNaN(row.stock)).length,
    missingSalesColumns: [],
    missingImages: products.filter((product) => product.imageStatus === "Missing").length,
    duplicateRows: duplicateKeys.size,
    unmappedImages,
    lowConfidenceGenCodes: products.filter((product) => product.recommendation.confidence === "Low").length,
  };
};

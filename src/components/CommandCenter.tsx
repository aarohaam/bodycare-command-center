import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Filter,
  Search,
  Settings2,
  ShieldAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Decision, GenCodeProduct } from "../types";
import { DECISIONS, decisionClassName } from "../lib/DecisionEngine";
import { compact, number } from "../lib/format";
import { exportDecisionSummaryPdf, exportElementPdf } from "../lib/PdfExport";
import { GenCodeCard } from "./GenCodeCard";
import { KpiCard } from "./KpiCard";

interface CommandCenterProps {
  products: GenCodeProduct[];
  totalRows: number;
  brandOptions: string[];
  onOpenDetail: (genCode: string) => void;
  onOpenUpload: () => void;
  onOpenRules: () => void;
  onOpenDataQuality: () => void;
  onMarkDecision: (genCode: string) => void;
}

type SortMode = "risk" | "stock" | "recent" | "historical" | "gencode";

const stockRiskRank = { High: 3, Medium: 2, Low: 1 };

const matchesSearch = (product: GenCodeProduct, query: string) => {
  if (!query) return true;
  const haystack = [
    product.genCode,
    product.brand,
    product.category,
    product.colors.join(" "),
    product.variants.map((variant) => variant.sku).join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
};

export function CommandCenter({
  products,
  totalRows,
  brandOptions,
  onOpenDetail,
  onOpenUpload,
  onOpenRules,
  onOpenDataQuality,
  onMarkDecision,
}: CommandCenterProps) {
  const [query, setQuery] = useState("");
  const [decision, setDecision] = useState<Decision | "All">("All");
  const [stockRisk, setStockRisk] = useState<"All" | "High" | "Medium" | "Low">("All");
  const [recentSales, setRecentSales] = useState<"All" | "Visible" | "Zero">("All");
  const [imageStatus, setImageStatus] = useState<"All" | "Ready" | "Partial" | "Missing" | "Review">("All");
  const [brand, setBrand] = useState("All");
  const [sortMode, setSortMode] = useState<SortMode>("risk");

  const decisionCounts = useMemo(
    () =>
      DECISIONS.reduce<Record<Decision, number>>((acc, item) => {
        acc[item] = products.filter((product) => product.effectiveDecision === item).length;
        return acc;
      }, {} as Record<Decision, number>),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      if (!matchesSearch(product, query)) return false;
      if (decision !== "All" && product.effectiveDecision !== decision) return false;
      if (stockRisk !== "All" && product.recommendation.stockRiskScore !== stockRisk) return false;
      if (recentSales === "Visible" && product.salesByPeriod.aprMay2026 <= 0) return false;
      if (recentSales === "Zero" && product.salesByPeriod.aprMay2026 > 0) return false;
      if (imageStatus !== "All" && product.imageStatus !== imageStatus) return false;
      if (brand !== "All" && product.brand !== brand) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "risk") {
        return (
          stockRiskRank[b.recommendation.stockRiskScore] -
            stockRiskRank[a.recommendation.stockRiskScore] ||
          b.totalStock - a.totalStock
        );
      }
      if (sortMode === "stock") return b.totalStock - a.totalStock;
      if (sortMode === "recent") return b.salesByPeriod.aprMay2026 - a.salesByPeriod.aprMay2026;
      if (sortMode === "historical") return b.historicalSalesTotal - a.historicalSalesTotal;
      return a.genCode.localeCompare(b.genCode);
    });
  }, [brand, decision, imageStatus, products, query, recentSales, sortMode, stockRisk]);

  const strongMatch = useMemo(() => {
    if (!query.trim()) return null;
    const exact = products.find(
      (product) =>
        product.genCode.toLowerCase() === query.toLowerCase() ||
        product.variants.some((variant) => variant.sku.toLowerCase() === query.toLowerCase()),
    );
    return exact || (filteredProducts.length === 1 ? filteredProducts[0] : null);
  }, [filteredProducts, products, query]);

  const totals = useMemo(
    () =>
      products.reduce(
        (acc, product) => {
          acc.stock += product.totalStock;
          acc.fy2023 += product.salesByPeriod.fy2023;
          acc.fy2024 += product.salesByPeriod.fy2024;
          acc.fy2025 += product.salesByPeriod.fy2025;
          acc.aprMay2026 += product.salesByPeriod.aprMay2026;
          if (product.recommendation.stockRiskScore === "High") acc.highRisk += 1;
          if (product.effectiveDecision === "Continue") acc.continueCandidates += 1;
          if (product.effectiveDecision === "Liquidate" || product.effectiveDecision === "Discontinue") {
            acc.exitCandidates += 1;
          }
          return acc;
        },
        {
          stock: 0,
          fy2023: 0,
          fy2024: 0,
          fy2025: 0,
          aprMay2026: 0,
          highRisk: 0,
          continueCandidates: 0,
          exitCandidates: 0,
        },
      ),
    [products],
  );

  return (
    <section className="screen command-screen" id="command-center-print">
      <header className="topbar">
        <div className="title-block">
          <h1>Product Command Center v0.1</h1>
          <span className="category-pill">Boys Sweat Shirts</span>
        </div>

        <div className="search-wrap">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search GenCode or SKU"
            aria-label="Search GenCode or SKU"
          />
        </div>

        <div className="top-actions">
          <button type="button" className="ghost-button" onClick={onOpenUpload}>
            <FileSpreadsheet size={17} />
            Upload Workbook
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => exportElementPdf("command-center-print", "bodycare-command-center.pdf")}
          >
            <Download size={17} />
            Export PDF
          </button>
          <button type="button" className="ghost-button" onClick={onOpenRules}>
            <Settings2 size={17} />
            Settings / Rules
          </button>
        </div>
      </header>

      <div className="kpi-row">
        <KpiCard label="Total GenCodes" value={number(products.length)} />
        <KpiCard label="Total SKUs" value={number(totalRows)} />
        <KpiCard label="Total Stock" value={number(totals.stock)} />
        <KpiCard label="FY 2023-24 Sales" value={compact(totals.fy2023)} />
        <KpiCard label="FY 2024-25 Sales" value={compact(totals.fy2024)} />
        <KpiCard label="FY 2025-26 Sales" value={compact(totals.fy2025)} />
        <KpiCard label="Apr-May 2026 Sales" value={compact(totals.aprMay2026)} />
        <KpiCard label="High Risk GenCodes" value={number(totals.highRisk)} tone="danger" />
        <KpiCard label="Continue Candidates" value={number(totals.continueCandidates)} tone="good" />
        <KpiCard label="Exit Candidates" value={number(totals.exitCandidates)} tone="warning" />
      </div>

      <div className="decision-strip">
        {DECISIONS.map((item) => (
          <button
            key={item}
            type="button"
            className={`decision-count ${decision === item ? "active" : ""}`}
            onClick={() => setDecision(decision === item ? "All" : item)}
          >
            <span className={`decision-dot ${decisionClassName(item)}`} />
            {item}
            <b>{decisionCounts[item] || 0}</b>
          </button>
        ))}
        <button type="button" className="quality-button" onClick={onOpenDataQuality}>
          <ShieldAlert size={16} />
          Data Quality
        </button>
        <button
          type="button"
          className="quality-button"
          onClick={() => exportDecisionSummaryPdf(filteredProducts, "bodycare-decision-summary.pdf")}
        >
          <BarChart3 size={16} />
          Decision Summary PDF
        </button>
      </div>

      <div className="filter-bar">
        <span className="filter-label">
          <Filter size={16} />
          Filters
        </span>
        <select value={decision} onChange={(event) => setDecision(event.target.value as Decision | "All")}>
          <option>All</option>
          {DECISIONS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={stockRisk} onChange={(event) => setStockRisk(event.target.value as typeof stockRisk)}>
          <option>All</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <select value={recentSales} onChange={(event) => setRecentSales(event.target.value as typeof recentSales)}>
          <option>All</option>
          <option>Visible</option>
          <option>Zero</option>
        </select>
        <select value={imageStatus} onChange={(event) => setImageStatus(event.target.value as typeof imageStatus)}>
          <option>All</option>
          <option>Ready</option>
          <option>Partial</option>
          <option>Missing</option>
          <option>Review</option>
        </select>
        <select value={brand} onChange={(event) => setBrand(event.target.value)}>
          <option>All</option>
          {brandOptions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
          <option value="risk">Sort: Risk</option>
          <option value="stock">Sort: Stock</option>
          <option value="recent">Sort: Recent Sales</option>
          <option value="historical">Sort: Historical Sales</option>
          <option value="gencode">Sort: GenCode</option>
        </select>
      </div>

      {strongMatch ? (
        <div className="strong-match">
          <span>Strong match</span>
          <button type="button" onClick={() => onOpenDetail(strongMatch.genCode)}>
            {strongMatch.genCode} · {strongMatch.skuCount} SKUs · Open detail
          </button>
        </div>
      ) : null}

      {!filteredProducts.length ? (
        <div className="empty-state">
          <h2>No GenCode found</h2>
          <p>Try a partial GenCode, SKU, or product text. If it is still missing, check unmapped SKUs in Data Quality.</p>
        </div>
      ) : (
        <div className="gencode-grid">
          {filteredProducts.map((product) => (
            <GenCodeCard
              key={product.genCode}
              product={product}
              onOpen={onOpenDetail}
              onMarkDecision={onMarkDecision}
            />
          ))}
        </div>
      )}
    </section>
  );
}

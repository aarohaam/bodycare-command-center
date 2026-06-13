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
import type { Decision, GenCodeProduct, ImportMergeSummary } from "../../types";
import { DECISIONS, decisionClassName } from "../../domain/decision-engine";
import { compact, number } from "../../utils/number-format";
import { exportDecisionSummaryPdf, exportElementPdf } from "../../services/pdf-export";
import { GenCodeCard } from "./GenCodeCard";
import { KpiCard } from "../../ui/KpiCard";

interface CommandCenterProps {
  products: GenCodeProduct[];
  totalRows: number;
  brandOptions: string[];
  categoryOptions: string[];
  lastImportMerge: ImportMergeSummary | null;
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

export function CommandCenterPage({
  products,
  totalRows,
  brandOptions,
  categoryOptions,
  lastImportMerge,
  onOpenDetail,
  onOpenUpload,
  onOpenRules,
  onOpenDataQuality,
  onMarkDecision,
}: CommandCenterProps) {
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [decision, setDecision] = useState<Decision | "All">("All");
  const [stockRisk, setStockRisk] = useState<"All" | "High" | "Medium" | "Low">("All");
  const [recentSales, setRecentSales] = useState<"All" | "Visible" | "Zero">("All");
  const [brand, setBrand] = useState("All");
  const [category, setCategory] = useState("All");
  const [trend, setTrend] = useState<"All" | "Improving" | "Declining" | "Flat" | "Insufficient data">("All");
  const [lifecycle, setLifecycle] = useState("All");
  const [sortMode, setSortMode] = useState<SortMode>("risk");
  const showBrandFilter = brandOptions.length > 1;
  const showCategoryFilter = categoryOptions.length > 1;

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
      if (appliedQuery && !matchesSearch(product, appliedQuery)) return false;
      if (decision !== "All" && product.effectiveDecision !== decision) return false;
      if (stockRisk !== "All" && product.recommendation.stockRiskScore !== stockRisk) return false;
      if (recentSales === "Visible" && product.salesByPeriod.aprMay2026 <= 0) return false;
      if (recentSales === "Zero" && product.salesByPeriod.aprMay2026 > 0) return false;
      if (showBrandFilter && brand !== "All" && product.brand !== brand) return false;
      if (showCategoryFilter && category !== "All" && product.category !== category) return false;
      if (trend !== "All" && product.recommendation.trendScore !== trend) return false;
      if (lifecycle !== "All" && !product.natures.includes(lifecycle)) return false;
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
  }, [
    appliedQuery,
    brand,
    category,
    decision,
    lifecycle,
    products,
    recentSales,
    showBrandFilter,
    showCategoryFilter,
    sortMode,
    stockRisk,
    trend,
  ]);

  const strongMatch = useMemo(() => {
    if (!query.trim()) return null;
    const exact = products.find(
      (product) =>
        product.genCode.toLowerCase() === appliedQuery.toLowerCase() ||
        product.variants.some((variant) => variant.sku.toLowerCase() === appliedQuery.toLowerCase()),
    );
    return exact || (filteredProducts.length === 1 ? filteredProducts[0] : null);
  }, [appliedQuery, filteredProducts, products]);

  const lifecycleOptions = useMemo(
    () => [...new Set(products.flatMap((product) => product.natures).filter(Boolean))].sort(),
    [products],
  );

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
          <h1>Product Command Centre</h1>
          <span className="category-pill">Boys Sweat Shirts</span>
        </div>

        <div className="search-wrap">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") setAppliedQuery(query.trim());
            }}
            placeholder="Search GenCode or SKU"
            aria-label="Search GenCode or SKU"
          />
          <button
            type="button"
            className="search-submit"
            onClick={() => setAppliedQuery(query.trim())}
            aria-label="Search"
          >
            Search
          </button>
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
            Decision Rules
          </button>
        </div>
      </header>

      {lastImportMerge ? (
        <div className="import-merge-strip">
          <strong>Last workbook merge</strong>
          <span>Added {lastImportMerge.added}</span>
          <span>Updated {lastImportMerge.updated}</span>
          <span>Unchanged {lastImportMerge.unchanged}</span>
          <span>Total rows {lastImportMerge.totalAfterImport}</span>
        </div>
      ) : null}

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
          Review Summary PDF
        </button>
      </div>

      <div className="filter-bar">
        <span className="filter-label">
          <Filter size={16} />
          Review Filters
        </span>
        <label className="filter-control">
          <span>Stock risk</span>
          <select value={stockRisk} onChange={(event) => setStockRisk(event.target.value as typeof stockRisk)}>
            <option>All</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </label>
        <label className="filter-control">
          <span>Apr-May sales</span>
          <select value={recentSales} onChange={(event) => setRecentSales(event.target.value as typeof recentSales)}>
            <option value="All">All</option>
            <option value="Visible">Has Apr-May sales</option>
            <option value="Zero">No Apr-May sales</option>
          </select>
        </label>
        <label className="filter-control">
          <span>Trend</span>
          <select value={trend} onChange={(event) => setTrend(event.target.value as typeof trend)}>
            <option value="All">All</option>
            <option value="Improving">Improving</option>
            <option value="Declining">Declining</option>
            <option value="Flat">Flat</option>
            <option value="Insufficient data">Limited trend data</option>
          </select>
        </label>
        <label className="filter-control">
          <span>Product status</span>
          <select value={lifecycle} onChange={(event) => setLifecycle(event.target.value)}>
            <option>All</option>
            {lifecycleOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        {showBrandFilter ? (
          <label className="filter-control">
            <span>Brand</span>
            <select value={brand} onChange={(event) => setBrand(event.target.value)}>
              <option>All</option>
              {brandOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        ) : null}
        {showCategoryFilter ? (
          <label className="filter-control">
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option>All</option>
              {categoryOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="filter-control">
          <span>Sort by</span>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
            <option value="risk">Risk first</option>
            <option value="stock">Stock high to low</option>
            <option value="recent">Apr-May sales high to low</option>
            <option value="historical">3-year sales high to low</option>
            <option value="gencode">GenCode A-Z</option>
          </select>
        </label>
        <button
          type="button"
          className="ghost-button"
          onClick={() => exportElementPdf("command-center-print", "bodycare-filtered-gencodes.pdf")}
        >
          <Download size={16} />
          Export Filtered PDF
        </button>
      </div>

      <div className="filter-result-bar">
        <span>
          Showing <b>{filteredProducts.length}</b> of <b>{products.length}</b> GenCodes
        </span>
        <span>Decision: <b>{decision}</b></span>
        <span>Stock risk: <b>{stockRisk}</b></span>
        <span>Apr-May sales: <b>{recentSales === "Visible" ? "Has sales" : recentSales === "Zero" ? "No sales" : "All"}</b></span>
        <span>Product status: <b>{lifecycle}</b></span>
        {showBrandFilter ? <span>Brand: <b>{brand}</b></span> : null}
        {showCategoryFilter ? <span>Category: <b>{category}</b></span> : null}
        {appliedQuery ? <span>Search: <b>{appliedQuery}</b></span> : null}
      </div>

      {strongMatch ? (
        <div className="strong-match">
          <span>Strong match</span>
          <button type="button" onClick={() => onOpenDetail(strongMatch.genCode)}>
            {strongMatch.genCode} · {strongMatch.skuCount} SKUs · Open detail
          </button>
        </div>
      ) : null}

      {!products.length ? (
        <div className="empty-state onboarding-state">
          <h2>Upload a workbook to begin review</h2>
          <p>Start from the latest Boys Sweat Shirts workbook, then review GenCode decisions from the command centre.</p>
          <button type="button" className="primary-button" onClick={onOpenUpload}>
            <FileSpreadsheet size={16} />
            Upload Workbook
          </button>
        </div>
      ) : !filteredProducts.length ? (
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

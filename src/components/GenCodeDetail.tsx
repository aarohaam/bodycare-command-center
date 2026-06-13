import { ArrowLeft, Download, ImagePlus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Decision, GenCodeProduct, NotesState } from "../types";
import { DECISIONS, decisionClassName } from "../lib/DecisionEngine";
import { exportElementPdf } from "../lib/PdfExport";
import { number } from "../lib/format";
import { KpiCard } from "./KpiCard";
import { ProductImage } from "./ProductImage";

interface GenCodeDetailProps {
  product: GenCodeProduct;
  onBack: () => void;
  onDecisionChange: (genCode: string, decision: Decision) => void;
  onNotesChange: (genCode: string, notes: NotesState) => void;
  onOpenImageMapping: () => void;
}

const blankNotes: NotesState = {
  directorNote: "",
  merchandisingNote: "",
  followUpAction: "",
};

export function GenCodeDetail({
  product,
  onBack,
  onDecisionChange,
  onNotesChange,
  onOpenImageMapping,
}: GenCodeDetailProps) {
  const [notes, setNotes] = useState<NotesState>(product.notes || blankNotes);

  useEffect(() => {
    setNotes(product.notes || blankNotes);
  }, [product.genCode, product.notes]);

  const maxSales = useMemo(
    () =>
      Math.max(
        1,
        product.salesByPeriod.fy2023,
        product.salesByPeriod.fy2024,
        product.salesByPeriod.fy2025,
        product.salesByPeriod.aprMay2026,
      ),
    [product.salesByPeriod],
  );

  const saveNotes = () => {
    onNotesChange(product.genCode, { ...notes, updatedAt: new Date().toISOString() });
  };

  return (
    <section className="screen detail-screen" id="gencode-detail-print">
      <header className="detail-header">
        <button className="ghost-button" type="button" onClick={onBack}>
          <ArrowLeft size={17} />
          Back to Command Center
        </button>
        <div className="detail-title">
          <h1>{product.genCode}</h1>
          <span>{product.category}</span>
        </div>
        <span className={`decision-badge large ${decisionClassName(product.effectiveDecision)}`}>
          {product.effectiveDecision}
        </span>
        <select
          value={product.effectiveDecision}
          onChange={(event) => onDecisionChange(product.genCode, event.target.value as Decision)}
          aria-label="Manual decision"
        >
          {DECISIONS.map((decision) => (
            <option key={decision}>{decision}</option>
          ))}
        </select>
        <button
          className="ghost-button"
          type="button"
          onClick={() => exportElementPdf("gencode-detail-print", `${product.genCode}-decision.pdf`)}
        >
          <Download size={17} />
          Export this GenCode PDF
        </button>
      </header>

      <div className="detail-grid">
        <section className="variant-board">
          <div className="section-heading">
            <div>
              <h2>Variant Images</h2>
              <p>{product.imageStatus === "Ready" ? "Mapped images are ready" : "Image mapping needs review"}</p>
            </div>
            {product.imageStatus !== "Ready" ? (
              <button className="ghost-button" type="button" onClick={onOpenImageMapping}>
                <ImagePlus size={16} />
                Map Image
              </button>
            ) : null}
          </div>

          {product.imageStatus !== "Ready" ? (
            <div className="image-warning">Image mapping needs review</div>
          ) : null}

          <div className="hero-image-layout">
            <ProductImage urls={product.imageUrls} label={product.genCode} size="hero" />
            <div className="variant-thumbs">
              {product.variants.slice(0, 8).map((variant) => (
                <div className="variant-thumb" key={variant.id}>
                  <ProductImage urls={variant.imageUrls} label={variant.sku} size="thumb" />
                  <span>{variant.size || variant.sku}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="decision-panel">
          <div className="section-heading tight">
            <h2>Decision Summary</h2>
          </div>
          <div className="recommendation-block">
            <span className={`decision-badge ${decisionClassName(product.recommendation.decision)}`}>
              Auto: {product.recommendation.decision}
            </span>
            <strong>{product.recommendation.confidence} confidence</strong>
            <p>{product.recommendation.reason}</p>
          </div>
          <dl className="decision-facts">
            <div>
              <dt>Suggested action</dt>
              <dd>{product.recommendation.suggestedAction}</dd>
            </div>
            <div>
              <dt>Risk level</dt>
              <dd>{product.recommendation.riskLevel}</dd>
            </div>
          </dl>
        </aside>
      </div>

      <section className="performance-section">
        <div className="section-heading">
          <div>
            <h2>Performance</h2>
            <p>Sales and stock signals are grouped at GenCode level.</p>
          </div>
        </div>
        <div className="kpi-row compact-kpis">
          <KpiCard label="Total Stock" value={number(product.totalStock)} />
          <KpiCard label="FY 2023-24 Sales" value={number(product.salesByPeriod.fy2023)} />
          <KpiCard label="FY 2024-25 Sales" value={number(product.salesByPeriod.fy2024)} />
          <KpiCard label="FY 2025-26 Sales" value={number(product.salesByPeriod.fy2025)} />
          <KpiCard label="Apr-May 2026 Sales" value={number(product.salesByPeriod.aprMay2026)} />
          <KpiCard label="Historical Sales Total" value={number(product.historicalSalesTotal)} />
          <KpiCard label="Recent Demand Score" value={product.recommendation.recentDemandScore} />
          <KpiCard label="Stock Risk Score" value={product.recommendation.stockRiskScore} />
          <KpiCard label="Trend Score" value={product.recommendation.trendScore} />
        </div>

        <div className="trend-visual" aria-label="Sales trend visual">
          {[
            ["FY 2023-24", product.salesByPeriod.fy2023],
            ["FY 2024-25", product.salesByPeriod.fy2024],
            ["FY 2025-26", product.salesByPeriod.fy2025],
            ["Apr-May 2026", product.salesByPeriod.aprMay2026],
          ].map(([label, value]) => (
            <div className="trend-row" key={label}>
              <span>{label}</span>
              <div className="trend-track">
                <div className="trend-fill" style={{ width: `${(Number(value) / maxSales) * 100}%` }} />
              </div>
              <b>{number(Number(value))}</b>
            </div>
          ))}
        </div>
      </section>

      <section className="decision-actions">
        <div className="section-heading">
          <div>
            <h2>Decision Action</h2>
            <p>Manual decision saves instantly on click.</p>
          </div>
        </div>
        <div className="action-button-row">
          {DECISIONS.map((decision) => (
            <button
              key={decision}
              className={`decision-action ${decisionClassName(decision)} ${
                product.effectiveDecision === decision ? "selected" : ""
              }`}
              type="button"
              onClick={() => onDecisionChange(product.genCode, decision)}
            >
              {decision}
            </button>
          ))}
        </div>
        <div className="notes-grid">
          <label>
            Director note
            <textarea
              value={notes.directorNote}
              onChange={(event) => setNotes((current) => ({ ...current, directorNote: event.target.value }))}
              placeholder="Add director note"
            />
          </label>
          <label>
            Merchandising note
            <textarea
              value={notes.merchandisingNote}
              onChange={(event) => setNotes((current) => ({ ...current, merchandisingNote: event.target.value }))}
              placeholder="Add merchandising note"
            />
          </label>
          <label>
            Follow-up action
            <textarea
              value={notes.followUpAction}
              onChange={(event) => setNotes((current) => ({ ...current, followUpAction: event.target.value }))}
              placeholder="Add follow-up action"
            />
          </label>
          <button className="primary-button notes-save" type="button" onClick={saveNotes}>
            <Save size={16} />
            Save Notes
          </button>
        </div>
      </section>

      <section className="variant-table-section">
        <div className="section-heading">
          <div>
            <h2>Variant / SKU Table</h2>
            <p>Numbers appear after images and decision context.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>GenCode</th>
                <th>Stock</th>
                <th>FY 2023-24</th>
                <th>FY 2024-25</th>
                <th>FY 2025-26</th>
                <th>Apr-May 2026</th>
                <th>Image status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((variant) => (
                <tr key={variant.id}>
                  <td>{variant.sku}</td>
                  <td>{variant.genCode}</td>
                  <td>{number(variant.stock)}</td>
                  <td>{number(variant.salesByPeriod.fy2023)}</td>
                  <td>{number(variant.salesByPeriod.fy2024)}</td>
                  <td>{number(variant.salesByPeriod.fy2025)}</td>
                  <td>{number(variant.salesByPeriod.aprMay2026)}</td>
                  <td>{variant.imageStatus}</td>
                  <td>{variant.color || variant.size ? `${variant.color} ${variant.size}`.trim() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

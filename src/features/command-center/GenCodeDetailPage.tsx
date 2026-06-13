import { ArrowLeft, Download, ImagePlus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Decision, GenCodeProduct, NotesState, WorkflowActionState } from "../../types";
import { DECISIONS, decisionClassName } from "../../domain/decision-engine";
import { buildColorImageGroups, displayTrendLabel } from "../../domain/product-variants";
import { challengeModeForProduct } from "../../domain/workflow";
import { exportElementPdf } from "../../services/pdf-export";
import { number, percent } from "../../utils/number-format";
import { KpiCard } from "../../ui/KpiCard";
import { ProductImage } from "../../ui/ProductImage";
import { WorkflowActionControls } from "../action-queue/WorkflowActionControls";

interface GenCodeDetailProps {
  product: GenCodeProduct;
  onBack: () => void;
  onDecisionChange: (genCode: string, decision: Decision) => void;
  onNotesChange: (genCode: string, notes: NotesState) => void;
  workflowAction: WorkflowActionState;
  onWorkflowChange: (genCode: string, patch: Partial<WorkflowActionState>) => void;
  onOpenImageMapping: () => void;
}

const blankNotes: NotesState = {
  directorNote: "",
  merchandisingNote: "",
  followUpAction: "",
};

export function GenCodeDetailPage({
  product,
  onBack,
  onDecisionChange,
  onNotesChange,
  workflowAction,
  onWorkflowChange,
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
  const challenge = useMemo(() => challengeModeForProduct(product), [product]);
  const colorGroups = useMemo(() => buildColorImageGroups(product), [product]);
  const primaryColorGroup = colorGroups[0];

  const saveNotes = () => {
    onNotesChange(product.genCode, { ...notes, updatedAt: new Date().toISOString() });
  };

  return (
    <section className="screen detail-screen" id="gencode-detail-print">
      <header className="detail-header">
        <button className="ghost-button" type="button" onClick={onBack}>
          <ArrowLeft size={17} />
          Back to Command Centre
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
              <p>
                {product.imageStatus === "Ready"
                  ? "One image per color, with size-wise stock from the workbook."
                  : "Image mapping needs review"}
              </p>
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

          <div className="color-image-layout">
            <div className="hero-color-panel">
              <ProductImage
                urls={primaryColorGroup?.imageUrls.length ? primaryColorGroup.imageUrls : product.imageUrls}
                label={primaryColorGroup?.label || product.genCode}
                size="hero"
              />
              <div className="hero-color-meta">
                <strong>{primaryColorGroup?.label || product.genCode}</strong>
                <span>
                  Total inventory {number(primaryColorGroup?.totalStock ?? product.totalStock)}
                  {" "}· Current stock {number(primaryColorGroup?.currentStock ?? product.currentStock)}
                  {" "}· Tronica stock {number(primaryColorGroup?.tronicaStock ?? product.tronicaStock)}
                </span>
              </div>
            </div>

            <div className="color-inventory-list">
              {colorGroups.map((group) => (
                <article className="color-inventory-card" key={group.id}>
                  <div className="color-card-header">
                    <ProductImage urls={group.imageUrls} label={group.label} size="thumb" />
                    <div>
                      <strong>{group.label}</strong>
                      <span>
                        {group.skuCount} SKUs · Total inventory {number(group.totalStock)}
                      </span>
                      {group.hasAssortedRows ? <em>Includes assorted rows linked to this image</em> : null}
                    </div>
                  </div>

                  <div
                    className="size-stock-matrix"
                    style={{
                      gridTemplateColumns: `minmax(82px, 0.9fr) repeat(${group.sizes.length}, minmax(38px, 1fr))`,
                    }}
                    aria-label={`${group.label} size stock`}
                  >
                    <span>Size</span>
                    {group.sizes.map((size) => (
                      <b key={`size-${group.id}-${size.size}`}>{size.size}</b>
                    ))}
                    <span>Total Stock</span>
                    {group.sizes.map((size) => (
                      <b key={`total-${group.id}-${size.size}`}>{number(size.totalStock)}</b>
                    ))}
                    <span>Current</span>
                    {group.sizes.map((size) => (
                      <b key={`current-${group.id}-${size.size}`}>{number(size.currentStock)}</b>
                    ))}
                  </div>

                  <p className="split-stock">
                    Current stock {number(group.currentStock)} · Tronica stock {number(group.tronicaStock)}
                  </p>
                </article>
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
              Recommended: {product.recommendation.decision}
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
            <div>
              <dt>Decision signals</dt>
              <dd>{product.recommendation.analyticsSummary.join(" · ")}</dd>
            </div>
          </dl>
        </aside>
      </div>

      <section className="challenge-section">
        <div className="section-heading">
          <div>
            <h2>Decision Review</h2>
            <p>Review evidence, risks, and missing context before final action.</p>
          </div>
        </div>

        <div className="challenge-grid">
          <div className="challenge-card">
            <h3>Evidence used</h3>
            <ul>
              {challenge.evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="challenge-card">
            <h3>Weak assumptions</h3>
            <ul>
              {challenge.weakAssumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="challenge-card">
            <h3>Missing evidence</h3>
            <ul>
              {challenge.missingEvidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <WorkflowActionControls
          workflow={workflowAction}
          onChange={(patch) => onWorkflowChange(product.genCode, patch)}
        />
      </section>

      <section className="performance-section">
        <div className="section-heading">
          <div>
            <h2>Performance & Decision Evidence</h2>
            <p>Use this view to judge whether to continue, refresh, liquidate, discontinue, or hold for review.</p>
          </div>
        </div>
        <div className="performance-readout-grid">
          <div>
            <span>Inventory pressure</span>
            <strong>{product.recommendation.stockRiskScore}</strong>
            <p>
              {product.recommendation.stockCoverMonths === null
                ? "Stock cover cannot be calculated because demand is zero."
                : `${product.recommendation.stockCoverMonths.toFixed(1)} months of cover based on detected demand.`}
            </p>
          </div>
          <div>
            <span>Demand position</span>
            <strong>{product.recommendation.recentDemandScore}</strong>
            <p>
              Apr-May sales {number(product.salesByPeriod.aprMay2026)} against 3-year sales{" "}
              {number(product.historicalSalesTotal)}.
            </p>
          </div>
          <div>
            <span>Trend read</span>
            <strong>{displayTrendLabel(product.recommendation.trendScore)}</strong>
            <p>{product.recommendation.reason}</p>
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
          <KpiCard label="Trend" value={displayTrendLabel(product.recommendation.trendScore)} />
          <KpiCard label="Sell-through Proxy" value={percent(product.recommendation.sellThroughRate)} />
          <KpiCard
            label="Stock Cover"
            value={
              product.recommendation.stockCoverMonths === null
                ? "No demand"
                : `${product.recommendation.stockCoverMonths.toFixed(1)} mo`
            }
          />
          <KpiCard
            label="Catalog Age"
            value={
              product.recommendation.catalogAgeYears === null
                ? "Unknown"
                : `${product.recommendation.catalogAgeYears} yr`
            }
          />
          <KpiCard label="Lifecycle" value={product.recommendation.lifecycleSignal} />
          <KpiCard label="Decision Score" value={`${product.recommendation.decisionScore}/100`} />
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
            <p>Select the final decision and record the reason for follow-up.</p>
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
                <th>Color / Size</th>
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

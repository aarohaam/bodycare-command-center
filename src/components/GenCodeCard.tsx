import { ArrowUpRight, CheckCircle2, CircleAlert, Edit3, TrendingDown, TrendingUp } from "lucide-react";
import type { GenCodeProduct } from "../types";
import { decisionClassName } from "../lib/DecisionEngine";
import { compact, number } from "../lib/format";
import { ProductImage } from "./ProductImage";

interface GenCodeCardProps {
  product: GenCodeProduct;
  onOpen: (genCode: string) => void;
  onMarkDecision: (genCode: string) => void;
}

const trendIcon = (trend: string) => {
  if (trend === "Improving") return <TrendingUp size={15} />;
  if (trend === "Declining") return <TrendingDown size={15} />;
  return <ArrowUpRight size={15} />;
};

export function GenCodeCard({ product, onOpen, onMarkDecision }: GenCodeCardProps) {
  const imageStack = product.imageUrls.slice(0, 4);
  const recommendation = product.recommendation;
  const decision = product.effectiveDecision;

  return (
    <article className="gencode-card">
      <div className="card-image-wrap">
        <ProductImage urls={product.imageUrls} label={product.genCode} />
        {imageStack.length > 1 ? (
          <div className="thumb-stack" aria-label={`${imageStack.length} images`}>
            {imageStack.map((url) => (
              <ProductImage key={url} urls={[url]} label={`${product.genCode} variant`} size="thumb" />
            ))}
          </div>
        ) : null}
      </div>

      <div className="card-main">
        <div className="card-title-row">
          <div>
            <h3>{product.genCode}</h3>
            <p>
              {product.skuCount} SKUs · {product.colors.slice(0, 2).join(", ") || "No color"}
            </p>
          </div>
          <span className={`decision-badge ${decisionClassName(decision)}`}>{decision}</span>
        </div>

        <div className="mini-metrics">
          <span>
            <b>{number(product.totalStock)}</b>
            Stock
          </span>
          <span>
            <b>{compact(product.historicalSalesTotal)}</b>
            History
          </span>
          <span>
            <b>{number(product.salesByPeriod.aprMay2026)}</b>
            Apr-May
          </span>
        </div>

        <div className="card-signal-row">
          <span className={`confidence confidence-${recommendation.confidence.toLowerCase()}`}>
            {recommendation.confidence === "High" ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}
            {recommendation.confidence} confidence
          </span>
          <span className="trend-chip">
            {trendIcon(recommendation.trendScore)}
            {recommendation.trendScore}
          </span>
        </div>

        <p className="reason-line">{recommendation.reason}</p>

        <div className="card-actions">
          <button type="button" className="primary-button small" onClick={() => onOpen(product.genCode)}>
            Open Detail
          </button>
          <button type="button" className="ghost-button small" onClick={() => onMarkDecision(product.genCode)}>
            <Edit3 size={14} />
            Mark Decision
          </button>
        </div>
      </div>
    </article>
  );
}

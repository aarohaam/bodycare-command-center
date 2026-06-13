import { Download, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { ActionPriority, ActionStatus, Decision, WorkflowActionState } from "../../types";
import { DECISIONS, decisionClassName } from "../../domain/decision-engine";
import {
  ACTION_PRIORITIES,
  ACTION_STATUSES,
  type ActionQueueItem,
  buildActionQueue,
} from "../../domain/workflow";
import { exportActionQueueCsv } from "../../services/csv-export";
import { compact, number } from "../../utils/number-format";
import { KpiCard } from "../../ui/KpiCard";
import { WorkflowActionControls } from "./WorkflowActionControls";

interface ActionQueuePageProps {
  products: ActionQueueItem["product"][];
  workflowActions: Record<string, WorkflowActionState>;
  onWorkflowChange: (genCode: string, patch: Partial<WorkflowActionState>) => void;
  onOpenDetail: (genCode: string) => void;
}

type StatusFilter = "Active" | "All" | ActionStatus;
type PriorityFilter = "All" | ActionPriority;
type DecisionFilter = "All" | Decision;

const activeStatuses = new Set<ActionStatus>(["Open", "In Progress", "Blocked"]);

const matchesSearch = (item: ActionQueueItem, query: string) => {
  if (!query) return true;
  const text = [
    item.product.genCode,
    item.product.brand,
    item.product.category,
    item.product.effectiveDecision,
    item.workflow.owner,
    item.workflow.nextAction,
    item.workflow.challengeResponse,
    item.triggers.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return text.includes(query.toLowerCase());
};

export function ActionQueuePage({
  products,
  workflowActions,
  onWorkflowChange,
  onOpenDetail,
}: ActionQueuePageProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Active");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("All");
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("All");

  const queueItems = useMemo(
    () => buildActionQueue(products, workflowActions),
    [products, workflowActions],
  );

  const filteredItems = useMemo(
    () =>
      queueItems.filter((item) => {
        if (!matchesSearch(item, query.trim())) return false;
        if (statusFilter === "Active" && !activeStatuses.has(item.workflow.status)) return false;
        if (statusFilter !== "Active" && statusFilter !== "All" && item.workflow.status !== statusFilter) {
          return false;
        }
        if (priorityFilter !== "All" && item.workflow.priority !== priorityFilter) return false;
        if (decisionFilter !== "All" && item.product.effectiveDecision !== decisionFilter) return false;
        return true;
      }),
    [decisionFilter, priorityFilter, query, queueItems, statusFilter],
  );

  const totals = useMemo(
    () =>
      queueItems.reduce(
        (acc, item) => {
          if (activeStatuses.has(item.workflow.status)) acc.active += 1;
          if (item.workflow.priority === "High") acc.high += 1;
          if (item.workflow.status === "Blocked") acc.blocked += 1;
          if (item.product.imageStatus === "Missing" || item.product.imageStatus === "Partial") {
            acc.imageIssues += 1;
          }
          acc.stock += item.product.totalStock;
          acc.aprMay2026 += item.product.salesByPeriod.aprMay2026;
          return acc;
        },
        { active: 0, high: 0, blocked: 0, imageIssues: 0, stock: 0, aprMay2026: 0 },
      ),
    [queueItems],
  );

  return (
    <section className="screen action-queue-screen">
      <header className="topbar queue-topbar">
        <div className="title-block">
          <h1>Action Queue</h1>
          <span className="category-pill">Boys Sweat Shirts</span>
        </div>

        <div className="search-wrap">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search GenCode, owner, action, or trigger"
            aria-label="Search action queue"
          />
        </div>

        <div className="top-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => exportActionQueueCsv(filteredItems, "bodycare-action-queue.csv")}
          >
            <Download size={17} />
            Export Queue CSV
          </button>
        </div>
      </header>

      <div className="kpi-row">
        <KpiCard label="Queue GenCodes" value={number(queueItems.length)} />
        <KpiCard label="Active Actions" value={number(totals.active)} tone="warning" />
        <KpiCard label="High Priority" value={number(totals.high)} tone="danger" />
        <KpiCard label="Blocked" value={number(totals.blocked)} tone="danger" />
        <KpiCard label="Image Evidence Gaps" value={number(totals.imageIssues)} tone="warning" />
        <KpiCard label="Queued Stock" value={number(totals.stock)} />
        <KpiCard label="Queued Apr-May Sales" value={compact(totals.aprMay2026)} />
      </div>

      <div className="filter-bar">
        <span className="filter-label">
          <SlidersHorizontal size={16} />
          Queue Filters
        </span>
        <label className="filter-control">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
            <option>Active</option>
            <option>All</option>
            {ACTION_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="filter-control">
          <span>Priority</span>
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}
          >
            <option>All</option>
            {ACTION_PRIORITIES.map((priority) => (
              <option key={priority}>{priority}</option>
            ))}
          </select>
        </label>
        <label className="filter-control">
          <span>Decision</span>
          <select value={decisionFilter} onChange={(event) => setDecisionFilter(event.target.value as DecisionFilter)}>
            <option>All</option>
            {DECISIONS.map((decision) => (
              <option key={decision}>{decision}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="filter-result-bar">
        <span>
          Showing <b>{filteredItems.length}</b> of <b>{queueItems.length}</b> queue GenCodes
        </span>
        <span>Status: <b>{statusFilter}</b></span>
        <span>Priority: <b>{priorityFilter}</b></span>
        <span>Decision: <b>{decisionFilter}</b></span>
      </div>

      {!products.length ? (
        <div className="empty-state">
          <h2>Upload a workbook to build the action queue</h2>
          <p>The queue appears after product rows are available and recommendations can be evaluated.</p>
        </div>
      ) : !filteredItems.length ? (
        <div className="empty-state">
          <h2>No actions in this view</h2>
          <p>Change filters or review Done/Deferred items if you need older work.</p>
        </div>
      ) : (
        <div className="action-queue-list">
          {filteredItems.map(({ product, workflow, triggers }) => (
            <article className="action-queue-card" key={product.genCode}>
              <div className="queue-card-summary">
                <div>
                  <button type="button" className="link-button" onClick={() => onOpenDetail(product.genCode)}>
                    {product.genCode}
                  </button>
                  <p>
                    {product.brand} · {product.category} · {product.skuCount} SKUs
                  </p>
                </div>
                <span className={`decision-badge ${decisionClassName(product.effectiveDecision)}`}>
                  {product.effectiveDecision}
                </span>
              </div>

              <div className="queue-evidence-grid">
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
                <span>
                  <b>{product.recommendation.confidence}</b>
                  Confidence
                </span>
                <span>
                  <b>{product.recommendation.stockRiskScore}</b>
                  Stock risk
                </span>
                <span>
                  <b>{product.imageStatus}</b>
                  Image
                </span>
              </div>

              <div className="queue-trigger-row">
                {triggers.map((trigger) => (
                  <span key={trigger}>{trigger}</span>
                ))}
              </div>

              <p className="queue-reason">{product.recommendation.reason}</p>

              <WorkflowActionControls
                compact
                workflow={workflow}
                onChange={(patch) => onWorkflowChange(product.genCode, patch)}
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

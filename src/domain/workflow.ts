import type {
  ActionPriority,
  ActionStatus,
  Decision,
  GenCodeProduct,
  WorkflowActionState,
} from "../types";

export const ACTION_STATUSES: ActionStatus[] = [
  "Open",
  "In Progress",
  "Blocked",
  "Done",
  "Deferred",
];

export const ACTION_PRIORITIES: ActionPriority[] = ["High", "Medium", "Low"];

const queueDecisions = new Set<Decision>(["Liquidate", "Discontinue", "Needs Review"]);
const priorityRank: Record<ActionPriority, number> = { High: 3, Medium: 2, Low: 1 };
const statusRank: Record<ActionStatus, number> = {
  Blocked: 5,
  Open: 4,
  "In Progress": 3,
  Deferred: 2,
  Done: 1,
};

export interface ActionQueueItem {
  product: GenCodeProduct;
  workflow: WorkflowActionState;
  triggers: string[];
}

export interface ChallengeModeSummary {
  evidence: string[];
  weakAssumptions: string[];
  missingEvidence: string[];
}

export const queueTriggersForProduct = (product: GenCodeProduct) => {
  const triggers: string[] = [];

  if (queueDecisions.has(product.effectiveDecision)) {
    triggers.push(`${product.effectiveDecision} decision`);
  }
  if (product.recommendation.stockRiskScore === "High") {
    triggers.push("High stock risk");
  }
  if (product.recommendation.confidence === "Low") {
    triggers.push("Low confidence");
  }
  if (product.imageStatus === "Missing" || product.imageStatus === "Partial") {
    triggers.push(`${product.imageStatus} image evidence`);
  }
  if (product.genCode === "Needs Mapping") {
    triggers.push("Needs GenCode mapping");
  }

  return [...new Set(triggers)];
};

export const isActionQueueCandidate = (product: GenCodeProduct) =>
  queueTriggersForProduct(product).length > 0;

export const defaultPriorityForProduct = (product: GenCodeProduct): ActionPriority => {
  if (
    product.effectiveDecision === "Liquidate" ||
    product.effectiveDecision === "Discontinue" ||
    product.effectiveDecision === "Needs Review" ||
    product.recommendation.stockRiskScore === "High" ||
    product.recommendation.confidence === "Low"
  ) {
    return "High";
  }

  if (
    product.imageStatus === "Missing" ||
    product.imageStatus === "Partial" ||
    product.recommendation.confidence === "Medium" ||
    product.recommendation.stockRiskScore === "Medium"
  ) {
    return "Medium";
  }

  return "Low";
};

export const defaultWorkflowStateForProduct = (
  product: GenCodeProduct,
): WorkflowActionState => ({
  owner: "",
  dueDate: "",
  status: "Open",
  priority: defaultPriorityForProduct(product),
  nextAction: product.recommendation.suggestedAction,
  challengeResponse: "",
  updatedAt: "",
});

export const workflowStateForProduct = (
  product: GenCodeProduct,
  stored?: WorkflowActionState,
): WorkflowActionState => ({
  ...defaultWorkflowStateForProduct(product),
  ...stored,
});

export const buildActionQueue = (
  products: GenCodeProduct[],
  workflowActions: Record<string, WorkflowActionState>,
): ActionQueueItem[] =>
  products
    .filter(isActionQueueCandidate)
    .map((product) => ({
      product,
      workflow: workflowStateForProduct(product, workflowActions[product.genCode]),
      triggers: queueTriggersForProduct(product),
    }))
    .sort(
      (a, b) =>
        priorityRank[b.workflow.priority] - priorityRank[a.workflow.priority] ||
        statusRank[b.workflow.status] - statusRank[a.workflow.status] ||
        b.product.totalStock - a.product.totalStock ||
        a.product.genCode.localeCompare(b.product.genCode),
    );

export const challengeModeForProduct = (
  product: GenCodeProduct,
): ChallengeModeSummary => {
  const evidence = [
    `Recommended decision ${product.recommendation.decision} at ${product.recommendation.decisionScore}/100`,
    `Stock ${product.totalStock}, Apr-May 2026 sales ${product.salesByPeriod.aprMay2026}, stock risk ${product.recommendation.stockRiskScore}`,
    `${product.recommendation.historicalDemandScore} historical demand, ${product.recommendation.recentDemandScore} recent demand, ${product.recommendation.trendScore} trend`,
    `${product.recommendation.confidence} confidence, ${product.imageStatus} image status`,
  ];

  const weakAssumptions = [
    "Recent demand uses the Apr-May 2026 window, so seasonality or channel mix may distort the signal.",
  ];

  if (product.manualDecision && product.manualDecision.decision !== product.recommendation.decision) {
    weakAssumptions.push("Manual decision differs from the recommendation and needs a written reason.");
  }
  if (product.recommendation.confidence !== "High") {
    weakAssumptions.push("Confidence is not high, so the recommendation should not be treated as final.");
  }
  if (product.recommendation.stockCoverMonths === null) {
    weakAssumptions.push("Stock cover is unavailable because recent and historical demand are both too weak.");
  } else if (product.recommendation.stockCoverMonths >= 6) {
    weakAssumptions.push("Stock cover is elevated; check whether size balance or channel stock explains it.");
  }
  if (product.recommendation.trendScore === "Insufficient data") {
    weakAssumptions.push("Trend is based on insufficient active sales years.");
  }
  if (product.recommendation.lifecycleSignal === "No lifecycle flag") {
    weakAssumptions.push("Lifecycle context is missing, so catalog intent may be unclear.");
  }
  if (product.natures.some((nature) => nature.toLowerCase().includes("new"))) {
    weakAssumptions.push("New-product signals can look weak before a full selling cycle completes.");
  }

  const rowsMissingSku = product.variants.filter((row) => !row.sku).length;
  const rowsMissingGenCode = product.variants.filter((row) => !row.genCode).length;
  const hasAnySales = product.variants.some(
    (row) =>
      row.salesByPeriod.fy2023 > 0 ||
      row.salesByPeriod.fy2024 > 0 ||
      row.salesByPeriod.fy2025 > 0 ||
      row.salesByPeriod.aprMay2026 > 0,
  );
  const missingEvidence: string[] = [];

  if (rowsMissingSku) missingEvidence.push(`${rowsMissingSku} row(s) missing SKU`);
  if (rowsMissingGenCode) missingEvidence.push(`${rowsMissingGenCode} row(s) missing GenCode`);
  if (product.imageStatus === "Missing") missingEvidence.push("No usable product image mapped");
  if (product.imageStatus === "Partial") missingEvidence.push("Only some variants have images");
  if (!hasAnySales) missingEvidence.push("No sales evidence in detected periods");
  if (!product.seasonCodes.length) missingEvidence.push("No season code detected");
  if (!missingEvidence.length) missingEvidence.push("No critical evidence gap flagged");

  return {
    evidence,
    weakAssumptions: [...new Set(weakAssumptions)],
    missingEvidence,
  };
};

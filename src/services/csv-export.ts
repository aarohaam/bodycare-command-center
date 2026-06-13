import type { ActionQueueItem } from "../domain/workflow";
import { recentSalesLabel, recentSalesUnits } from "../domain/decision-engine";

const escapeCsv = (value: unknown) => {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
};

const downloadTextFile = (fileName: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const exportActionQueueCsv = (items: ActionQueueItem[], fileName: string) => {
  const headers = [
    "GenCode",
    "Brand",
    "Category",
    "Effective Decision",
    "Auto Decision",
    "Priority",
    "Status",
    "Owner",
    "Due Date",
    "Current Stock",
    "Historical Sales",
    "Last 30 Days Sales",
    "Last 90 Days Sales",
    "Recent Movement",
    "Recent Movement Basis",
    "Confidence",
    "Stock Risk",
    "Trend",
    "Image Status",
    "Queue Triggers",
    "Reason",
    "Suggested Action",
    "Next Action",
    "Challenge Response",
    "Updated At",
  ];

  const rows = items.map(({ product, workflow, triggers }) => [
    product.genCode,
    product.brand,
    product.category,
    product.effectiveDecision,
    product.recommendation.decision,
    workflow.priority,
    workflow.status,
    workflow.owner,
    workflow.dueDate,
    product.totalStock,
    product.historicalSalesTotal,
    product.salesByPeriod.last30Days ?? 0,
    product.salesByPeriod.last90Days ?? 0,
    recentSalesUnits(product.salesByPeriod),
    recentSalesLabel(product.salesByPeriod),
    product.recommendation.confidence,
    product.recommendation.stockRiskScore,
    product.recommendation.trendScore,
    product.imageStatus,
    triggers.join("; "),
    product.recommendation.reason,
    product.recommendation.suggestedAction,
    workflow.nextAction,
    workflow.challengeResponse,
    workflow.updatedAt,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");

  downloadTextFile(fileName, csv, "text/csv;charset=utf-8");
};

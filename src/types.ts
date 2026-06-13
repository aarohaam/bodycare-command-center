export type Decision =
  | "Continue"
  | "Refresh"
  | "Micro-test"
  | "Liquidate"
  | "Discontinue"
  | "Needs Review";

export type Confidence = "High" | "Medium" | "Low";
export type RiskLevel = "Low" | "Medium" | "High";
export type DemandScore = "Low" | "Medium" | "High";
export type TrendScore = "Improving" | "Declining" | "Flat" | "Insufficient data";
export type ImageStatus = "Ready" | "Partial" | "Missing" | "Review";
export type ActionStatus = "Open" | "In Progress" | "Blocked" | "Done" | "Deferred";
export type ActionPriority = "High" | "Medium" | "Low";

export type SalesPeriodKey =
  | "fy2023"
  | "fy2024"
  | "fy2025"
  | "last30Days"
  | "last90Days"
  | "aprMay2026";

export interface SalesByPeriod {
  fy2023: number;
  fy2024: number;
  fy2025: number;
  last30Days: number;
  last90Days: number;
  aprMay2026: number;
}

export interface ProductRow {
  id: string;
  brand: string;
  category: string;
  season: string;
  seasonCode: string;
  genCode: string;
  sku: string;
  color: string;
  size: string;
  nature: string;
  stock: number;
  currentStock: number;
  tronicaStock: number;
  mrp: number;
  amazonSellingPrice: number;
  salesByPeriod: SalesByPeriod;
  imageUrls: string[];
  imageStatus: ImageStatus;
  importedAt: string;
  sourceRow: number;
}

export interface RulesConfig {
  historicalHigh: number;
  historicalMedium: number;
  recentHigh: number;
  recentMedium: number;
  highStock: number;
  mediumStock: number;
  manageableStock: number;
  healthySellThrough: number;
  weakSellThrough: number;
  highCoverMonths: number;
  staleSeasonYears: number;
}

export interface DecisionResult {
  decision: Decision;
  confidence: Confidence;
  reason: string;
  suggestedAction: string;
  riskLevel: RiskLevel;
  historicalDemandScore: DemandScore;
  recentDemandScore: DemandScore;
  stockRiskScore: RiskLevel;
  trendScore: TrendScore;
  sellThroughRate: number;
  stockCoverMonths: number | null;
  catalogAgeYears: number | null;
  lifecycleSignal: string;
  decisionScore: number;
  analyticsSummary: string[];
}

export interface DecisionOverride {
  decision: Decision;
  updatedAt: string;
}

export interface NotesState {
  directorNote: string;
  merchandisingNote: string;
  followUpAction: string;
  updatedAt?: string;
}

export interface WorkflowActionState {
  owner: string;
  dueDate: string;
  status: ActionStatus;
  priority: ActionPriority;
  nextAction: string;
  challengeResponse: string;
  updatedAt?: string;
}

export interface ImageMapping {
  id: string;
  target: string;
  targetType: "genCode" | "sku";
  fileName: string;
  dataUrl: string;
  mappedAt: string;
}

export interface GenCodeProduct {
  genCode: string;
  brand: string;
  category: string;
  season: string;
  seasonCodes: string[];
  colors: string[];
  natures: string[];
  variants: ProductRow[];
  skuCount: number;
  totalStock: number;
  currentStock: number;
  tronicaStock: number;
  salesByPeriod: SalesByPeriod;
  historicalSalesTotal: number;
  imageUrls: string[];
  imageStatus: ImageStatus;
  importedAt: string;
  recommendation: DecisionResult;
  manualDecision?: DecisionOverride;
  effectiveDecision: Decision;
  notes?: NotesState;
}

export interface ParseSummary {
  fileName: string;
  sheetName: string;
  detectedColumns: Record<string, string | null>;
  rowsParsed: number;
  genCodes: number;
  skus: number;
  imagesFound: number;
  embeddedImagesFound: number;
  missingFields: string[];
  duplicateRows: number;
  warnings: string[];
}

export interface ImportMergeSummary {
  added: number;
  updated: number;
  unchanged: number;
  totalAfterImport: number;
}

export interface ParsedWorkbook {
  rows: ProductRow[];
  summary: ParseSummary;
  embeddedImages: ImageMapping[];
}

export interface DataQualitySummary {
  missingGenCode: number;
  missingSku: number;
  missingStock: number;
  missingSalesColumns: string[];
  missingImages: number;
  duplicateRows: number;
  unmappedImages: number;
  lowConfidenceGenCodes: number;
}

import { Grid2X2, ListChecks, PanelRightOpen } from "lucide-react";
import { useMemo, useState } from "react";
import productRows from "#productRows";
import { ActionQueuePage } from "../features/action-queue/ActionQueuePage";
import { CommandCenterPage } from "../features/command-center/CommandCenterPage";
import { DataQualityDrawer } from "../features/data-quality/DataQualityDrawer";
import { GenCodeDetailPage } from "../features/command-center/GenCodeDetailPage";
import { ProductImageMappingDrawer } from "../features/image-mapping/ProductImageMappingDrawer";
import { DecisionRulesDrawer } from "../features/rules/DecisionRulesDrawer";
import { WorkbookUploadDrawer } from "../features/workbook-import/WorkbookUploadDrawer";
import { applyImageMappings, mergeImportedRows } from "../services/workbook-parser";
import { calculateQualitySummary, groupRowsByGenCode } from "../domain/decision-engine";
import {
  loadDecisions,
  loadImageMappings,
  loadNotes,
  loadRules,
  loadStoredRows,
  loadWorkflowActions,
  saveDecisions,
  saveImageMappings,
  saveNotes,
  saveRules,
  saveStoredRows,
  saveWorkflowActions,
} from "../services/local-storage-store";
import { workflowStateForProduct } from "../domain/workflow";
import type {
  Decision,
  ImageMapping,
  ImportMergeSummary,
  NotesState,
  ProductRow,
  WorkflowActionState,
} from "../types";

type Screen = "command" | "queue" | "detail";
type DrawerName = "upload" | "images" | "rules" | "quality" | null;

const normalizeProductRow = (row: ProductRow): ProductRow => {
  const stock = row.stock ?? (row.currentStock ?? 0) + (row.tronicaStock ?? 0);

  return {
    ...row,
    stock,
    currentStock: row.currentStock ?? stock,
    tronicaStock: row.tronicaStock ?? 0,
    mrp: row.mrp ?? 0,
    amazonSellingPrice: row.amazonSellingPrice ?? 0,
    salesByPeriod: {
      fy2023: row.salesByPeriod?.fy2023 ?? 0,
      fy2024: row.salesByPeriod?.fy2024 ?? 0,
      fy2025: row.salesByPeriod?.fy2025 ?? 0,
      last30Days: row.salesByPeriod?.last30Days ?? 0,
      last90Days: row.salesByPeriod?.last90Days ?? 0,
      aprMay2026: row.salesByPeriod?.aprMay2026 ?? 0,
    },
  };
};

const seededRows = (productRows as ProductRow[]).map(normalizeProductRow);

export default function App() {
  const [rows, setRows] = useState<ProductRow[]>(() =>
    (loadStoredRows() || seededRows).map(normalizeProductRow),
  );
  const [manualDecisions, setManualDecisions] = useState(() => loadDecisions());
  const [notes, setNotes] = useState(() => loadNotes());
  const [workflowActions, setWorkflowActions] = useState(() => loadWorkflowActions());
  const [rules, setRules] = useState(() => loadRules());
  const [mappings, setMappings] = useState<ImageMapping[]>(() => loadImageMappings());
  const [embeddedImages, setEmbeddedImages] = useState<ImageMapping[]>([]);
  const [lastImportMerge, setLastImportMerge] = useState<ImportMergeSummary | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<DrawerName>(null);
  const [screen, setScreen] = useState<Screen>("command");
  const [selectedGenCode, setSelectedGenCode] = useState("");

  const rowsWithMappings = useMemo(() => applyImageMappings(rows, mappings), [mappings, rows]);

  const products = useMemo(
    () => groupRowsByGenCode(rowsWithMappings, rules, manualDecisions, notes),
    [manualDecisions, notes, rowsWithMappings, rules],
  );

  const selectedProduct = useMemo(
    () =>
      products.find((product) => product.genCode === selectedGenCode) ||
      products.find((product) => product.genCode !== "Needs Mapping") ||
      products[0],
    [products, selectedGenCode],
  );

  const brandOptions = useMemo(
    () => [...new Set(products.map((product) => product.brand).filter(Boolean))].sort(),
    [products],
  );

  const categoryOptions = useMemo(
    () => [...new Set(products.map((product) => product.category).filter(Boolean))].sort(),
    [products],
  );

  const quality = useMemo(
    () => calculateQualitySummary(rowsWithMappings, products, embeddedImages.filter((image) => !image.target).length),
    [embeddedImages, products, rowsWithMappings],
  );

  const openDetail = (genCode: string) => {
    setSelectedGenCode(genCode);
    setScreen("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveDecision = (genCode: string, decision: Decision) => {
    const next = {
      ...manualDecisions,
      [genCode]: { decision, updatedAt: new Date().toISOString() },
    };
    setManualDecisions(next);
    saveDecisions(next);
  };

  const saveProductNotes = (genCode: string, nextNotes: NotesState) => {
    const next = { ...notes, [genCode]: nextNotes };
    setNotes(next);
    saveNotes(next);
  };

  const saveWorkflowAction = (genCode: string, patch: Partial<WorkflowActionState>) => {
    const product = products.find((item) => item.genCode === genCode);
    const current = product
      ? workflowStateForProduct(product, workflowActions[genCode])
      : {
          owner: "",
          dueDate: "",
          status: "Open",
          priority: "Medium",
          nextAction: "",
          challengeResponse: "",
          updatedAt: "",
        } satisfies WorkflowActionState;
    const next = {
      ...workflowActions,
      [genCode]: {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    };
    setWorkflowActions(next);
    saveWorkflowActions(next);
  };

  const importRows = (nextRows: ProductRow[], nextEmbeddedImages: ImageMapping[]) => {
    const normalizedRows = nextRows.map(normalizeProductRow);
    const merged = mergeImportedRows(rows, normalizedRows);
    setRows(merged.rows);
    saveStoredRows(merged.rows);
    setLastImportMerge(merged.summary);
    setEmbeddedImages(nextEmbeddedImages);
    setSelectedGenCode(normalizedRows[0]?.genCode || selectedGenCode);
    setScreen("command");
  };

  const saveImageMap = (nextMappings: ImageMapping[]) => {
    setMappings(nextMappings);
    saveImageMappings(nextMappings);
  };

  const saveRuleConfig = (nextRules: typeof rules) => {
    setRules(nextRules);
    saveRules(nextRules);
  };

  return (
    <div className="app-shell">
      <nav className="side-nav" aria-label="Main navigation">
        <div className="brand-mark">
          <span>BC</span>
        </div>
        <button
          className={screen === "command" ? "active" : ""}
          type="button"
          onClick={() => setScreen("command")}
        >
          <Grid2X2 size={18} />
          Command Centre
        </button>
        <button
          className={screen === "queue" ? "active" : ""}
          type="button"
          onClick={() => setScreen("queue")}
        >
          <ListChecks size={18} />
          Action Queue
        </button>
        <button
          className={screen === "detail" ? "active" : ""}
          type="button"
          onClick={() => {
            if (selectedProduct) {
              setSelectedGenCode(selectedProduct.genCode);
              setScreen("detail");
            }
          }}
        >
          <PanelRightOpen size={18} />
          GenCode Detail
        </button>
      </nav>

      <main>
        {screen === "queue" ? (
          <ActionQueuePage
            products={products}
            workflowActions={workflowActions}
            onWorkflowChange={saveWorkflowAction}
            onOpenDetail={openDetail}
          />
        ) : screen === "command" || !selectedProduct ? (
          <CommandCenterPage
            products={products}
            totalRows={rowsWithMappings.length}
            brandOptions={brandOptions}
            categoryOptions={categoryOptions}
            lastImportMerge={lastImportMerge}
            onOpenDetail={openDetail}
            onOpenUpload={() => setActiveDrawer("upload")}
            onOpenRules={() => setActiveDrawer("rules")}
            onOpenDataQuality={() => setActiveDrawer("quality")}
            onMarkDecision={(genCode) => {
              setSelectedGenCode(genCode);
              setActiveDrawer(null);
              setScreen("detail");
            }}
          />
        ) : (
          <GenCodeDetailPage
            product={selectedProduct}
            onBack={() => setScreen("command")}
            onDecisionChange={saveDecision}
            onNotesChange={saveProductNotes}
            workflowAction={workflowStateForProduct(
              selectedProduct,
              workflowActions[selectedProduct.genCode],
            )}
            onWorkflowChange={saveWorkflowAction}
            onOpenImageMapping={() => setActiveDrawer("images")}
          />
        )}
      </main>

      <WorkbookUploadDrawer
        open={activeDrawer === "upload"}
        onClose={() => setActiveDrawer(null)}
        onImport={importRows}
        existingRows={rows.length}
      />
      <ProductImageMappingDrawer
        open={activeDrawer === "images"}
        onClose={() => setActiveDrawer(null)}
        products={products}
        mappings={mappings}
        embeddedImages={embeddedImages}
        onSave={saveImageMap}
      />
      <DecisionRulesDrawer
        open={activeDrawer === "rules"}
        onClose={() => setActiveDrawer(null)}
        rules={rules}
        onSave={saveRuleConfig}
      />
      <DataQualityDrawer
        open={activeDrawer === "quality"}
        onClose={() => setActiveDrawer(null)}
        quality={quality}
      />
    </div>
  );
}

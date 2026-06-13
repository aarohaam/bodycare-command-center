import { Grid2X2, PanelRightOpen } from "lucide-react";
import { useMemo, useState } from "react";
import seedRows from "#seedRows";
import { CommandCenter } from "./components/CommandCenter";
import { DataQualityDrawer } from "./components/DataQualityDrawer";
import { GenCodeDetail } from "./components/GenCodeDetail";
import { ImageMappingDrawer } from "./components/ImageMappingDrawer";
import { RulesDrawer } from "./components/RulesDrawer";
import { UploadDrawer } from "./components/UploadDrawer";
import { applyImageMappings, mergeImportedRows } from "./lib/DataParser";
import { calculateQualitySummary, groupRowsByGenCode } from "./lib/DecisionEngine";
import {
  loadDecisions,
  loadImageMappings,
  loadNotes,
  loadRules,
  loadStoredRows,
  saveDecisions,
  saveImageMappings,
  saveNotes,
  saveRules,
  saveStoredRows,
} from "./lib/storage";
import type { Decision, ImageMapping, ImportMergeSummary, NotesState, ProductRow } from "./types";

type Screen = "command" | "detail";
type DrawerName = "upload" | "images" | "rules" | "quality" | null;

const seededRows = seedRows as ProductRow[];

export default function App() {
  const [rows, setRows] = useState<ProductRow[]>(() => loadStoredRows() || seededRows);
  const [manualDecisions, setManualDecisions] = useState(() => loadDecisions());
  const [notes, setNotes] = useState(() => loadNotes());
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

  const importRows = (nextRows: ProductRow[], nextEmbeddedImages: ImageMapping[]) => {
    const merged = mergeImportedRows(rows, nextRows);
    setRows(merged.rows);
    saveStoredRows(merged.rows);
    setLastImportMerge(merged.summary);
    setEmbeddedImages(nextEmbeddedImages);
    setSelectedGenCode(nextRows[0]?.genCode || selectedGenCode);
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
          Command Center
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
        {screen === "command" || !selectedProduct ? (
          <CommandCenter
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
          <GenCodeDetail
            product={selectedProduct}
            onBack={() => setScreen("command")}
            onDecisionChange={saveDecision}
            onNotesChange={saveProductNotes}
            onOpenImageMapping={() => setActiveDrawer("images")}
          />
        )}
      </main>

      <UploadDrawer
        open={activeDrawer === "upload"}
        onClose={() => setActiveDrawer(null)}
        onImport={importRows}
        existingRows={rows.length}
      />
      <ImageMappingDrawer
        open={activeDrawer === "images"}
        onClose={() => setActiveDrawer(null)}
        products={products}
        mappings={mappings}
        embeddedImages={embeddedImages}
        onSave={saveImageMap}
      />
      <RulesDrawer
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

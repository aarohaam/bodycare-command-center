import { CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { useState } from "react";
import type { ImageMapping, ParsedWorkbook, ProductRow } from "../types";
import { parseWorkbookFile } from "../lib/DataParser";
import { Drawer } from "./Drawer";

interface UploadDrawerProps {
  open: boolean;
  onClose: () => void;
  onImport: (rows: ProductRow[], embeddedImages: ImageMapping[]) => void;
}

export function UploadDrawer({ open, onClose, onImport }: UploadDrawerProps) {
  const [parsed, setParsed] = useState<ParsedWorkbook | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const parseFile = async (file: File) => {
    setLoading(true);
    setError("");
    try {
      const result = await parseWorkbookFile(file);
      setParsed(result);
    } catch (issue) {
      console.error(issue);
      setError("Workbook could not be parsed. Check that it is an .xlsx file with a visible data sheet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Upload Workbook"
      subtitle="Import Boys Sweat Shirts data and confirm before replacing the current command center."
    >
      <label className="drop-zone">
        <FileUp size={28} />
        <strong>Upload Excel file</strong>
        <span>Supports .xlsx files with GenCode/SKU, stock, sales, and image URL columns.</span>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void parseFile(file);
          }}
        />
      </label>

      {loading ? (
        <div className="inline-status">
          <Loader2 className="spin" size={18} />
          Parsing workbook
        </div>
      ) : null}

      {error ? <div className="error-box">{error}</div> : null}

      {parsed ? (
        <div className="parse-summary">
          <div className="success-line">
            <CheckCircle2 size={18} />
            Workbook parsed
          </div>
          <div className="summary-grid">
            <span>
              Rows parsed
              <b>{parsed.summary.rowsParsed}</b>
            </span>
            <span>
              GenCodes
              <b>{parsed.summary.genCodes}</b>
            </span>
            <span>
              SKUs
              <b>{parsed.summary.skus}</b>
            </span>
            <span>
              Images found
              <b>{parsed.summary.imagesFound}</b>
            </span>
            <span>
              Embedded images
              <b>{parsed.summary.embeddedImagesFound}</b>
            </span>
            <span>
              Duplicates
              <b>{parsed.summary.duplicateRows}</b>
            </span>
          </div>

          <h3>Detected columns</h3>
          <div className="detected-columns">
            {Object.entries(parsed.summary.detectedColumns).map(([field, column]) => (
              <span key={field} className={column ? "detected" : "missing"}>
                {field}: <b>{column || "Missing"}</b>
              </span>
            ))}
          </div>

          {parsed.summary.missingFields.length ? (
            <div className="warning-box">
              Missing fields: {parsed.summary.missingFields.join(", ")}
            </div>
          ) : null}
          {parsed.summary.warnings.map((warning) => (
            <div className="warning-box" key={warning}>
              {warning}
            </div>
          ))}

          <button
            className="primary-button full"
            type="button"
            onClick={() => {
              onImport(parsed.rows, parsed.embeddedImages);
              onClose();
            }}
          >
            Confirm Import
          </button>
        </div>
      ) : null}
    </Drawer>
  );
}

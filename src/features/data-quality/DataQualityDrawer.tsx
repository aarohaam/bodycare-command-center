import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { DataQualitySummary } from "../../types";
import { Drawer } from "../../ui/Drawer";

interface DataQualityDrawerProps {
  open: boolean;
  onClose: () => void;
  quality: DataQualitySummary;
}

const rows = [
  ["Missing GenCode", "missingGenCode"],
  ["Missing SKU", "missingSku"],
  ["Missing stock", "missingStock"],
  ["Missing images", "missingImages"],
  ["Duplicate rows", "duplicateRows"],
  ["Unmapped images", "unmappedImages"],
  ["Low confidence GenCodes", "lowConfidenceGenCodes"],
] as const;

export function DataQualityDrawer({ open, onClose, quality }: DataQualityDrawerProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Data Quality"
      subtitle="Simple checklist only, scoped to the current imported workbook."
    >
      <div className="quality-list">
        {rows.map(([label, key]) => {
          const value = quality[key];
          return (
            <div className="quality-row" key={key}>
              {value ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              <span>{label}</span>
              <b>{value}</b>
            </div>
          );
        })}
        <div className="quality-row">
          {quality.missingSalesColumns.length ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>Missing sales columns</span>
          <b>{quality.missingSalesColumns.length ? quality.missingSalesColumns.join(", ") : "0"}</b>
        </div>
      </div>
    </Drawer>
  );
}

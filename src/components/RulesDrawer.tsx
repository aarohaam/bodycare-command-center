import { RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import type { RulesConfig } from "../types";
import { DEFAULT_RULES } from "../lib/DecisionEngine";
import { Drawer } from "./Drawer";

interface RulesDrawerProps {
  open: boolean;
  onClose: () => void;
  rules: RulesConfig;
  onSave: (rules: RulesConfig) => void;
}

const labels: Record<keyof RulesConfig, string> = {
  historicalHigh: "Historical high demand",
  historicalMedium: "Historical medium demand",
  recentHigh: "Recent high demand",
  recentMedium: "Recent medium demand",
  highStock: "High stock threshold",
  mediumStock: "Medium stock threshold",
  manageableStock: "Manageable stock threshold",
  healthySellThrough: "Healthy sell-through proxy",
  weakSellThrough: "Weak sell-through proxy",
  highCoverMonths: "High stock-cover months",
  staleSeasonYears: "Stale season age years",
};

export function RulesDrawer({ open, onClose, rules, onSave }: RulesDrawerProps) {
  const [draft, setDraft] = useState<RulesConfig>(rules);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Settings / Rules"
      subtitle="Transparent thresholds behind Continue, Refresh, Micro-test, Liquidate, Discontinue, and Needs Review."
    >
      <div className="rules-explainer">
        <h3>Default decision logic</h3>
        <p>
          Continue favors strong history plus recent movement. Refresh catches strong history with weak recent
          movement. Micro-test is for uncertain demand. Liquidate and Discontinue protect against high stock,
          weak demand, poor sell-through, high stock cover, and stale catalog age. Needs Review appears when data
          or image confidence is low.
        </p>
      </div>

      <div className="rules-grid">
        {(Object.keys(draft) as Array<keyof RulesConfig>).map((key) => (
          <label key={key}>
            {labels[key]}
            <input
              type="number"
              min="0"
              value={draft[key]}
              onChange={(event) => setDraft((current) => ({ ...current, [key]: Number(event.target.value) }))}
            />
          </label>
        ))}
      </div>

      <div className="drawer-actions">
        <button className="ghost-button" type="button" onClick={() => setDraft(DEFAULT_RULES)}>
          <RotateCcw size={16} />
          Reset Defaults
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            onSave(draft);
            onClose();
          }}
        >
          <Save size={16} />
          Save Rules
        </button>
      </div>
    </Drawer>
  );
}

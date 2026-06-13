import type { DecisionOverride, ImageMapping, NotesState, ProductRow, RulesConfig } from "../types";
import { DEFAULT_RULES } from "./DecisionEngine";

const prefix = "bodycare-command-center-v01";

const keys = {
  rows: `${prefix}:rows`,
  decisions: `${prefix}:decisions`,
  notes: `${prefix}:notes`,
  rules: `${prefix}:rules`,
  images: `${prefix}:images`,
};

const safeRead = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const safeWrite = (key: string, value: unknown) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Local storage write failed", error);
  }
};

export const loadStoredRows = () => safeRead<ProductRow[] | null>(keys.rows, null);
export const saveStoredRows = (rows: ProductRow[]) => safeWrite(keys.rows, rows);

export const loadDecisions = () => safeRead<Record<string, DecisionOverride>>(keys.decisions, {});
export const saveDecisions = (value: Record<string, DecisionOverride>) =>
  safeWrite(keys.decisions, value);

export const loadNotes = () => safeRead<Record<string, NotesState>>(keys.notes, {});
export const saveNotes = (value: Record<string, NotesState>) => safeWrite(keys.notes, value);

export const loadRules = () => safeRead<RulesConfig>(keys.rules, DEFAULT_RULES);
export const saveRules = (value: RulesConfig) => safeWrite(keys.rules, value);

export const loadImageMappings = () => safeRead<ImageMapping[]>(keys.images, []);
export const saveImageMappings = (value: ImageMapping[]) => safeWrite(keys.images, value);

export const clearImportedRows = () => window.localStorage.removeItem(keys.rows);

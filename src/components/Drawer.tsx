import { X } from "lucide-react";
import type { ReactNode } from "react";

interface DrawerProps {
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Drawer({ title, subtitle, open, onClose, children }: DrawerProps) {
  if (!open) return null;

  return (
    <div className="drawer-layer" role="dialog" aria-modal="true" aria-label={title}>
      <button className="drawer-backdrop" aria-label="Close drawer" onClick={onClose} />
      <aside className="drawer-panel">
        <header className="drawer-header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}

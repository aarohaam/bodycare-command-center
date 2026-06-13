import { ImagePlus, Link2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { GenCodeProduct, ImageMapping } from "../types";
import { Drawer } from "./Drawer";
import { ProductImage } from "./ProductImage";

interface ImageMappingDrawerProps {
  open: boolean;
  onClose: () => void;
  products: GenCodeProduct[];
  mappings: ImageMapping[];
  embeddedImages: ImageMapping[];
  onSave: (mappings: ImageMapping[]) => void;
}

const fileToDataUrl = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const inferTarget = (fileName: string, products: GenCodeProduct[]) => {
  const lower = fileName.toLowerCase();
  const gen = products.find((product) => lower.includes(product.genCode.toLowerCase()));
  if (gen) return { target: gen.genCode, targetType: "genCode" as const };
  const sku = products
    .flatMap((product) => product.variants)
    .find((variant) => lower.includes(variant.sku.toLowerCase()));
  if (sku) return { target: sku.sku, targetType: "sku" as const };
  return { target: "", targetType: "genCode" as const };
};

export function ImageMappingDrawer({
  open,
  onClose,
  products,
  mappings,
  embeddedImages,
  onSave,
}: ImageMappingDrawerProps) {
  const [draft, setDraft] = useState<ImageMapping[]>([]);

  useEffect(() => {
    if (!open) return;
    setDraft((current) => {
      const ids = new Set(current.map((item) => item.id));
      const queued = embeddedImages.filter((image) => !image.target && !ids.has(image.id));
      return queued.length ? [...current, ...queued] : current;
    });
  }, [embeddedImages, open]);

  const missingProducts = useMemo(
    () => products.filter((product) => product.imageStatus === "Missing").slice(0, 24),
    [products],
  );

  const addFiles = async (files: FileList | File[]) => {
    const items = Array.from(files);
    const next: ImageMapping[] = [];

    for (const file of items) {
      if (/\.zip$/i.test(file.name)) {
        const { default: JSZip } = await import("jszip");
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        const entries = Object.values(zip.files).filter((entry) =>
          /\.(png|jpe?g|webp)$/i.test(entry.name),
        );
        for (const entry of entries) {
          const blob = await entry.async("blob");
          const inferred = inferTarget(entry.name, products);
          next.push({
            id: `${entry.name}-${Date.now()}`,
            fileName: entry.name.split("/").pop() || entry.name,
            dataUrl: await fileToDataUrl(blob),
            mappedAt: new Date().toISOString(),
            ...inferred,
          });
        }
      } else if (/image\//.test(file.type)) {
        const inferred = inferTarget(file.name, products);
        next.push({
          id: `${file.name}-${Date.now()}`,
          fileName: file.name,
          dataUrl: await fileToDataUrl(file),
          mappedAt: new Date().toISOString(),
          ...inferred,
        });
      }
    }
    setDraft((current) => [...current, ...next]);
  };

  const updateDraft = (id: string, patch: Partial<ImageMapping>) => {
    setDraft((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Image Mapping"
      subtitle="Use image links from the workbook first; map extra images only where needed."
    >
      <div className="mapping-top">
        <label className="drop-zone compact">
          <Upload size={24} />
          <strong>Manual image or ZIP upload</strong>
          <span>File names containing GenCode or SKU are matched automatically when possible.</span>
          <input
            type="file"
            accept=".zip,image/*"
            multiple
            onChange={(event) => {
              if (event.target.files) void addFiles(event.target.files);
            }}
          />
        </label>
        <div className="mapping-stats">
          <span>
            Saved mappings
            <b>{mappings.length}</b>
          </span>
          <span>
            Embedded workbook images
            <b>{embeddedImages.length}</b>
          </span>
          <span>
            Missing image GenCodes
            <b>{missingProducts.length}</b>
          </span>
        </div>
      </div>

      <h3>Missing image GenCodes</h3>
      <div className="missing-list">
        {missingProducts.length ? (
          missingProducts.map((product) => (
            <button
              type="button"
              key={product.genCode}
              onClick={() =>
                setDraft((current) => [
                  ...current,
                  {
                    id: `placeholder-${product.genCode}-${Date.now()}`,
                    target: product.genCode,
                    targetType: "genCode",
                    fileName: "Awaiting manual image",
                    dataUrl: "",
                    mappedAt: "",
                  },
                ])
              }
            >
              <ImagePlus size={14} />
              {product.genCode}
            </button>
          ))
        ) : (
          <p className="muted">No fully missing GenCodes in the current view.</p>
        )}
      </div>

      <h3>Unmapped images</h3>
      {!draft.length ? (
        <div className="empty-state small">
          <h2>No unmapped images queued</h2>
          <p>Upload images or a ZIP folder to map additional product visuals.</p>
        </div>
      ) : (
        <div className="mapping-list">
          {draft.map((item) => (
            <div className="mapping-row" key={item.id}>
              <ProductImage urls={item.dataUrl ? [item.dataUrl] : []} label={item.fileName} size="thumb" />
              <div>
                <strong>{item.fileName}</strong>
                <span>{item.target ? "Ready to save" : "Needs target"}</span>
              </div>
              <select
                value={item.targetType}
                onChange={(event) =>
                  updateDraft(item.id, { targetType: event.target.value as ImageMapping["targetType"] })
                }
              >
                <option value="genCode">GenCode</option>
                <option value="sku">SKU</option>
              </select>
              <input
                value={item.target}
                placeholder="GenCode or SKU"
                onChange={(event) => updateDraft(item.id, { target: event.target.value })}
              />
            </div>
          ))}
        </div>
      )}

      <button
        className="primary-button full"
        type="button"
        onClick={() => {
          const ready = draft.filter((item) => item.dataUrl && item.target.trim());
          onSave([...mappings, ...ready.map((item) => ({ ...item, mappedAt: new Date().toISOString() }))]);
          setDraft([]);
          onClose();
        }}
      >
        <Link2 size={16} />
        Save Image Mappings
      </button>
    </Drawer>
  );
}

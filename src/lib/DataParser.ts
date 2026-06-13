import type { ImageMapping, ParsedWorkbook, ParseSummary, ProductRow } from "../types";

type MatrixRow = Array<string | number | boolean | Date | null | undefined>;

const aliases: Record<string, string[]> = {
  imageLink: ["image link", "image url", "product image", "image", "photo", "image url/link"],
  sku: ["item sku code", "sku", "sku code", "item code", "product sku"],
  genCode: ["super_gen", "super gen", "gencode", "gen code", "style code", "parent sku"],
  brand: ["brand"],
  category: ["category", "cat"],
  color: ["color", "colour"],
  size: ["size"],
  nature: ["nature", "status", "product nature"],
  seasonCode: ["season code", "season_code"],
  season: ["season"],
  fy2023: ["fy 2023-2024", "fy 2023-24", "2023-2024", "2023-24", "fy23"],
  fy2024: ["fy 2024-2025", "fy 2024-25", "2024-2025", "2024-25", "fy24"],
  fy2025: ["fy 2025-2026", "fy 2025-26", "2025-2026", "2025-26", "fy25"],
  aprMay2026: ["apr- may 2026", "apr-may 2026", "apr may 2026", "april may 2026"],
  currentStock: ["current stock", "stock"],
  tronicaStock: ["tronica stock"],
  totalStock: ["total stock", "total inventory", "inventory"],
};

const canonicalHeader = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\n\r\t]+/g, " ")
    .replace(/\s+/g, " ");

const compactHeader = (value: unknown) => canonicalHeader(value).replace(/[^a-z0-9]+/g, "");

const valueToString = (value: unknown) => String(value ?? "").trim();

const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  const text = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();
  if (!text) return 0;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
};

const splitImageUrls = (value: unknown) => {
  const text = valueToString(value);
  if (!text || text === "#VALUE!" || text === "#N/A") return [];
  return text
    .split(/[\n,;|]+/)
    .map((url) => url.trim())
    .filter((url) => /^https?:\/\//i.test(url) || /^data:image\//i.test(url));
};

const detectHeaderRow = (rows: MatrixRow[]) => {
  let bestIndex = 0;
  let bestScore = 0;
  rows.slice(0, 20).forEach((row, rowIndex) => {
    const cells = row.map(canonicalHeader);
    const score = Object.values(aliases).reduce((total, names) => {
      const hit = names.some((name) => cells.includes(canonicalHeader(name)));
      return total + (hit ? 1 : 0);
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = rowIndex;
    }
  });
  return bestIndex;
};

const detectColumns = (headers: MatrixRow) => {
  const normalized = headers.map(canonicalHeader);
  const compact = headers.map(compactHeader);
  const detected: Record<string, number | null> = {};

  Object.entries(aliases).forEach(([field, names]) => {
    const directIndex = names
      .map(canonicalHeader)
      .map((name) => normalized.findIndex((header) => header === name))
      .find((index) => index >= 0);
    const compactIndex = names
      .map(compactHeader)
      .map((name) => compact.findIndex((header) => header === name))
      .find((index) => index >= 0);
    detected[field] = directIndex ?? compactIndex ?? null;
  });

  return detected;
};

const get = (row: MatrixRow, columns: Record<string, number | null>, key: string) => {
  const index = columns[key];
  return typeof index === "number" ? row[index] : undefined;
};

const inferGenCode = (sku: string) => {
  const match = sku.match(/^([A-Z]{2,}\d+[A-Z]?)(?:[-_]|$)/i);
  return match?.[1] || "";
};

export const rowsFromMatrix = (
  matrix: MatrixRow[],
  fileName: string,
  sheetName: string,
): { rows: ProductRow[]; summary: ParseSummary } => {
  if (!matrix.length) {
    return {
      rows: [],
      summary: {
        fileName,
        sheetName,
        detectedColumns: {},
        rowsParsed: 0,
        genCodes: 0,
        skus: 0,
        imagesFound: 0,
        embeddedImagesFound: 0,
        missingFields: ["Workbook has no rows"],
        duplicateRows: 0,
        warnings: ["No data rows were found."],
      },
    };
  }

  const headerIndex = detectHeaderRow(matrix);
  const headers = matrix[headerIndex] || [];
  const columns = detectColumns(headers);
  const required = ["sku", "genCode", "totalStock", "fy2023", "fy2024", "fy2025", "aprMay2026"];
  const missingFields = required.filter((field) => columns[field] == null);
  const dataRows = matrix.slice(headerIndex + 1);
  const importedAt = new Date().toISOString();
  const seen = new Set<string>();
  let duplicateRows = 0;

  const rows = dataRows
    .map((row, index): ProductRow | null => {
      const sku = valueToString(get(row, columns, "sku"));
      const explicitGenCode = valueToString(get(row, columns, "genCode"));
      const genCode = explicitGenCode || inferGenCode(sku);
      const imageUrls = [
        ...splitImageUrls(get(row, columns, "imageLink")),
        ...splitImageUrls(get(row, columns, "image")),
      ];

      const hasAnyValue = row.some((value) => value !== null && value !== undefined && value !== "");
      if (!hasAnyValue || (!sku && !genCode)) return null;

      const currentStock = toNumber(get(row, columns, "currentStock"));
      const tronicaStock = toNumber(get(row, columns, "tronicaStock"));
      const totalStock = toNumber(get(row, columns, "totalStock"));
      const stock = totalStock || currentStock + tronicaStock;
      const key = `${sku}|${genCode}`;
      if (seen.has(key)) duplicateRows += 1;
      seen.add(key);

      return {
        id: `${fileName}-${headerIndex + index + 2}-${sku || genCode}`,
        brand: valueToString(get(row, columns, "brand")) || "Bodycare",
        category: valueToString(get(row, columns, "category")) || "BOYS SWEAT SHIRTS",
        season: valueToString(get(row, columns, "season")),
        seasonCode: valueToString(get(row, columns, "seasonCode")),
        genCode,
        sku,
        color: valueToString(get(row, columns, "color")),
        size: valueToString(get(row, columns, "size")),
        nature: valueToString(get(row, columns, "nature")),
        stock,
        currentStock,
        tronicaStock,
        salesByPeriod: {
          fy2023: toNumber(get(row, columns, "fy2023")),
          fy2024: toNumber(get(row, columns, "fy2024")),
          fy2025: toNumber(get(row, columns, "fy2025")),
          aprMay2026: toNumber(get(row, columns, "aprMay2026")),
        },
        imageUrls,
        imageStatus: imageUrls.length > 0 ? "Ready" : "Missing",
        importedAt,
        sourceRow: headerIndex + index + 2,
      };
    })
    .filter(Boolean) as ProductRow[];

  return {
    rows,
    summary: {
      fileName,
      sheetName,
      detectedColumns: Object.fromEntries(
        Object.entries(columns).map(([field, index]) => [
          field,
          typeof index === "number" ? valueToString(headers[index]) : null,
        ]),
      ),
      rowsParsed: rows.length,
      genCodes: new Set(rows.map((row) => row.genCode).filter(Boolean)).size,
      skus: new Set(rows.map((row) => row.sku).filter(Boolean)).size,
      imagesFound: rows.filter((row) => row.imageUrls.length > 0).length,
      embeddedImagesFound: 0,
      missingFields,
      duplicateRows,
      warnings: missingFields.length
        ? [`Missing expected columns: ${missingFields.join(", ")}`]
        : [],
    },
  };
};

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export const extractEmbeddedImages = async (file: File): Promise<ImageMapping[]> => {
  try {
    const { default: JSZip } = await import("jszip");
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const mediaFiles = Object.values(zip.files).filter((entry) =>
      /^xl\/media\/.+\.(png|jpe?g|webp)$/i.test(entry.name),
    );

    const images = await Promise.all(
      mediaFiles.slice(0, 250).map(async (entry, index) => {
        const blob = await entry.async("blob");
        return {
          id: `embedded-${entry.name}-${index}`,
          target: "",
          targetType: "genCode" as const,
          fileName: entry.name.split("/").pop() || `embedded-${index + 1}`,
          dataUrl: await blobToDataUrl(blob),
          mappedAt: "",
        };
      }),
    );
    return images;
  } catch (error) {
    console.warn("Embedded image extraction failed", error);
    return [];
  }
};

export const parseWorkbookFile = async (file: File): Promise<ParsedWorkbook> => {
  const { default: readXlsxFile } = await import("read-excel-file/browser");
  const sheets = await readXlsxFile(file);
  const firstSheet = sheets[0];
  const sheetName = firstSheet?.sheet || "Sheet1";
  const matrix = (firstSheet?.data || []) as MatrixRow[];
  const embeddedImages = await extractEmbeddedImages(file);
  const parsed = rowsFromMatrix(matrix, file.name, sheetName);

  return {
    rows: parsed.rows,
    summary: {
      ...parsed.summary,
      embeddedImagesFound: embeddedImages.length,
      warnings: [
        ...parsed.summary.warnings,
        ...(embeddedImages.length
          ? [
              "Embedded workbook images were detected. Browser-side mapping is best-effort; map these manually if URL images are not enough.",
            ]
          : []),
      ],
    },
    embeddedImages,
  };
};

export const applyImageMappings = (rows: ProductRow[], mappings: ImageMapping[]) =>
  rows.map((row) => {
    const mappedImages = mappings
      .filter((mapping) => {
        const target = mapping.target.trim().toLowerCase();
        if (!target) return false;
        if (mapping.targetType === "sku") return row.sku.toLowerCase() === target;
        return row.genCode.toLowerCase() === target;
      })
      .map((mapping) => mapping.dataUrl);

    if (!mappedImages.length) return row;
    const imageUrls = [...new Set([...mappedImages, ...row.imageUrls])];
    return {
      ...row,
      imageUrls,
      imageStatus: "Ready" as const,
    };
  });

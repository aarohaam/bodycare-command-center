import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.resolve("outputs/bodycare-product-template");
const outputPath = path.join(outputDir, "Bodycare_Product_Decision_Input_Template.xlsx");

const headers = [
  "Image Link",
  "Item SKU Code",
  "SUPER_GEN",
  "Brand",
  "Category",
  "Color",
  "Size",
  "Nature",
  "Season",
  "FY23-24",
  "FY24-25",
  "FY25-26",
  "Last 30 Days",
  "Last 90 Days",
  "Total Current Stock",
  "MRP",
  "Amazon Selling Price",
];

const sampleRows = [
  [
    "https://example.com/product-image.jpg",
    "IABM00001A-PK001",
    "IABM00001",
    "BC Infant Apparels",
    "BOYS SWEAT SHIRTS",
    "NAVY",
    "40",
    "REGULAR",
    "Fall winter",
    120,
    96,
    82,
    8,
    22,
    25,
    799,
    599,
  ],
  [
    "https://example.com/product-image-red.jpg",
    "IABM00001B-PK001",
    "IABM00001",
    "BC Infant Apparels",
    "BOYS SWEAT SHIRTS",
    "RED",
    "40",
    "REGULAR",
    "Fall winter",
    65,
    42,
    18,
    1,
    4,
    54,
    799,
    499,
  ],
];

const guideRows = [
  ["Header", "Use"],
  ["Image Link", "Public product image URL for the exact color/SKU."],
  ["Item SKU Code", "Unique SKU code."],
  ["SUPER_GEN", "Parent GenCode for grouping."],
  ["Brand", "Brand name."],
  ["Category", "Product category."],
  ["Color", "Actual product color. Avoid ASSORTED when exact color is known."],
  ["Size", "SKU size."],
  ["Nature", "Product status such as NEW, REGULAR, FASHION, DISCONTINUE."],
  ["Season", "Selling season or catalogue season."],
  ["FY23-24 / FY24-25 / FY25-26", "Historical unit sales."],
  ["Last 30 Days / Last 90 Days", "Recent unit sales for current movement."],
  ["Total Current Stock", "Total stock currently available for this SKU."],
  ["MRP", "Listed MRP."],
  ["Amazon Selling Price", "Current Amazon selling price, if available."],
];

const workbook = Workbook.create();
const input = workbook.worksheets.add("Product Decision Input");
const guide = workbook.worksheets.add("Field Guide");

input.getRange("A1:Q1").values = [["Bodycare Product Decision Input Template", ...Array(headers.length - 1).fill("")]];
input.getRange("A2:Q2").values = [["Minimal SKU-level input for GenCode continue / refresh / liquidate / discontinue decisions.", ...Array(headers.length - 1).fill("")]];
input.getRange("A4:Q4").values = [headers];
input.getRange(`A5:Q${4 + sampleRows.length}`).values = sampleRows;

guide.getRange("A1:B1").values = [["Field Guide", ""]];
guide.getRange(`A3:B${2 + guideRows.length}`).values = guideRows;

for (const sheet of [input, guide]) {
  sheet.showGridLines = false;
}

input.freezePanes.freezeRows(4);
guide.freezePanes.freezeRows(3);

input.getRange("A1:Q1").format = {
  fill: "accent1",
  font: { name: "Calibri", size: 16, color: "lt1", bold: true },
  borders: { preset: "outside", style: "thin", color: "#C9D1DC" },
  verticalAlignment: "center",
};
input.getRange("A2:Q2").format = {
  fill: "lt2",
  font: { name: "Calibri", size: 11, color: "tx1" },
  borders: { preset: "outside", style: "thin", color: "#DFE4EA" },
  wrapText: true,
};
input.getRange("A4:Q4").format = {
  fill: "accent2",
  font: { name: "Calibri", size: 11, color: "lt1", bold: true },
  borders: { preset: "all", style: "thin", color: "#C9D1DC" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
};
input.getRange("A5:Q200").format = {
  fill: "lt1",
  font: { name: "Calibri", size: 10, color: "tx1" },
  borders: { preset: "all", style: "thin", color: "#E6EAF0" },
  verticalAlignment: "center",
  wrapText: true,
};
input.getRange("J5:Q200").format.numberFormat = "#,##0";
input.getRange("A:Q").format.autofitColumns();
input.getRange("A1:Q200").format.autofitRows();

guide.getRange("A1:B1").format = {
  fill: "accent1",
  font: { name: "Calibri", size: 15, color: "lt1", bold: true },
  borders: { preset: "outside", style: "thin", color: "#C9D1DC" },
};
guide.getRange("A3:B3").format = {
  fill: "accent2",
  font: { name: "Calibri", size: 11, color: "lt1", bold: true },
  borders: { preset: "all", style: "thin", color: "#C9D1DC" },
};
guide.getRange("A4:B40").format = {
  fill: "lt1",
  font: { name: "Calibri", size: 10, color: "tx1" },
  borders: { preset: "all", style: "thin", color: "#E6EAF0" },
  wrapText: true,
};
guide.getRange("A:B").format.autofitColumns();
guide.getRange("A1:B40").format.autofitRows();

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);

import type { GenCodeProduct } from "../types";

const saveCanvasToPdf = async (canvas: HTMLCanvasElement, fileName: string) => {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
  const width = canvas.width * ratio;
  const height = canvas.height * ratio;
  const x = (pageWidth - width) / 2;
  const y = 24;
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, width, height);
  pdf.save(fileName);
};

export const exportElementPdf = async (elementId: string, fileName: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 1.8,
      useCORS: true,
      allowTaint: false,
      imageTimeout: 8000,
      logging: false,
    });
    await saveCanvasToPdf(canvas, fileName);
  } catch (error) {
    console.warn("Visual PDF capture failed, using browser print fallback", error);
    window.print();
  }
};

export const exportDecisionSummaryPdf = async (products: GenCodeProduct[], fileName: string) => {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const margin = 36;
  let y = 42;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("Bodycare Product Command Center v0.1", margin, y);
  y += 24;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("Boys Sweat Shirts decision summary", margin, y);
  y += 28;

  const counts = products.reduce<Record<string, number>>((acc, product) => {
    acc[product.effectiveDecision] = (acc[product.effectiveDecision] || 0) + 1;
    return acc;
  }, {});

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  Object.entries(counts).forEach(([decision, count], index) => {
    pdf.text(`${decision}: ${count}`, margin + index * 118, y);
  });
  y += 30;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  const headers = ["GenCode", "Decision", "Stock", "History", "Apr-May 2026", "Confidence", "Reason"];
  const widths = [82, 84, 64, 68, 86, 72, 360];
  let x = margin;
  headers.forEach((header, index) => {
    pdf.text(header, x, y);
    x += widths[index];
  });
  y += 12;
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, 806, y);
  y += 14;

  pdf.setFont("helvetica", "normal");
  products.slice(0, 26).forEach((product) => {
    if (y > 540) {
      pdf.addPage();
      y = 42;
    }
    const values = [
      product.genCode,
      product.effectiveDecision,
      String(product.totalStock),
      String(product.historicalSalesTotal),
      String(product.salesByPeriod.aprMay2026),
      product.recommendation.confidence,
      product.recommendation.reason,
    ];
    x = margin;
    values.forEach((value, index) => {
      const text = index === 6 ? pdf.splitTextToSize(value, widths[index] - 8)[0] : value;
      pdf.text(String(text), x, y);
      x += widths[index];
    });
    y += 18;
  });

  pdf.save(fileName);
};

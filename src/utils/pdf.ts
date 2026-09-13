import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { LayoutResult, Project } from '../types';
import { fromMm } from './units';


export async function generatePdf(
  layout: LayoutResult,
  project: Project,
  allOnOnePage: boolean
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = 297;
  const pageH = 210;
  const margin = 10;

  const materialMap = new Map(project.materials.map(m => [m.id, m]));
  const unit = project.unit;

  const formatVal = (mm: number) =>
    unit === 'inch' ? `${(fromMm(mm, 'inch')).toFixed(2)}"` : `${mm}mm`;
  const formatCost = (v: number) => v.toFixed(2);

  // --- Cut list table first page ---
  doc.setFontSize(16);
  doc.text(project.name, margin, margin + 5);
  doc.setFontSize(9);
  const costLine = layout.totalCost > 0 ? ` | Material cost: ${formatCost(layout.totalCost)}` : '';
  doc.text(`Kerf: ${formatVal(project.settings.sawKerf)} | Sheets needed: ${layout.sheets.length} | Total waste: ${layout.totalWastePercent}%${costLine}`, margin, margin + 12);

  const showMaterialColumn = project.materials.length > 1;
  const tableRows = project.pieces.map(p => {
    const row = [p.name];
    if (showMaterialColumn) row.push(materialMap.get(p.materialId)?.name ?? '');
    row.push(formatVal(p.width), formatVal(p.height), String(p.quantity), p.grain, p.rotationAllowed ? 'Yes' : 'No', p.priority ? '★' : '');
    return row;
  });

  const head = ['Name'];
  if (showMaterialColumn) head.push('Material');
  head.push(`Width (${unit})`, `Height (${unit})`, 'Qty', 'Grain', 'Rotation', 'Priority');

  autoTable(doc, {
    startY: margin + 18,
    head: [head],
    body: tableRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  if (layout.materialUsage.length > 0 && showMaterialColumn) {
    const usageRows = layout.materialUsage.map(u => {
      const m = materialMap.get(u.materialId);
      return [m?.name ?? u.materialId, String(u.sheetCount), m && m.pricePerSheet > 0 ? formatCost(u.cost) : '—'];
    });
    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6,
      head: [['Material', 'Sheets', 'Cost']],
      body: usageRows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
      tableWidth: 100,
    });
  }

  // --- Sheet layout pages ---
  const drawSheet = (sheetIdx: number, offsetX: number, offsetY: number, maxW: number, maxH: number) => {
    const sheet = layout.sheets[sheetIdx];
    const material = materialMap.get(sheet.materialId);
    const sheetW = sheet.width;
    const sheetH = sheet.height;
    const scale = Math.min(maxW / sheetW, maxH / sheetH);
    const sw = sheetW * scale;
    const sh = sheetH * scale;

    // Sheet border
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.3);
    doc.rect(offsetX, offsetY, sw, sh);

    // Sheet label
    doc.setFontSize(7);
    doc.setTextColor(100);
    const materialLabel = showMaterialColumn && material ? ` (${material.name})` : '';
    const offcutLabel = sheet.sourceOffcutId ? ' [offcut]' : '';
    doc.text(`Sheet ${sheetIdx + 1} — ${sheet.wastePercent}% waste${materialLabel}${offcutLabel}`, offsetX, offsetY - 1);

    // Pieces
    for (const pp of sheet.placedPieces) {
      const def = project.pieces.find(p => p.id === pp.definitionId);
      if (!def) continue;
      const x = offsetX + pp.x * scale;
      const y = offsetY + pp.y * scale;
      const w = pp.width * scale;
      const h = pp.height * scale;

      const hex = def.color;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);

      doc.setFillColor(r, g, b);
      doc.setDrawColor(Math.max(0, r - 40), Math.max(0, g - 40), Math.max(0, b - 40));
      doc.setLineWidth(0.2);
      doc.rect(x, y, w, h, 'FD');

      if (w > 8 && h > 5) {
        doc.setFontSize(Math.min(6, w * 0.5, h * 0.8));
        doc.setTextColor(255, 255, 255);
        const label = def.name.length > 12 ? def.name.slice(0, 11) + '…' : def.name;
        doc.text(label, x + 1, y + h / 2 + 1);
      }
    }

    // Ruler
    doc.setTextColor(150);
    doc.setFontSize(6);
    doc.setDrawColor(150);
    doc.setLineWidth(0.2);
    const tickStep = sheetW > 2000 ? 500 : 200; // mm
    for (let mm = 0; mm <= sheetW; mm += tickStep) {
      const tx = offsetX + mm * scale;
      doc.line(tx, offsetY + sh, tx, offsetY + sh + 2);
      doc.text(`${mm}`, tx - 3, offsetY + sh + 5);
    }
  };

  if (allOnOnePage) {
    const cols = Math.ceil(Math.sqrt(layout.sheets.length));
    const rows = Math.ceil(layout.sheets.length / cols);
    const cellW = (pageW - margin * 2) / cols - 5;
    const cellH = (pageH - margin * 2 - 20) / rows - 8;
    doc.addPage();
    layout.sheets.forEach((_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      drawSheet(i, margin + col * (cellW + 5), margin + 10 + row * (cellH + 8), cellW, cellH);
    });
  } else {
    const layoutW = pageW - margin * 2;
    const layoutH = pageH - margin * 2 - 15;
    for (let i = 0; i < layout.sheets.length; i++) {
      doc.addPage();
      drawSheet(i, margin, margin + 15, layoutW, layoutH);
    }
  }

  doc.save(`${project.name.replace(/\s+/g, '_')}-cutlist.pdf`);
}

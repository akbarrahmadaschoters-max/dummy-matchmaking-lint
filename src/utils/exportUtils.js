import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

/**
 * Utility to export structured array data to Excel (.xlsx)
 * @param {Object} params
 * @param {string} params.fileName - Name of file without extension
 * @param {string} params.sheetName - Sheet name inside workbook
 * @param {Array<{header: string, key: string|Function}>} params.columns - Column mapping
 * @param {Array<Object>} params.data - Rows data array
 */
export function exportToExcel({ fileName = "export", sheetName = "Data", columns, data }) {
  if (!data || data.length === 0) {
    alert("Tidak ada data untuk di-export.");
    return;
  }

  const headers = columns.map((c) => c.header);
  const rows = data.map((row) =>
    columns.map((c) => {
      const val = typeof c.key === "function" ? c.key(row) : row[c.key];
      return val === null || val === undefined ? "" : val;
    })
  );

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Calculate auto column widths
  const colWidths = headers.map((h, i) => {
    let maxLen = String(h).length;
    rows.forEach((r) => {
      const cellLen = String(r[i] ?? "").length;
      if (cellLen > maxLen) maxLen = cellLen;
    });
    return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
  });
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Utility to export structured array data to PDF (.pdf)
 * @param {Object} params
 * @param {string} params.title - Title header in PDF
 * @param {string} params.subtitle - Subtitle header
 * @param {string} params.fileName - Name of file without extension
 * @param {Array<{header: string, key: string|Function}>} params.columns - Column mapping
 * @param {Array<Object>} params.data - Rows data array
 * @param {'portrait'|'landscape'} [params.orientation='landscape'] - Page orientation
 */
export function exportToPdf({
  title = "Export Data",
  subtitle = "",
  fileName = "export",
  columns,
  data,
  orientation = "landscape",
}) {
  if (!data || data.length === 0) {
    alert("Tidak ada data untuk di-export.");
    return;
  }

  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  // Title & Subtitle styling
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42); // #0F172A
  doc.text(title, 14, 15);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // #64748B
    doc.text(subtitle, 14, 22);
  }

  // Right-aligned Export Timestamp
  const timestamp = `Di-export: ${new Date().toLocaleString("id-ID")}`;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184); // #94A3B8
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.text(timestamp, pageWidth - 14, 15, { align: "right" });

  const startY = subtitle ? 27 : 20;

  const headers = columns.map((c) => c.header);
  const rows = data.map((row) =>
    columns.map((c) => {
      const val = typeof c.key === "function" ? c.key(row) : row[c.key];
      return val === null || val === undefined ? "" : String(val);
    })
  );

  doc.autoTable({
    head: [headers],
    body: rows,
    startY,
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      font: "helvetica",
      overflow: "linebreak",
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [79, 70, 229], // #4F46E5 Indigo primary
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // #F8FAFC
    },
    margin: { top: 15, left: 14, right: 14, bottom: 15 },
    didDrawPage: (pageData) => {
      const totalPages = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.text(
        `Halaman ${pageData.pageNumber} dari ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      );
    },
  });

  doc.save(`${fileName}.pdf`);
}

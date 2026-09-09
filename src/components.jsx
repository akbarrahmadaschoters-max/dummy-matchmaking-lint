import { STATUS_CONFIG } from "./scoring.js";

export function StatusBadge({ status, small }) {
  const c = STATUS_CONFIG[status] || { bg: "#F1F5F9", text: "#64748B", border: "#E2E8F0", dot: "#94A3B8", label: status };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      borderRadius: 20, padding: small ? "2px 9px" : "4px 12px",
      fontSize: small ? 11 : 12, fontWeight: 600, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  );
}

export function ScoreBar({ val, color }) {
  const displayVal = val ?? "—";
  const numVal = val ?? 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "#F1F5F9", borderRadius: 99 }}>
        <div style={{ width: `${numVal}%`, height: "100%", background: color || "#6366F1", borderRadius: 99, transition: "width 0.4s" }} />
      </div>
      <span style={{ fontSize: 12, color: "#64748B", width: 28, textAlign: "right" }}>{displayVal}</span>
    </div>
  );
}

export function ExportButtons({ onExportPDF, onExportExcel, style = {} }) {
  return (
    <div style={{ display: "inline-flex", gap: 8, alignItems: "center", ...style }}>
      <button
        onClick={onExportPDF}
        type="button"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          borderRadius: 9,
          border: "1.5px solid #FCA5A5",
          background: "#FEF2F2",
          color: "#991B1B",
          fontWeight: 700,
          fontSize: 12,
          cursor: "pointer",
          transition: "all 0.15s ease",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#FEE2E2"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#FEF2F2"; }}
        title="Download PDF"
      >
        <span style={{ fontSize: 13 }}>📄</span>
        <span>Download PDF</span>
      </button>

      <button
        onClick={onExportExcel}
        type="button"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          borderRadius: 9,
          border: "1.5px solid #86EFAC",
          background: "#F0FDF4",
          color: "#166534",
          fontWeight: 700,
          fontSize: 12,
          cursor: "pointer",
          transition: "all 0.15s ease",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#DCFCE7"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#F0FDF4"; }}
        title="Download Excel"
      >
        <span style={{ fontSize: 13 }}>📊</span>
        <span>Download Excel</span>
      </button>
    </div>
  );
}


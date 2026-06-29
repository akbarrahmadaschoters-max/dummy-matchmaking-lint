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

import { useMemo } from "react";

export default function OnboardingPage({ teachers, setTeachers }) {
  const onboardingTeachers = useMemo(() => teachers.filter(t => t.identifier === "Baru"), [teachers]);

  const handlePromote = (id) => {
    setTeachers(teachers.map(t => t.id === id ? { ...t, identifier: "Lama" } : t));
  };

  const isComplete = (t) => {
    return t.qc !== null && t.nps !== null && t.compliance !== null;
  };

  return (
    <div style={{ padding: "0 0 40px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0 }}>Onboarding Pool</h1>
        <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>Teacher baru yang belum melengkapi data wajib.</p>
      </div>

      <div style={{ background: "#FFF", borderRadius: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.04)", overflow: "hidden", border: "1px solid #E2E8F0" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
            <thead style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}>
              <tr>
                <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase" }}>Teacher</th>
                <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase" }}>Data Completeness</th>
                <th style={{ padding: "14px 20px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {onboardingTeachers.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: "40px 20px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
                    Tidak ada teacher di Onboarding Pool.
                  </td>
                </tr>
              ) : (
                onboardingTeachers.map(t => {
                  const complete = isComplete(t);
                  return (
                    <tr key={t.id} style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{t.program}</div>
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, background: t.qc !== null ? "#DCFCE7" : "#FEF2F2", color: t.qc !== null ? "#16A34A" : "#DC2626", fontWeight: 600 }}>
                            {t.qc !== null ? "✔ QC" : "✖ QC"}
                          </span>
                          <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, background: t.nps !== null ? "#DCFCE7" : "#FEF2F2", color: t.nps !== null ? "#16A34A" : "#DC2626", fontWeight: 600 }}>
                            {t.nps !== null ? "✔ NPS" : "✖ NPS"}
                          </span>
                          <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, background: t.compliance !== null ? "#DCFCE7" : "#FEF2F2", color: t.compliance !== null ? "#16A34A" : "#DC2626", fontWeight: 600 }}>
                            {t.compliance !== null ? "✔ Compliance" : "✖ Compliance"}
                          </span>
                          <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, background: t.hasInspection ? "#DCFCE7" : "#F1F5F9", color: t.hasInspection ? "#16A34A" : "#64748B", fontWeight: 600 }}>
                            {t.hasInspection ? "✔ Inspection" : "➖ Optional"}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "16px 20px", textAlign: "right" }}>
                        <button disabled={!complete} onClick={() => handlePromote(t.id)} style={{
                          background: complete ? "#6366F1" : "#E2E8F0",
                          color: complete ? "#FFF" : "#94A3B8",
                          border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600,
                          cursor: complete ? "pointer" : "not-allowed", transition: "all 0.15s"
                        }}>
                          Promote ke Pool Utama
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

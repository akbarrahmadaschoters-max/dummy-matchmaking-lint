import { useState, useMemo } from "react";
import { db } from "./firebase.js";
import { doc, setDoc } from "firebase/firestore";
import { scoreColor } from "./scoring.js";

export default function DisqualifiedPage({ teachers, setTeachers }) {
  const [filterReason, setFilterReason] = useState("Semua");
  const [search, setSearch] = useState("");

  const disqualifiedTeachers = useMemo(() => {
    return teachers.filter(t => t.isDisqualified);
  }, [teachers]);

  const filtered = useMemo(() => {
    return disqualifiedTeachers.filter(t => {
      if (filterReason !== "Semua" && t.disqualifiedReason !== filterReason) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => new Date(b.disqualifiedAt || 0) - new Date(a.disqualifiedAt || 0));
  }, [disqualifiedTeachers, filterReason, search]);

  const restoreTeacher = async (id) => {
    if (confirm("Kembalikan teacher ini ke Pool Utama?")) {
      try {
        await setDoc(doc(db, "teachers", id.toString()), { isDisqualified: false, disqualifiedReason: null, disqualifiedAt: null }, { merge: true });
        setTeachers(ts => ts.map(t => t.id === id ? { ...t, isDisqualified: false, disqualifiedReason: null, disqualifiedAt: null } : t));
      } catch (e) {
        console.error("Error restoring teacher:", e);
        alert("Gagal mengembalikan teacher: " + e.message);
      }
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", margin: "0 0 8px" }}>Disqualified Teachers</h1>
          <p style={{ margin: 0, color: "#64748B", fontSize: 14 }}>Daftar teacher yang didiskualifikasi secara manual oleh operasional.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama teacher..."
            style={{ width: "100%", padding: "9px 12px 9px 36px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF", boxSizing: "border-box" }} />
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: 15 }}>🔍</span>
        </div>
        <select value={filterReason} onChange={e => setFilterReason(e.target.value)}
                style={{ padding: "10px 14px", border: "1.5px solid #FECACA", color: "#B91C1C", borderRadius: 10, fontSize: 13, outline: "none", background: "#FEF2F2", minWidth: 160 }}>
          <option value="Semua">Semua Alasan</option>
          <option value="Time Availability">Time Availability</option>
          <option value="QC">QC</option>
          <option value="Compliance">Compliance</option>
          <option value="Force Majeur">Force Majeur</option>
          <option value="Ganti Tutor 3x+">Ganti Tutor 3x+</option>
          <option value="Lainnya">Lainnya</option>
        </select>
      </div>

      <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 800 }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}>
              {["Nama Teacher", "Program", "Final Score", "Reason", "Tanggal Disqualify", "Action"].map(h => (
                <th key={h} style={{ padding: "14px 20px", textAlign: h === "Action" ? "right" : "left", fontWeight: 700, fontSize: 11, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "60px 0", color: "#94A3B8", fontSize: 14 }}>Belum ada teacher yang didiskualifikasi.</td></tr>
            ) : filtered.map(t => (
              <tr key={t.id} style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#FAFBFF"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "16px 20px", fontWeight: 700, color: "#0F172A" }}>{t.name}</td>
                <td style={{ padding: "16px 20px" }}>
                  <span style={{ background: "#F1F5F9", color: "#475569", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{t.program}</span>
                </td>
                <td style={{ padding: "16px 20px" }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: scoreColor(t.score?.final || 0) }}>{t.score?.final || 0}</span>
                </td>
                <td style={{ padding: "16px 20px", color: "#B91C1C", fontWeight: 600 }}>
                  <span style={{ background: "#FEF2F2", padding: "4px 10px", borderRadius: 6 }}>{t.disqualifiedReason}</span>
                </td>
                <td style={{ padding: "16px 20px", color: "#64748B", fontSize: 12 }}>
                  {t.disqualifiedAt ? new Date(t.disqualifiedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                </td>
                <td style={{ padding: "16px 20px", textAlign: "right" }}>
                  <button onClick={() => restoreTeacher(t.id)} style={{
                    padding: "8px 16px", borderRadius: 8, border: "1.5px solid #BFDBFE",
                    background: "#EFF6FF", color: "#1D4ED8", fontWeight: 700, cursor: "pointer", fontSize: 12
                  }}>
                    Kembalikan ke Pool
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

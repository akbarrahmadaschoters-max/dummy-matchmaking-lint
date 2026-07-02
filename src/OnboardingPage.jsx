import { useMemo, useState } from "react";
import { db } from "./firebase.js";
import { doc, setDoc, writeBatch } from "firebase/firestore";

function ProgramAnalyticsCard({ programName, teachersList }) {
  const promotedCount = teachersList.filter(t => t.identifier === "Lama").length;
  const onboardingCount = teachersList.filter(t => t.identifier === "Baru").length;
  
  return (
    <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 24px", flex: 1, minWidth: 250, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>{programName} Analytics</div>
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>{promotedCount}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#10B981", marginTop: 4 }}>✔ Pool Utama</div>
        </div>
        <div style={{ width: 1, background: "#E2E8F0" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>{onboardingCount}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#F59E0B", marginTop: 4 }}>⏳ Onboarding</div>
        </div>
      </div>
    </div>
  );
}

function ProgramOnboardingSection({ programName, teachersList, allTeachers, setTeachers }) {
  const onboarding = useMemo(() => teachersList.filter(t => t.identifier === "Baru"), [teachersList]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isPromoting, setIsPromoting] = useState(false);

  const isComplete = (t) => t.qc !== null && t.nps !== null && t.compliance !== null;

  const toggleSelect = (id) => {
    const newSel = new Set(selectedIds);
    if (newSel.has(id)) newSel.delete(id);
    else newSel.add(id);
    setSelectedIds(newSel);
  };

  const toggleSelectAll = () => {
    const allCompletes = onboarding.filter(isComplete);
    if (selectedIds.size === allCompletes.length && allCompletes.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allCompletes.map(t => t.id)));
    }
  };

  const handlePromote = async (ids) => {
    setIsPromoting(true);
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.set(doc(db, "teachers", id.toString()), { identifier: "Lama" }, { merge: true });
      });
      await batch.commit();

      const idsSet = new Set(ids);
      setTeachers(allTeachers.map(t => idsSet.has(t.id) ? { ...t, identifier: "Lama" } : t));
      setSelectedIds(new Set());
      alert(`Berhasil mempromosikan ${ids.length} teacher!`);
    } catch (e) {
      console.error("Error promoting:", e);
      alert("Gagal mempromosikan: " + e.message);
    } finally {
      setIsPromoting(false);
    }
  };

  const allCompletes = onboarding.filter(isComplete);
  const isAllSelected = allCompletes.length > 0 && selectedIds.size === allCompletes.length;

  const handlePromoteAll = () => {
    if (allCompletes.length === 0) return;
    if (window.confirm(`Promote semua ${allCompletes.length} teacher di ${programName} ke Pool Utama?`)) {
      handlePromote(allCompletes.map(t => t.id));
    }
  };

  return (
    <div style={{ marginBottom: 40, position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A" }}>Onboarding &mdash; {programName}</div>
        <button 
          onClick={handlePromoteAll} 
          disabled={allCompletes.length === 0 || isPromoting}
          style={{ 
            background: "linear-gradient(135deg, #4F46E5, #6366F1)", 
            color: "#FFF", 
            border: "none", 
            borderRadius: 10, 
            padding: "10px 18px", 
            fontSize: 13, 
            fontWeight: 700, 
            cursor: allCompletes.length === 0 ? "not-allowed" : "pointer", 
            boxShadow: "0 4px 12px rgba(99,102,241,0.25)",
            opacity: (allCompletes.length === 0 || isPromoting) ? 0.6 : 1
          }}>
          {isPromoting ? "Memproses..." : `Onboarding-kan Semua ${programName}`}
        </button>
      </div>
      <div style={{ background: "#FFF", borderRadius: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.04)", overflow: "hidden", border: "1px solid #E2E8F0" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
            <thead style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}>
              <tr>
                <th style={{ padding: "14px 20px", width: 40, textAlign: "center" }}>
                  <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} 
                    disabled={allCompletes.length === 0}
                    style={{ width: 16, height: 16, accentColor: "#6366F1", cursor: allCompletes.length === 0 ? "not-allowed" : "pointer" }} />
                </th>
                <th style={{ padding: "14px 0", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase" }}>Teacher</th>
                <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase" }}>Data Completeness</th>
                <th style={{ padding: "14px 20px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {onboarding.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: "40px 20px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
                    Tidak ada teacher onboarding untuk program ini saat ini.
                  </td>
                </tr>
              ) : (
                onboarding.map(t => {
                  const complete = isComplete(t);
                  return (
                    <tr key={t.id} style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.2s", background: selectedIds.has(t.id) ? "#EEF2FF" : "transparent" }} onMouseEnter={e => { if(!selectedIds.has(t.id)) e.currentTarget.style.background = "#F8FAFC" }} onMouseLeave={e => { if(!selectedIds.has(t.id)) e.currentTarget.style.background = "transparent" }}>
                      <td style={{ padding: "16px 20px", textAlign: "center" }}>
                        <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} disabled={!complete}
                          style={{ width: 16, height: 16, accentColor: "#6366F1", cursor: complete ? "pointer" : "not-allowed" }} />
                      </td>
                      <td style={{ padding: "16px 0" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{t.program || "Unknown"}</div>
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
                        <button disabled={!complete || isPromoting} onClick={() => handlePromote([t.id])} style={{
                          background: complete ? "#6366F1" : "#E2E8F0",
                          color: complete ? "#FFF" : "#94A3B8",
                          border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600,
                          cursor: complete ? "pointer" : "not-allowed", transition: "all 0.15s", opacity: isPromoting ? 0.7 : 1
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
      
      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#1E293B", color: "#FFF", padding: "12px 24px", borderRadius: 100, display: "flex", alignItems: "center", gap: 16, boxShadow: "0 10px 25px rgba(0,0,0,0.2)", zIndex: 50, animation: "fadeInUp 0.3s ease-out" }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedIds.size} teacher dipilih</div>
          <div style={{ width: 1, height: 20, background: "#334155" }} />
          <button disabled={isPromoting} onClick={() => handlePromote(Array.from(selectedIds))} style={{ background: "#6366F1", color: "#FFF", border: "none", borderRadius: 100, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", opacity: isPromoting ? 0.7 : 1 }}>
            {isPromoting ? "Memproses..." : "Promote ke Pool Utama"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage({ teachers, setTeachers }) {
  const linguaTeachers = useMemo(() => teachers.filter(t => t.program === "Lingua"), [teachers]);
  const intertestTeachers = useMemo(() => teachers.filter(t => t.program === "Intertest"), [teachers]);
  
  return (
    <div style={{ padding: "0 0 60px" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0 }}>Onboarding Pool</h1>
        <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>Kelola dan promosikan teacher baru ke pool utama berdasarkan program.</p>
      </div>

      <div style={{ display: "flex", gap: 24, marginBottom: 40, flexWrap: "wrap" }}>
        <ProgramAnalyticsCard programName="Lingua" teachersList={linguaTeachers} />
        <ProgramAnalyticsCard programName="Intertest" teachersList={intertestTeachers} />
      </div>

      <ProgramOnboardingSection programName="Lingua" teachersList={linguaTeachers} allTeachers={teachers} setTeachers={setTeachers} />
      <ProgramOnboardingSection programName="Intertest" teachersList={intertestTeachers} allTeachers={teachers} setTeachers={setTeachers} />
      
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}

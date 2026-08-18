import { useMemo, useState, useRef } from "react";
import Papa from "papaparse";
import { db } from "./firebase.js";
import { doc, setDoc, writeBatch, collection } from "firebase/firestore";
import targaryenPassword from "../env/HouseofTargareyan?raw";
import { deleteAllTeachers } from "./teacherService.js";

function ProgramAnalyticsCard({ programName, teachersList }) {
  const promotedCount = teachersList.filter(t => t.identifier === "Lama" && t.qc !== null).length;
  const onboardingCount = teachersList.filter(t => t.identifier === "Baru" || t.qc === null).length;
  
  return (
    <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 24px", flex: 1, minWidth: 250, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>{programName} Analytics</div>
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>{promotedCount}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#10B981", marginTop: 4 }}>✔ Pool Utama (Punya Student)</div>
        </div>
        <div style={{ width: 1, background: "#E2E8F0" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>{onboardingCount}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#F59E0B", marginTop: 4 }}>⏳ Onboarding / Baru</div>
        </div>
      </div>
    </div>
  );
}

function AddTeacherModal({ defaultType, onSave, onClose }) {
  const isBaru = defaultType === "baru";
  const [form, setForm] = useState({
    name: "",
    program: "Lingua",
    qc: isBaru ? "" : "80",
    nps: isBaru ? "" : "85",
    compliance: "85",
    kota: "Jakarta",
    availability: "Moderate"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert("Nama tutor wajib diisi!");

    const newTeacher = {
      id: Date.now().toString(),
      name: form.name.trim(),
      program: form.program,
      qc: form.qc !== "" ? Number(form.qc) : null,
      nps: form.nps !== "" ? Number(form.nps) : null,
      compliance: form.compliance !== "" ? Number(form.compliance) : 85,
      kota: form.kota.trim(),
      availability: form.availability,
      identifier: isBaru ? "Baru" : "Lama",
      hasInspection: false,
      inspection: null,
      gantiTutor: 0
    };

    onSave(newTeacher);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#FFF", borderRadius: 20, width: "100%", maxWidth: 460, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid #F1F5F9", paddingBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0F172A" }}>
            {isBaru ? "🌱 Tambah Tutor Baru (Belum Punya Student)" : "🎓 Tambah Tutor Reguler (Punya Student)"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94A3B8" }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>Nama Tutor *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Contoh: Budi Santoso" style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13 }} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>Program</label>
            <select value={form.program} onChange={e => setForm({ ...form, program: e.target.value })} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13 }}>
              <option value="Lingua">Lingua</option>
              <option value="Intertest">Intertest</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>Skor QC {isBaru ? "(Opsional)" : "*"}</label>
              <input type="number" min="0" max="100" value={form.qc} onChange={e => setForm({ ...form, qc: e.target.value })} placeholder={isBaru ? "Opsional (0-100)" : "80"} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>Skor NPS {isBaru ? "(Opsional)" : "*"}</label>
              <input type="number" min="0" max="100" value={form.nps} onChange={e => setForm({ ...form, nps: e.target.value })} placeholder={isBaru ? "Opsional (0-100)" : "85"} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13 }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>Compliance Score</label>
              <input type="number" min="0" max="100" value={form.compliance} onChange={e => setForm({ ...form, compliance: e.target.value })} placeholder="85" style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 4 }}>Kota Domisili</label>
              <input type="text" value={form.kota} onChange={e => setForm({ ...form, kota: e.target.value })} placeholder="Jakarta" style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13 }} />
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#F8FAFC", color: "#475569", fontWeight: 600, cursor: "pointer" }}>Batal</button>
            <button type="submit" style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: "#4F46E5", color: "#FFF", fontWeight: 700, cursor: "pointer" }}>Simpan Data Tutor</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProgramOnboardingSection({ programName, teachersList, allTeachers, setTeachers, mode }) {
  const filteredList = useMemo(() => {
    if (mode === "baru") {
      return teachersList.filter(t => t.identifier === "Baru" || t.qc === null || t.qc === undefined);
    } else {
      return teachersList.filter(t => t.identifier !== "Baru" && t.qc !== null && t.qc !== undefined);
    }
  }, [teachersList, mode]);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isPromoting, setIsPromoting] = useState(false);

  const toggleSelect = (id) => {
    const newSel = new Set(selectedIds);
    if (newSel.has(id)) newSel.delete(id);
    else newSel.add(id);
    setSelectedIds(newSel);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredList.length && filteredList.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredList.map(t => t.id)));
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
      alert(`✅ Berhasil mempromosikan ${ids.length} teacher ke Pool Utama!`);
    } catch (e) {
      console.error("Error promoting:", e);
      alert("❌ Gagal mempromosikan: " + e.message);
    } finally {
      setIsPromoting(false);
    }
  };

  const isAllSelected = filteredList.length > 0 && selectedIds.size === filteredList.length;

  const handlePromoteAll = () => {
    if (filteredList.length === 0) return;
    if (window.confirm(`Promote semua ${filteredList.length} teacher di ${programName} ke Pool Utama?`)) {
      handlePromote(filteredList.map(t => t.id));
    }
  };

  return (
    <div style={{ marginBottom: 40, position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A" }}>
          {mode === "baru" ? `🌱 Tutor Baru & Onboarding — ${programName}` : `🎓 Tutor Reguler (Punya Student) — ${programName}`}
        </div>
        {mode === "baru" && (
          <button 
            onClick={handlePromoteAll} 
            disabled={filteredList.length === 0 || isPromoting}
            style={{ 
              background: "linear-gradient(135deg, #4F46E5, #6366F1)", 
              color: "#FFF", 
              border: "none", 
              borderRadius: 10, 
              padding: "10px 18px", 
              fontSize: 13, 
              fontWeight: 700, 
              cursor: filteredList.length === 0 ? "not-allowed" : "pointer", 
              boxShadow: "0 4px 12px rgba(99,102,241,0.25)",
              opacity: (filteredList.length === 0 || isPromoting) ? 0.6 : 1
            }}>
            {isPromoting ? "Memproses..." : `Promote Semua ${programName}`}
          </button>
        )}
      </div>
      <div style={{ background: "#FFF", borderRadius: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.04)", overflow: "hidden", border: "1px solid #E2E8F0" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
            <thead style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}>
              <tr>
                {mode === "baru" && (
                  <th style={{ padding: "14px 20px", width: 40, textAlign: "center" }}>
                    <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} 
                      disabled={filteredList.length === 0}
                      style={{ width: 16, height: 16, accentColor: "#6366F1", cursor: filteredList.length === 0 ? "not-allowed" : "pointer" }} />
                  </th>
                )}
                <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase" }}>Teacher</th>
                <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase" }}>Data Completeness & Skor</th>
                <th style={{ padding: "14px 20px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: "40px 20px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
                    Tidak ada teacher di kategori ini saat ini.
                  </td>
                </tr>
              ) : (
                filteredList.map(t => {
                  return (
                    <tr key={t.id} style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.2s", background: selectedIds.has(t.id) ? "#EEF2FF" : "transparent" }} onMouseEnter={e => { if(!selectedIds.has(t.id)) e.currentTarget.style.background = "#F8FAFC" }} onMouseLeave={e => { if(!selectedIds.has(t.id)) e.currentTarget.style.background = "transparent" }}>
                      {mode === "baru" && (
                        <td style={{ padding: "16px 20px", textAlign: "center" }}>
                          <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)}
                            style={{ width: 16, height: 16, accentColor: "#6366F1", cursor: "pointer" }} />
                        </td>
                      )}
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{t.name}</div>
                        <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{t.program || "Unknown"} · 📍 {t.kota || "Jakarta"}</div>
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, background: t.qc !== null ? "#DCFCE7" : "#FEF2F2", color: t.qc !== null ? "#16A34A" : "#DC2626", fontWeight: 600 }}>
                            {t.qc !== null ? `✔ QC: ${t.qc}` : "✖ QC"}
                          </span>
                          <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, background: t.nps !== null ? "#DCFCE7" : "#FEF2F2", color: t.nps !== null ? "#16A34A" : "#DC2626", fontWeight: 600 }}>
                            {t.nps !== null ? `✔ NPS: ${t.nps}` : "✖ NPS"}
                          </span>
                          <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, background: t.compliance !== null ? "#DCFCE7" : "#FEF2F2", color: t.compliance !== null ? "#16A34A" : "#DC2626", fontWeight: 600 }}>
                            {t.compliance !== null ? `✔ Comp: ${t.compliance}` : "✖ Comp"}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "16px 20px", textAlign: "right" }}>
                        {mode === "baru" ? (
                          <button disabled={isPromoting} onClick={() => handlePromote([t.id])} style={{
                            background: "linear-gradient(135deg, #6366F1, #4F46E5)",
                            color: "#FFF",
                            border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 700,
                            cursor: "pointer", transition: "all 0.15s", opacity: isPromoting ? 0.7 : 1,
                            boxShadow: "0 2px 8px rgba(99,102,241,0.25)"
                          }}>
                            🚀 Promote ke Pool Utama
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", background: "#DCFCE7", padding: "4px 12px", borderRadius: 8 }}>
                            ✔ Aktif di Pool Utama
                          </span>
                        )}
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
      {mode === "baru" && selectedIds.size > 0 && (
        <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#1E293B", color: "#FFF", padding: "12px 24px", borderRadius: 100, display: "flex", alignItems: "center", gap: 16, boxShadow: "0 10px 25px rgba(0,0,0,0.2)", zIndex: 50, animation: "fadeInUp 0.3s ease-out" }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedIds.size} teacher dipilih</div>
          <div style={{ width: 1, height: 20, background: "#334155" }} />
          <button disabled={isPromoting} onClick={() => handlePromote(Array.from(selectedIds))} style={{ background: "#6366F1", color: "#FFF", border: "none", borderRadius: 100, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", opacity: isPromoting ? 0.7 : 1 }}>
            {isPromoting ? "Memproses..." : "🚀 Promote ke Pool Utama"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage({ teachers, setTeachers }) {
  const [activeTabMode, setActiveTabMode] = useState("baru"); // 'baru' or 'reguler'
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProgram, setFilterProgram] = useState("All"); // All, Lingua, Intertest
  const [showAddModal, setShowAddModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Filtered teachers based on search query & program dropdown
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      if (filterProgram !== "All" && t.program !== filterProgram) return false;
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (t.name || "").toLowerCase().includes(q);
        const matchKota = (t.kota || "").toLowerCase().includes(q);
        const matchProgram = (t.program || "").toLowerCase().includes(q);
        if (!matchName && !matchKota && !matchProgram) return false;
      }
      return true;
    });
  }, [teachers, filterProgram, searchQuery]);

  const linguaTeachers = useMemo(() => filteredTeachers.filter(t => t.program === "Lingua"), [filteredTeachers]);
  const intertestTeachers = useMemo(() => filteredTeachers.filter(t => t.program === "Intertest"), [filteredTeachers]);

  // Download Template CSV
  const downloadTemplate = (type) => {
    if (type === "baru") {
      const header = "Nama Tutor,Program,Skor QC,Skor NPS,Compliance,Kota\nBudi Santoso,Lingua,,,85,Jakarta\n";
      const blob = new Blob([header], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "Template_Tutor_Baru_Onboarding.csv";
      link.click();
    } else {
      const header = "Nama Tutor,Program,Skor QC,Skor NPS,Compliance,Kota\nSiti Rahma,Lingua,88,92,100,Bandung\n";
      const blob = new Blob([header], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "Template_Tutor_Reguler.csv";
      link.click();
    }
  };

  // Upload & Bulky CSV Import
  const handleFileUpload = (e, targetIdentifier) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsed = results.data;
        const newTeachers = [];

        parsed.forEach((row, idx) => {
          try {
            const name = String(row["Nama Tutor"] || row["Name"] || "").trim();
            if (!name) return;

            const p = String(row["Program"] || "Lingua").trim();
            const qcRaw = row["Skor QC"] || row["QC Score"];
            const qc = (qcRaw !== null && qcRaw !== undefined && String(qcRaw).trim() !== "") ? Number(qcRaw) : null;

            const npsRaw = row["Skor NPS"] || row["NPS Score"];
            const nps = (npsRaw !== null && npsRaw !== undefined && String(npsRaw).trim() !== "") ? Number(npsRaw) : null;

            const compRaw = row["Compliance"];
            const comp = compRaw ? Number(compRaw) : 85;
            const kota = String(row["Kota"] || "Jakarta").trim();

            newTeachers.push({
              id: (Date.now() + idx).toString(),
              name,
              program: p,
              qc,
              nps,
              compliance: comp,
              kota,
              availability: "Moderate",
              identifier: targetIdentifier, // 'Baru' or 'Lama'
              hasInspection: false,
              inspection: null,
              gantiTutor: 0
            });
          } catch (err) {
            console.error(`Error row ${idx + 2}: ${err.message}`);
          }
        });

        if (newTeachers.length > 0) {
          try {
            const batch = writeBatch(db);
            newTeachers.forEach(t => {
              batch.set(doc(db, "teachers", t.id), t);
            });
            await batch.commit();

            setTeachers(prev => [...prev, ...newTeachers]);
            alert(`✅ Berhasil mengimpor ${newTeachers.length} tutor (${targetIdentifier === "Baru" ? "Tutor Baru" : "Tutor Reguler"})!`);
          } catch (e) {
            console.error("Gagal impor:", e);
            alert("❌ Gagal impor: " + e.message);
          }
        }
        setIsImporting(false);
      }
    });
    e.target.value = null;
  };

  // Reset / Perbarui Data (Password Protected)
  const handleResetData = async () => {
    const userPass = window.prompt("Masukkan kata sandi untuk memperbarui/menghapus data:");
    if (userPass !== targaryenPassword.trim()) {
      alert("❌ Kata sandi salah! Tindakan ditolak.");
      return;
    }

    if (!window.confirm("PERINGATAN: Anda yakin ingin MENGHAPUS SEMUA DATA teacher di seluruh aplikasi? Tindakan ini tidak dapat dibatalkan!")) return;

    setIsResetting(true);
    setTeachers([]);
    try {
      await deleteAllTeachers();
      alert("✅ Semua data berhasil dihapus / diperbarui.");
    } catch (e) {
      console.error("Gagal mereset data:", e);
      alert("❌ Gagal mereset data: " + e.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleAddManualSave = async (newTeacher) => {
    try {
      await setDoc(doc(db, "teachers", newTeacher.id), newTeacher);
      setTeachers(prev => [...prev, newTeacher]);
      alert(`✅ Berhasil menambahkan ${newTeacher.name}!`);
    } catch (e) {
      console.error("Gagal menambahkan:", e);
      alert("❌ Gagal: " + e.message);
    }
  };

  return (
    <div style={{ padding: "0 0 60px" }}>
      {/* Top Title Bar */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0 }}>Onboarding & Teacher Pool Management</h1>
          <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>Terbagi menjadi tab khusus Tutor Baru (Belum Punya Student) dan Tutor Reguler (Punya Student & QC).</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button disabled={isResetting} onClick={handleResetData} style={{
            background: "#FEF2F2", color: "#EF4444", border: "1.5px solid #FECACA", borderRadius: 10,
            padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: isResetting ? "not-allowed" : "pointer", opacity: isResetting ? 0.6 : 1
          }}>
            {isResetting ? "Memproses..." : "🗑 Perbarui Data"}
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div style={{ display: "flex", gap: 12, borderBottom: "2px solid #E2E8F0", marginBottom: 28 }}>
        <button onClick={() => setActiveTabMode("baru")} style={{
          padding: "12px 24px", fontSize: 14, fontWeight: 800, cursor: "pointer", border: "none", background: "none",
          color: activeTabMode === "baru" ? "#4F46E5" : "#64748B",
          borderBottom: activeTabMode === "baru" ? "3px solid #4F46E5" : "3px solid transparent",
          marginBottom: -2, transition: "all 0.15s"
        }}>
          🌱 Tab 1: Onboarding Tutor Baru (Belum Punya Student / QC)
        </button>

        <button onClick={() => setActiveTabMode("reguler")} style={{
          padding: "12px 24px", fontSize: 14, fontWeight: 800, cursor: "pointer", border: "none", background: "none",
          color: activeTabMode === "reguler" ? "#4F46E5" : "#64748B",
          borderBottom: activeTabMode === "reguler" ? "3px solid #4F46E5" : "3px solid transparent",
          marginBottom: -2, transition: "all 0.15s"
        }}>
          🎓 Tab 2: Tutor Reguler (Sudah Punya Student & Skor QC)
        </button>
      </div>

      {/* Filter & Search Bar + Dynamic Upload Actions */}
      <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 24px", marginBottom: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Search & Program Filter Row */}
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          {/* Search Box */}
          <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
            <input 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              placeholder="🔍 Cari nama tutor, kota, atau program..."
              style={{ width: "100%", padding: "10px 14px 10px 38px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: 15 }}>🔍</span>
          </div>

          {/* Program Filter Pills */}
          <div style={{ display: "flex", gap: 8 }}>
            {["All", "Lingua", "Intertest"].map(p => (
              <button 
                key={p} 
                onClick={() => setFilterProgram(p)} 
                style={{
                  padding: "9px 16px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  border: filterProgram === p ? "1.5px solid #4F46E5" : "1.5px solid #E2E8F0",
                  background: filterProgram === p ? "#EEF2FF" : "#FFF",
                  color: filterProgram === p ? "#4F46E5" : "#64748B",
                  transition: "all 0.15s"
                }}
              >
                {p === "All" ? "Semua Program" : p}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Action Buttons Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, borderTop: "1px solid #F1F5F9", paddingTop: 16 }}>
          <div style={{ fontSize: 13, color: "#64748B" }}>
            {activeTabMode === "baru"
              ? "Gunakan CSV khusus ini untuk memasukkan tutor baru yang belum memiliki student/QC."
              : "Gunakan CSV khusus ini untuk meng-update daftar tutor reguler yang sudah aktif mengajar."}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => setShowAddModal(true)} style={{
              background: "#4F46E5", color: "#FFF", border: "none", borderRadius: 10,
              padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(79,70,229,0.25)"
            }}>
              ➕ Tambah {activeTabMode === "baru" ? "Tutor Baru" : "Tutor Reguler"} Manual
            </button>

            <button onClick={() => downloadTemplate(activeTabMode)} style={{
              background: "#F1F5F9", color: "#475569", border: "1.5px solid #E2E8F0", borderRadius: 10,
              padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer"
            }}>
              📥 Template CSV {activeTabMode === "baru" ? "Tutor Baru" : "Tutor Reguler"}
            </button>

            <input type="file" accept=".csv" ref={fileInputRef} onChange={(e) => handleFileUpload(e, activeTabMode === "baru" ? "Baru" : "Lama")} style={{ display: "none" }} />
            <button disabled={isImporting} onClick={() => fileInputRef.current?.click()} style={{
              background: activeTabMode === "baru" ? "#F59E0B" : "#10B981", color: "#FFF", border: "none", borderRadius: 10,
              padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: isImporting ? "not-allowed" : "pointer",
              boxShadow: activeTabMode === "baru" ? "0 4px 12px rgba(245,158,11,0.25)" : "0 4px 12px rgba(16,185,129,0.25)"
            }}>
              {isImporting ? "⏳ Mengimpor..." : `📤 Upload CSV ${activeTabMode === "baru" ? "Tutor Baru" : "Tutor Reguler"}`}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, marginBottom: 40, flexWrap: "wrap" }}>
        <ProgramAnalyticsCard programName="Lingua" teachersList={linguaTeachers} />
        <ProgramAnalyticsCard programName="Intertest" teachersList={intertestTeachers} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: 24 }}>
        <ProgramOnboardingSection programName="Lingua" teachersList={linguaTeachers} allTeachers={teachers} setTeachers={setTeachers} mode={activeTabMode} />
        <ProgramOnboardingSection programName="Intertest" teachersList={intertestTeachers} allTeachers={teachers} setTeachers={setTeachers} mode={activeTabMode} />
      </div>

      {showAddModal && (
        <AddTeacherModal defaultType={activeTabMode} onSave={handleAddManualSave} onClose={() => setShowAddModal(false)} />
      )}
      
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}

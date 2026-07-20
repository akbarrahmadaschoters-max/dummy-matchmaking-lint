import React, { useState, useMemo, useRef } from "react";
import Papa from "papaparse";
import { importMasterTeachers, deleteAllMasterTeachers } from "./masterTeacherService.js";

function getScoreCategory(scoreStr) {
  if (!scoreStr || scoreStr.trim() === "-" || scoreStr.toLowerCase() === "n/a") {
    return "Tidak Ada Skor";
  }
  const s = scoreStr.toLowerCase().trim();
  
  // Try to parse IELTS patterns
  if (s.includes("ielts")) {
    const match = s.match(/([4-9](?:[.,]\d)?)/);
    if (match) {
      const val = parseFloat(match[1].replace(",", "."));
      if (val >= 7.5) return "IELTS >= 7.5";
      if (val >= 6.5) return "IELTS 6.5 - 7.0";
      return "IELTS < 6.5";
    }
  }

  // Check numeric IELTS directly (4.0 to 9.0)
  const numericIelts = parseFloat(s.replace(",", "."));
  if (!isNaN(numericIelts) && numericIelts >= 4.0 && numericIelts <= 9.0) {
    if (numericIelts >= 7.5) return "IELTS >= 7.5";
    if (numericIelts >= 6.5) return "IELTS 6.5 - 7.0";
    return "IELTS < 6.5";
  }

  // Check TOEFL ITP / Paper patterns (310 to 677)
  if (s.includes("itp") || s.includes("toefl")) {
    const match = s.match(/([4-6]\d{2})/);
    if (match) {
      const val = parseInt(match[1], 10);
      if (val >= 600) return "TOEFL ITP >= 600";
      if (val >= 550) return "TOEFL ITP 550 - 599";
      return "TOEFL ITP < 550";
    }
  }

  const numericToefl = parseInt(s, 10);
  if (!isNaN(numericToefl)) {
    if (numericToefl >= 310 && numericToefl <= 677) {
      if (numericToefl >= 600) return "TOEFL ITP >= 600";
      if (numericToefl >= 550) return "TOEFL ITP 550 - 599";
      return "TOEFL ITP < 550";
    }
    // TOEFL iBT range
    if (numericToefl >= 80 && numericToefl <= 120) {
      if (numericToefl >= 100) return "TOEFL iBT >= 100";
      return "TOEFL iBT < 100";
    }
  }

  return "Lainnya";
}

function DetailModal({ tutor, onClose }) {
  if (!tutor) return null;

  const scoreBadgeStyle = (score) => {
    if (!score || score === "-" || score === "N/A") return { bg: "#F1F5F9", text: "#64748B" };
    return { bg: "#EEF2FF", text: "#4F46E5" };
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 60,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      backdropFilter: "blur(4px)"
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#FFFFFF", borderRadius: 20, width: "100%", maxWidth: 680,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "90vh",
        display: "flex", flexDirection: "column"
      }}>
        {/* Header */}
        <div style={{ padding: "24px 28px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A" }}>{tutor.name}</div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 4, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span>✉ {tutor.email || "-"}</span>
              {tutor.phone && (
                <a href={tutor.phone.startsWith("http") ? tutor.phone : `https://${tutor.phone}`} target="_blank" rel="noreferrer" style={{ color: "#25D366", fontWeight: 600, textDecoration: "none" }}>
                  📱 WhatsApp
                </a>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", borderRadius: "50%", width: 32, height: 32, fontSize: 18, color: "#64748B", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* Status & Position Overview */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>Posisi</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginTop: 4 }}>{tutor.posisi || "-"}</div>
            </div>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>Latest Education</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#4F46E5", marginTop: 4 }}>{tutor.educationLevel || "-"}</div>
            </div>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>SLMS Status</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: tutor.slmsStatus === "Verified" ? "#16A34A" : "#DC2626", marginTop: 4 }}>
                {tutor.slmsStatus === "Verified" ? "✅ Verified" : tutor.slmsStatus || "-"}
              </div>
            </div>
          </div>

          {/* Test Scores Grid */}
          <div style={{ background: "linear-gradient(135deg, #EEF2FF, #F5F3FF)", border: "1px solid #C7D2FE", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#3730A3", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              📊 English Test Scores
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
              {[
                { label: "Overall", val: tutor.overallScore, highlight: true },
                { label: "Listening", val: tutor.skorListening },
                { label: "Reading", val: tutor.skorReading },
                { label: "Writing", val: tutor.skorWriting },
                { label: "Speaking", val: tutor.skorSpeaking },
              ].map((s, idx) => (
                <div key={idx} style={{ background: s.highlight ? "#4F46E5" : "#FFF", borderRadius: 10, padding: "10px 8px", textAlign: "center", border: s.highlight ? "none" : "1px solid #E0E7FF" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: s.highlight ? "#C7D2FE" : "#64748B", textTransform: "uppercase" }}>{s.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: s.highlight ? "#FFF" : "#0F172A", marginTop: 3 }}>{s.val || "-"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Profile Highlight */}
          {tutor.profileHighlight && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                📝 Profile Highlight
              </div>
              <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "14px 16px", fontSize: 13, color: "#92400E", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                {tutor.profileHighlight}
              </div>
            </div>
          )}

          {/* Education Details */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
              🎓 Riwayat Pendidikan
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { degree: "S1 (Bachelor)", univ: tutor.univS1, major: tutor.majorS1 },
                { degree: "S2 (Master)", univ: tutor.univS2, major: tutor.majorS2 },
                { degree: "S3 (Doctorate)", univ: tutor.univS3, major: tutor.majorS3 },
              ].filter(e => e.univ && e.univ !== "-").map((e, idx) => (
                <div key={idx} style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, background: "#F1F5F9", color: "#475569", padding: "2px 8px", borderRadius: 6, textTransform: "uppercase" }}>{e.degree}</span>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginTop: 6 }}>{e.univ}</div>
                    {e.major && e.major !== "-" && <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Jurusan: {e.major}</div>}
                  </div>
                </div>
              ))}
              {(!tutor.univS1 || tutor.univS1 === "-") && (!tutor.univS2 || tutor.univS2 === "-") && (!tutor.univS3 || tutor.univS3 === "-") && (
                <div style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic" }}>Tidak ada detail riwayat universitas.</div>
              )}
            </div>
          </div>

          {/* Personal Info Metadata */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B" }}>Tanggal Lahir</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>{tutor.dob || "-"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B" }}>Jenis Kelamin</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>{tutor.gender || "-"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B" }}>Status Pernikahan</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>{tutor.maritalStatus || "-"}</div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid #F1F5F9", background: "#F8FAFC", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 10, background: "#FFF", border: "1.5px solid #E2E8F0", color: "#475569", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MasterDataPage({ masterTeachers = [], setMasterTeachers }) {
  const [search, setSearch] = useState("");
  const [filterPosisi, setFilterPosisi] = useState("Semua");
  const [filterEdu, setFilterEdu] = useState("Semua");
  const [filterSlms, setFilterSlms] = useState("Semua");
  const [filterGender, setFilterGender] = useState("Semua");
  const [filterScore, setFilterScore] = useState("Semua");
  const [selectedTutor, setSelectedTutor] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const fileInputRef = useRef(null);

  // Download CSV template
  const downloadTemplate = () => {
    const header = "Name,Phone Number,Email,Tanggal Lahir,Jenis Kelamin,Status Pernikahan,Posisi,Lastest Education Level,Universitas S1,Universitas S2,Universitas S3,Major S1,Major S2,Major S3,Profile Highlight,Overall Score(Eng Test),Skor Listening,Skor Reading,Skor Writing,Skor Speaking,LMS NAME,SLMS Status\n";
    const blob = new Blob([header], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Template_Master_Data_Tutor_Lingua.csv";
    link.click();
  };

  // Upload & Parse CSV
  const handleFileUpload = (e) => {
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
            const name = String(row["Name"] || "").trim();
            if (!name) return;

            newTeachers.push({
              id: (Date.now() + idx).toString(),
              name,
              phone: String(row["Phone Number"] || "").trim(),
              email: String(row["Email"] || "").trim(),
              dob: String(row["Tanggal Lahir"] || "").trim(),
              gender: String(row["Jenis Kelamin"] || "").trim(),
              maritalStatus: String(row["Status Pernikahan"] || "").trim(),
              posisi: String(row["Posisi"] || "").trim(),
              educationLevel: String(row["Lastest Education Level"] || "").trim(),
              univS1: String(row["Universitas S1"] || "").trim(),
              univS2: String(row["Universitas S2"] || "").trim(),
              univS3: String(row["Universitas S3"] || "").trim(),
              majorS1: String(row["Major S1"] || "").trim(),
              majorS2: String(row["Major S2"] || "").trim(),
              majorS3: String(row["Major S3"] || "").trim(),
              profileHighlight: String(row["Profile Highlight"] || "").trim(),
              overallScore: String(row["Overall Score(Eng Test)"] || "").trim(),
              skorListening: String(row["Skor Listening"] || "").trim(),
              skorReading: String(row["Skor Reading"] || "").trim(),
              skorWriting: String(row["Skor Writing"] || "").trim(),
              skorSpeaking: String(row["Skor Speaking"] || "").trim(),
              lmsName: String(row["LMS NAME"] || "").trim(),
              slmsStatus: String(row["SLMS Status"] || "").trim(),
            });
          } catch (err) {
            console.error(`Error parsing row ${idx + 2}:`, err);
          }
        });

        if (newTeachers.length > 0) {
          try {
            await importMasterTeachers(newTeachers);
            alert(`✅ Berhasil mengimpor ${newTeachers.length} master data tutor Lingua.`);
          } catch (err) {
            console.error("Gagal mengimpor master data:", err);
            alert("❌ Gagal mengimpor: " + err.message);
          }
        } else {
          alert("⚠ Tidak ada data tutor valid yang ditemukan dalam file CSV.");
        }

        setIsImporting(false);
      },
      error: (err) => {
        console.error("CSV parse error:", err);
        alert("❌ Gagal membaca file CSV: " + err.message);
        setIsImporting(false);
      }
    });

    e.target.value = null;
  };

  // Reset database & local UI
  const handleResetData = async () => {
    if (!window.confirm("PERINGATAN MENGHAPUS DATABASE:\nApakah Anda yakin ingin MENGHAPUS SEMUA MASTER DATA TUTOR LINGUA di database Firestore?\n\nTindakan ini tidak dapat dibatalkan!")) {
      return;
    }

    setIsResetting(true);
    if (setMasterTeachers) setMasterTeachers([]);

    try {
      await deleteAllMasterTeachers();
      alert("✅ Semua master data tutor Lingua berhasil dihapus dari database Firestore.");
    } catch (e) {
      console.error("Gagal menghapus data:", e);
      alert("❌ Gagal mereset data: " + e.message);
    } finally {
      setIsResetting(false);
    }
  };

  // Dynamic filter options
  const filterOptions = useMemo(() => {
    const posSet = new Set();
    const eduSet = new Set();
    const slmsSet = new Set();

    masterTeachers.forEach(t => {
      if (t.posisi) posSet.add(t.posisi);
      if (t.educationLevel) eduSet.add(t.educationLevel);
      if (t.slmsStatus) slmsSet.add(t.slmsStatus);
    });

    return {
      posisi: Array.from(posSet).sort(),
      edu: Array.from(eduSet).sort(),
      slms: Array.from(slmsSet).sort(),
    };
  }, [masterTeachers]);

  // Filtered dataset
  const filtered = useMemo(() => {
    return masterTeachers.filter(t => {
      if (filterPosisi !== "Semua" && t.posisi !== filterPosisi) return false;
      if (filterEdu !== "Semua" && t.educationLevel !== filterEdu) return false;
      if (filterSlms !== "Semua" && t.slmsStatus !== filterSlms) return false;
      if (filterGender !== "Semua" && t.gender !== filterGender) return false;

      if (filterScore !== "Semua") {
        const cat = getScoreCategory(t.overallScore);
        if (filterScore === "Lainnya / Tanpa Skor") {
          if (cat !== "Lainnya" && cat !== "Tidak Ada Skor") return false;
        } else {
          if (cat !== filterScore) return false;
        }
      }

      if (search) {
        const q = search.toLowerCase();
        const matchName = t.name?.toLowerCase().includes(q);
        const matchEmail = t.email?.toLowerCase().includes(q);
        const matchLms = t.lmsName?.toLowerCase().includes(q);
        const matchUniv = t.univS1?.toLowerCase().includes(q) || t.univS2?.toLowerCase().includes(q);
        const matchPos = t.posisi?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchLms && !matchUniv && !matchPos) return false;
      }

      return true;
    });
  }, [masterTeachers, filterPosisi, filterEdu, filterSlms, filterGender, filterScore, search]);

  // Pagination calculation
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Reset page to 1 when filters change
  const handleFilterChange = (setter, val) => {
    setter(val);
    setCurrentPage(1);
  };

  // Metrics summary
  const metrics = useMemo(() => {
    const verifiedCount = masterTeachers.filter(t => t.slmsStatus === "Verified").length;
    const mastersCount = masterTeachers.filter(t => t.educationLevel?.includes("Master")).length;
    const bachelorsCount = masterTeachers.filter(t => t.educationLevel?.includes("Bachelor")).length;
    const maleCount = masterTeachers.filter(t => t.gender === "Laki-Laki").length;
    const femaleCount = masterTeachers.filter(t => t.gender === "Perempuan").length;

    return { verifiedCount, mastersCount, bachelorsCount, maleCount, femaleCount };
  }, [masterTeachers]);

  return (
    <div>
      {/* Page Title & Actions Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0 }}>Master Data Tutor Lingua</h1>
          <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>Database komprehensif profil, skor tes, dan riwayat pendidikan tutor</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button disabled={isResetting} onClick={handleResetData} style={{
            background: "#FEF2F2", color: "#EF4444", border: "1.5px solid #FECACA", borderRadius: 10,
            padding: "11px 16px", fontSize: 13, fontWeight: 700, cursor: isResetting ? "not-allowed" : "pointer", transition: "all 0.15s", opacity: isResetting ? 0.6 : 1
          }}>
            {isResetting ? "Memproses..." : "🗑 Perbarui / Hapus Data"}
          </button>

          <button onClick={downloadTemplate} style={{
            background: "#F1F5F9", color: "#475569", border: "1.5px solid #E2E8F0", borderRadius: 10,
            padding: "11px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
          }}>
            📥 Template CSV
          </button>

          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} style={{ display: "none" }} />
          <button disabled={isImporting} onClick={() => fileInputRef.current?.click()} style={{
            background: "#10B981", color: "#FFF", border: "none", borderRadius: 10,
            padding: "11px 20px", fontSize: 13, fontWeight: 700, cursor: isImporting ? "not-allowed" : "pointer",
            boxShadow: "0 4px 12px rgba(16,185,129,0.25)"
          }}>
            {isImporting ? "⏳ Mengimpor..." : "📤 Upload CSV Data"}
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
        <div style={{ background: "#FFF", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Master Tutor</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#0F172A", marginTop: 4 }}>{masterTeachers.length}</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Tercatat di Firestore</div>
        </div>

        <div style={{ background: "#FFF", border: "1.5px solid #BBF7D0", borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", textTransform: "uppercase", letterSpacing: "0.06em" }}>SLMS Verified</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#15803D", marginTop: 4 }}>{metrics.verifiedCount}</div>
          <div style={{ fontSize: 12, color: "#16A34A", marginTop: 4 }}>
            {masterTeachers.length ? Math.round((metrics.verifiedCount / masterTeachers.length) * 100) : 0}% of total
          </div>
        </div>

        <div style={{ background: "#FFF", border: "1.5px solid #C7D2FE", borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4F46E5", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pendidikan S2 / Master</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#3730A3", marginTop: 4 }}>{metrics.mastersCount}</div>
          <div style={{ fontSize: 12, color: "#6366F1", marginTop: 4 }}>{metrics.bachelorsCount} degree S1 (Bachelor)</div>
        </div>

        <div style={{ background: "#FFF", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Gender Rasio</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", marginTop: 8 }}>
            👩 {metrics.femaleCount} <span style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>vs</span> 👨 {metrics.maleCount}
          </div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>Perempuan vs Laki-Laki</div>
        </div>
      </div>

      {/* Multi-Category Filters */}
      <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
          🔍 Filter & Pencarian Master Data
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
          {/* Search Box */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>Pencarian</label>
            <div style={{ position: "relative" }}>
              <input value={search} onChange={e => handleFilterChange(setSearch, e.target.value)} placeholder="Nama, Email, Univ, LMS..."
                style={{ width: "100%", padding: "9px 12px 9px 34px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: 14 }}>🔍</span>
            </div>
          </div>

          {/* Posisi Filter */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>Posisi</label>
            <select value={filterPosisi} onChange={e => handleFilterChange(setFilterPosisi, e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF", cursor: "pointer", boxSizing: "border-box" }}>
              <option value="Semua">Semua Posisi ({filterOptions.posisi.length})</option>
              {filterOptions.posisi.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Education Level Filter */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>Latest Education</label>
            <select value={filterEdu} onChange={e => handleFilterChange(setFilterEdu, e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF", cursor: "pointer", boxSizing: "border-box" }}>
              <option value="Semua">Semua Jenjang ({filterOptions.edu.length})</option>
              {filterOptions.edu.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          {/* SLMS Status Filter */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>SLMS Status</label>
            <select value={filterSlms} onChange={e => handleFilterChange(setFilterSlms, e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF", cursor: "pointer", boxSizing: "border-box" }}>
              <option value="Semua">Semua SLMS Status</option>
              {filterOptions.slms.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

           {/* Gender Filter */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>Jenis Kelamin</label>
            <select value={filterGender} onChange={e => handleFilterChange(setFilterGender, e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF", cursor: "pointer", boxSizing: "border-box" }}>
              <option value="Semua">Semua Jenis Kelamin</option>
              <option value="Laki-Laki">Laki-Laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
          </div>

          {/* Overall Score Filter */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>Overall Score (Eng Test)</label>
            <select value={filterScore} onChange={e => handleFilterChange(setFilterScore, e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF", cursor: "pointer", boxSizing: "border-box" }}>
              <option value="Semua">Semua Skor</option>
              <option value="IELTS >= 7.5">IELTS &gt;= 7.5</option>
              <option value="IELTS 6.5 - 7.0">IELTS 6.5 - 7.0</option>
              <option value="IELTS < 6.5">IELTS &lt; 6.5</option>
              <option value="TOEFL ITP >= 600">TOEFL ITP &gt;= 600</option>
              <option value="TOEFL ITP 550 - 599">TOEFL ITP 550 - 599</option>
              <option value="TOEFL ITP < 550">TOEFL ITP &lt; 550</option>
              <option value="TOEFL iBT >= 100">TOEFL iBT &gt;= 100</option>
              <option value="TOEFL iBT < 100">TOEFL iBT &lt; 100</option>
              <option value="Lainnya / Tanpa Skor">Lainnya / Tanpa Skor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>
            Menampilkan <span style={{ color: "#0F172A" }}>{filtered.length}</span> dari <span style={{ color: "#0F172A" }}>{masterTeachers.length}</span> tutor
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#64748B" }}>Baris per halaman:</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1000 }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}>
                {["#", "Nama Tutor", "Kontak", "Gender", "Posisi", "Education Level", "Overall Score", "LMS Name", "SLMS Status", "Action"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: h === "#" || h === "Action" || h === "Overall Score" ? "center" : "left", fontWeight: 700, fontSize: 11, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: "48px 20px", textAlign: "center", color: "#94A3B8" }}>
                    {masterTeachers.length === 0
                      ? "Belum ada master data tutor Lingua. Silakan klik tombol 'Upload CSV Data' di atas untuk mengimpor file."
                      : "Tidak ada master data tutor yang cocok dengan filter pencarian."}
                  </td>
                </tr>
              ) : (
                paginatedData.map((t, i) => {
                  const globalRank = (currentPage - 1) * pageSize + i + 1;
                  return (
                    <tr key={t.id} style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#FAFBFF"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 700, color: "#94A3B8", fontSize: 12 }}>#{globalRank}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 700, color: "#0F172A" }}>{t.name}</div>
                        {t.univS1 && t.univS1 !== "-" && (
                          <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>🎓 {t.univS1}</div>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 12 }}>
                        <div style={{ color: "#475569" }}>{t.email || "-"}</div>
                        {t.phone && (
                          <a href={t.phone.startsWith("http") ? t.phone : `https://${t.phone}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#25D366", textDecoration: "none", fontWeight: 600, marginTop: 2, display: "inline-block" }}>
                            📱 {t.phone.replace("wa.me/", "")}
                          </a>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: "#475569" }}>{t.gender || "-"}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ background: "#EEF2FF", color: "#4F46E5", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>
                          {t.posisi || "-"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ background: "#F1F5F9", color: "#334155", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>
                          {t.educationLevel || "-"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>
                          {t.overallScore || "-"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: "#475569" }}>{t.lmsName || "-"}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          background: t.slmsStatus === "Verified" ? "#F0FDF4" : "#FEF2F2",
                          color: t.slmsStatus === "Verified" ? "#15803D" : "#B91C1C",
                          border: `1px solid ${t.slmsStatus === "Verified" ? "#BBF7D0" : "#FECACA"}`,
                          borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700
                        }}>
                          {t.slmsStatus || "-"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <button onClick={() => setSelectedTutor(t)} style={{
                          padding: "5px 12px", borderRadius: 8, border: "1.5px solid #C7D2FE",
                          background: "#EEF2FF", color: "#4F46E5", fontWeight: 700, cursor: "pointer", fontSize: 12
                        }}>
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              Halaman <span style={{ fontWeight: 700, color: "#0F172A" }}>{currentPage}</span> dari <span style={{ fontWeight: 700, color: "#0F172A" }}>{totalPages}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} style={{
                padding: "6px 14px", borderRadius: 8, border: "1px solid #E2E8F0", background: currentPage === 1 ? "#F8FAFC" : "#FFF",
                color: currentPage === 1 ? "#CBD5E1" : "#475569", fontWeight: 600, cursor: currentPage === 1 ? "not-allowed" : "pointer", fontSize: 12
              }}>
                ◄ Prev
              </button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} style={{
                padding: "6px 14px", borderRadius: 8, border: "1px solid #E2E8F0", background: currentPage === totalPages ? "#F8FAFC" : "#FFF",
                color: currentPage === totalPages ? "#CBD5E1" : "#475569", fontWeight: 600, cursor: currentPage === totalPages ? "not-allowed" : "pointer", fontSize: 12
              }}>
                Next ►
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tutor Detail Modal */}
      {selectedTutor && (
        <DetailModal tutor={selectedTutor} onClose={() => setSelectedTutor(null)} />
      )}
    </div>
  );
}

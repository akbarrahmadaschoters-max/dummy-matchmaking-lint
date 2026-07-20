import React, { useState, useMemo, useRef } from "react";
import Papa from "papaparse";
import { importMasterIntertestTeachers, deleteAllMasterIntertestTeachers } from "./masterIntertestService.js";
import targaryenPassword from "../env/HouseofTargareyan?raw";

function DetailModal({ tutor, onClose }) {
  if (!tutor) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 60,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      backdropFilter: "blur(4px)"
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#FFFFFF", borderRadius: 20, width: "100%", maxWidth: 700,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "90vh",
        display: "flex", flexDirection: "column"
      }}>
        {/* Header */}
        <div style={{ padding: "24px 28px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A" }}>{tutor.name}</div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 4, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <span>✉ {tutor.email || "-"}</span>
              {tutor.phone && (
                <a href={tutor.phone.startsWith("http") ? tutor.phone : `https://${tutor.phone}`} target="_blank" rel="noreferrer" style={{ color: "#25D366", fontWeight: 600, textDecoration: "none" }}>
                  📱 WhatsApp
                </a>
              )}
              <span>📍 {tutor.kota || "-"}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", borderRadius: "50%", width: 32, height: 32, fontSize: 18, color: "#64748B", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* Status & Overview Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status Intertest</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: tutor.statusIntertest === "Active" ? "#16A34A" : "#DC2626", marginTop: 4 }}>
                {tutor.statusIntertest === "Active" ? "🟢 Active" : tutor.statusIntertest || "-"}
              </div>
            </div>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status Kemitraan</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#4F46E5", marginTop: 4 }}>{tutor.statusKemitraan || "-"}</div>
            </div>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>Posisi</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginTop: 4 }}>{tutor.posisi || "-"}</div>
            </div>
          </div>

          {/* Class Statistics Grid */}
          <div style={{ background: "linear-gradient(135deg, #EEF2FF, #F5F3FF)", border: "1px solid #C7D2FE", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#3730A3", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              📚 Statistik Kelas Intertest
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <div style={{ background: "#FFF", borderRadius: 10, padding: "12px 10px", textAlign: "center", border: "1px solid #E0E7FF" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Kelas B2C Aktif</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#16A34A", marginTop: 4 }}>{tutor.kelasAktifB2C ?? 0}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{tutor.kelasAllTimeB2C ?? 0} All Time</div>
              </div>

              <div style={{ background: "#FFF", borderRadius: 10, padding: "12px 10px", textAlign: "center", border: "1px solid #E0E7FF" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Kelas B2B Aktif</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#2563EB", marginTop: 4 }}>{tutor.kelasAktifB2B ?? 0}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{tutor.kelasAllTimeB2B ?? 0} All Time</div>
              </div>

              <div style={{ background: "#4F46E5", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#C7D2FE", textTransform: "uppercase" }}>Total Kelas Aktif</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#FFF", marginTop: 4 }}>
                  {(Number(tutor.kelasAktifB2C) || 0) + (Number(tutor.kelasAktifB2B) || 0)}
                </div>
                <div style={{ fontSize: 11, color: "#E0E7FF", marginTop: 2 }}>B2C + B2B</div>
              </div>

              <div style={{ background: "#FFF", borderRadius: 10, padding: "12px 10px", textAlign: "center", border: "1px solid #E0E7FF" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Total All Time</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", marginTop: 4 }}>
                  {(Number(tutor.kelasAllTimeB2C) || 0) + (Number(tutor.kelasAllTimeB2B) || 0)}
                </div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>Semua Kelas</div>
              </div>
            </div>
          </div>

          {/* Subjek yang diajar */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              📖 Subjek Yang Diajar
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {tutor.subjek ? (
                tutor.subjek.split(",").map((s, idx) => (
                  <span key={idx} style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", color: "#3730A3", padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                    {s.trim()}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: 12, color: "#94A3B8" }}>Tidak ada subjek tercatat</span>
              )}
            </div>
          </div>

          {/* Program Details */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              🎓 Program
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "10px 14px", borderRadius: 10 }}>
              {tutor.program || "-"}
            </div>
          </div>

          {/* Addresses */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Alamat Tempat Tinggal Sekarang</div>
              <div style={{ fontSize: 13, color: "#0F172A", marginTop: 4, lineHeight: 1.5 }}>{tutor.alamatDomisili || "-"}</div>
            </div>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Alamat KTP</div>
              <div style={{ fontSize: 13, color: "#0F172A", marginTop: 4, lineHeight: 1.5 }}>{tutor.alamatKtp || "-"}</div>
            </div>
          </div>

          {/* Metadata */}
          <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "right" }}>
            Tanggal Dibuat (Created): {tutor.created || "-"}
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

export default function MasterDataIntertestPage({ masterIntertestTeachers = [], setMasterIntertestTeachers }) {
  const [search, setSearch] = useState("");
  const [filterStatusIntertest, setFilterStatusIntertest] = useState("Semua");
  const [filterPosisi, setFilterPosisi] = useState("Semua");
  const [filterKota, setFilterKota] = useState("Semua");
  const [filterProgram, setFilterProgram] = useState("Semua");
  const [selectedTutor, setSelectedTutor] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const fileInputRef = useRef(null);

  // Download CSV template for Intertest
  const downloadTemplate = () => {
    const header = "Name,Status Kemitraan,Phone Number,Subjek yang diajar,Status Intertest,Email,Alamat KTP,Alamat Tempat Tinggal Sekarang,Program,Posisi,Jumlah Kelas All Time B2C,Jumlah Kelas Aktif B2C,Jumlah Kelas All Time B2B,Jumlah Kelas Aktif B2B,Created,Kota Tinggal Sekarang\n";
    const blob = new Blob([header], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Template_Master_Data_Tutor_Intertest.csv";
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
              statusKemitraan: String(row["Status Kemitraan"] || "").trim(),
              phone: String(row["Phone Number"] || "").trim(),
              subjek: String(row["Subjek yang diajar"] || "").trim(),
              statusIntertest: String(row["Status Intertest"] || "").trim(),
              email: String(row["Email"] || "").trim(),
              alamatKtp: String(row["Alamat KTP"] || "").trim(),
              alamatDomisili: String(row["Alamat Tempat Tinggal Sekarang"] || "").trim(),
              program: String(row["Program"] || "").trim(),
              posisi: String(row["Posisi"] || "").trim(),
              kelasAllTimeB2C: Number(row["Jumlah Kelas All Time B2C"]) || 0,
              kelasAktifB2C: Number(row["Jumlah Kelas Aktif B2C"]) || 0,
              kelasAllTimeB2B: Number(row["Jumlah Kelas All Time B2B"]) || 0,
              kelasAktifB2B: Number(row["Jumlah Kelas Aktif B2B"]) || 0,
              created: String(row["Created"] || "").trim(),
              kota: String(row["Kota Tinggal Sekarang"] || "").trim(),
            });
          } catch (err) {
            console.error(`Error parsing Intertest row ${idx + 2}:`, err);
          }
        });

        if (newTeachers.length > 0) {
          try {
            await importMasterIntertestTeachers(newTeachers);
            alert(`✅ Berhasil mengimpor ${newTeachers.length} master data tutor Intertest.`);
          } catch (err) {
            console.error("Gagal mengimpor master Intertest data:", err);
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
    const userPass = window.prompt("Masukkan kata sandi untuk memperbarui/menghapus data:");
    if (userPass !== targaryenPassword.trim()) {
      alert("❌ Kata sandi salah! Tindakan ditolak.");
      return;
    }

    if (!window.confirm("PERINGATAN MENGHAPUS DATABASE:\nApakah Anda yakin ingin MENGHAPUS SEMUA MASTER DATA TUTOR INTERTEST di database Firestore?\n\nTindakan ini tidak dapat dibatalkan!")) {
      return;
    }

    setIsResetting(true);
    if (setMasterIntertestTeachers) setMasterIntertestTeachers([]);

    try {
      await deleteAllMasterIntertestTeachers();
      alert("✅ Semua master data tutor Intertest berhasil dihapus dari database Firestore.");
    } catch (e) {
      console.error("Gagal menghapus data:", e);
      alert("❌ Gagal mereset data: " + e.message);
    } finally {
      setIsResetting(false);
    }
  };

  // Dynamic filter options
  const filterOptions = useMemo(() => {
    const statusSet = new Set();
    const posSet = new Set();
    const kotaSet = new Set();
    const progSet = new Set();

    masterIntertestTeachers.forEach(t => {
      if (t.statusIntertest) statusSet.add(t.statusIntertest);
      if (t.posisi) posSet.add(t.posisi);
      if (t.kota) kotaSet.add(t.kota);
      if (t.program) progSet.add(t.program);
    });

    return {
      status: Array.from(statusSet).sort(),
      posisi: Array.from(posSet).sort(),
      kota: Array.from(kotaSet).sort(),
      program: Array.from(progSet).sort(),
    };
  }, [masterIntertestTeachers]);

  // Filtered dataset
  const filtered = useMemo(() => {
    return masterIntertestTeachers.filter(t => {
      if (filterStatusIntertest !== "Semua" && t.statusIntertest !== filterStatusIntertest) return false;
      if (filterPosisi !== "Semua" && t.posisi !== filterPosisi) return false;
      if (filterKota !== "Semua" && t.kota !== filterKota) return false;
      if (filterProgram !== "Semua" && t.program !== filterProgram) return false;

      if (search) {
        const q = search.toLowerCase();
        const matchName = t.name?.toLowerCase().includes(q);
        const matchEmail = t.email?.toLowerCase().includes(q);
        const matchSubjek = t.subjek?.toLowerCase().includes(q);
        const matchKota = t.kota?.toLowerCase().includes(q);
        const matchPos = t.posisi?.toLowerCase().includes(q);
        const matchProg = t.program?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchSubjek && !matchKota && !matchPos && !matchProg) return false;
      }

      return true;
    });
  }, [masterIntertestTeachers, filterStatusIntertest, filterPosisi, filterKota, filterProgram, search]);

  // Pagination calculation
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const handleFilterChange = (setter, val) => {
    setter(val);
    setCurrentPage(1);
  };

  // Metrics summary
  const metrics = useMemo(() => {
    const activeCount = masterIntertestTeachers.filter(t => t.statusIntertest === "Active").length;
    const totalActiveB2C = masterIntertestTeachers.reduce((acc, t) => acc + (Number(t.kelasAktifB2C) || 0), 0);
    const totalActiveB2B = masterIntertestTeachers.reduce((acc, t) => acc + (Number(t.kelasAktifB2B) || 0), 0);

    const cityCounts = {};
    masterIntertestTeachers.forEach(t => {
      if (t.kota) cityCounts[t.kota] = (cityCounts[t.kota] || 0) + 1;
    });

    const topCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0] || ["-", 0];

    return { activeCount, totalActiveB2C, totalActiveB2B, topCityName: topCity[0], topCityCount: topCity[1] };
  }, [masterIntertestTeachers]);

  return (
    <div>
      {/* Page Title & Actions Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0 }}>Master Data Tutor Intertest</h1>
          <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>Database mitra Interacademy, subjek diajar, status kelas B2C/B2B & domisili</p>
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
            background: "#6366F1", color: "#FFF", border: "none", borderRadius: 10,
            padding: "11px 20px", fontSize: 13, fontWeight: 700, cursor: isImporting ? "not-allowed" : "pointer",
            boxShadow: "0 4px 12px rgba(99,102,241,0.25)"
          }}>
            {isImporting ? "⏳ Mengimpor..." : "📤 Upload CSV Data"}
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
        <div style={{ background: "#FFF", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Intertest Tutor</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#0F172A", marginTop: 4 }}>{masterIntertestTeachers.length}</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Mitra Interacademy</div>
        </div>

        <div style={{ background: "#FFF", border: "1.5px solid #BBF7D0", borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#16A34A", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status Active</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#15803D", marginTop: 4 }}>{metrics.activeCount}</div>
          <div style={{ fontSize: 12, color: "#16A34A", marginTop: 4 }}>
            {masterIntertestTeachers.length ? Math.round((metrics.activeCount / masterIntertestTeachers.length) * 100) : 0}% of total
          </div>
        </div>

        <div style={{ background: "#FFF", border: "1.5px solid #C7D2FE", borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4F46E5", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Kelas Aktif</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#3730A3", marginTop: 4 }}>{metrics.totalActiveB2C + metrics.totalActiveB2B}</div>
          <div style={{ fontSize: 12, color: "#6366F1", marginTop: 4 }}>{metrics.totalActiveB2C} B2C · {metrics.totalActiveB2B} B2B</div>
        </div>

        <div style={{ background: "#FFF", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Top Domisili Kota</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", marginTop: 6 }}>📍 {metrics.topCityName}</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{metrics.topCityCount} tutor bertempat tinggal</div>
        </div>
      </div>

      {/* Multi-Category Filters */}
      <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
          🔍 Filter & Pencarian Master Data Intertest
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
          {/* Search Box */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>Pencarian</label>
            <div style={{ position: "relative" }}>
              <input value={search} onChange={e => handleFilterChange(setSearch, e.target.value)} placeholder="Nama, Subjek, Kota, Email..."
                style={{ width: "100%", padding: "9px 12px 9px 34px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: 14 }}>🔍</span>
            </div>
          </div>

          {/* Status Intertest Filter */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>Status Intertest</label>
            <select value={filterStatusIntertest} onChange={e => handleFilterChange(setFilterStatusIntertest, e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF", cursor: "pointer", boxSizing: "border-box" }}>
              <option value="Semua">Semua Status</option>
              {filterOptions.status.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
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

          {/* Kota Filter */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>Kota Domisili</label>
            <select value={filterKota} onChange={e => handleFilterChange(setFilterKota, e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF", cursor: "pointer", boxSizing: "border-box" }}>
              <option value="Semua">Semua Kota ({filterOptions.kota.length})</option>
              {filterOptions.kota.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          {/* Program Filter */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>Program</label>
            <select value={filterProgram} onChange={e => handleFilterChange(setFilterProgram, e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF", cursor: "pointer", boxSizing: "border-box" }}>
              <option value="Semua">Semua Program ({filterOptions.program.length})</option>
              {filterOptions.program.map(pr => <option key={pr} value={pr}>{pr}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>
            Menampilkan <span style={{ color: "#0F172A" }}>{filtered.length}</span> dari <span style={{ color: "#0F172A" }}>{masterIntertestTeachers.length}</span> tutor Intertest
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
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1050 }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}>
                {["#", "Nama Tutor", "Subjek Diajar", "Status Intertest", "Posisi", "Kota Domisili", "Kelas Aktif", "Kontak", "Action"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: h === "#" || h === "Action" || h === "Kelas Aktif" || h === "Status Intertest" ? "center" : "left", fontWeight: 700, fontSize: 11, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: "48px 20px", textAlign: "center", color: "#94A3B8" }}>
                    {masterIntertestTeachers.length === 0
                      ? "Belum ada master data tutor Intertest. Silakan klik tombol 'Upload CSV Data' di atas untuk mengimpor file."
                      : "Tidak ada master data tutor Intertest yang cocok dengan filter pencarian."}
                  </td>
                </tr>
              ) : (
                paginatedData.map((t, i) => {
                  const globalRank = (currentPage - 1) * pageSize + i + 1;
                  const totalAktif = (Number(t.kelasAktifB2C) || 0) + (Number(t.kelasAktifB2B) || 0);

                  return (
                    <tr key={t.id} style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#FAFBFF"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 700, color: "#94A3B8", fontSize: 12 }}>#{globalRank}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 700, color: "#0F172A" }}>{t.name}</div>
                        {t.program && (
                          <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{t.program}</div>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", maxWidth: 220 }}>
                        <div style={{ fontSize: 12, color: "#374151", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.subjek}>
                          {t.subjek || "-"}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <span style={{
                          background: t.statusIntertest === "Active" ? "#F0FDF4" : "#FEF2F2",
                          color: t.statusIntertest === "Active" ? "#15803D" : "#B91C1C",
                          border: `1px solid ${t.statusIntertest === "Active" ? "#BBF7D0" : "#FECACA"}`,
                          borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 700
                        }}>
                          {t.statusIntertest || "-"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ background: "#EEF2FF", color: "#4F46E5", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>
                          {t.posisi || "-"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 600, color: "#475569" }}>
                        📍 {t.kota || "-"}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: totalAktif > 0 ? "#16A34A" : "#64748B" }}>
                          {totalAktif}
                        </span>
                        <div style={{ fontSize: 10, color: "#94A3B8" }}>
                          B2C: {t.kelasAktifB2C || 0} · B2B: {t.kelasAktifB2B || 0}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 12 }}>
                        <div style={{ color: "#475569" }}>{t.email || "-"}</div>
                        {t.phone && (
                          <a href={t.phone.startsWith("http") ? t.phone : `https://${t.phone}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#25D366", textDecoration: "none", fontWeight: 600, marginTop: 2, display: "inline-block" }}>
                            📱 WhatsApp
                          </a>
                        )}
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

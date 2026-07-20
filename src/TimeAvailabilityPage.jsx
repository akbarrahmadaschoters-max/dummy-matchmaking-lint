import React, { useState, useMemo, useRef } from "react";
import Papa from "papaparse";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { importTimeAvailability, deleteAllTimeAvailability } from "./timeAvailabilityService.js";

// Helper function to calculate percentile
function getPercentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const k = (sorted.length - 1) * (p / 100);
  const base = Math.floor(k);
  const decimal = k - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + decimal * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
}

// 5-category styling
const CATEGORY_5_CONFIG = {
  "Very High Availability": { label: "🟢 Very High Availability", color: "#10B981", bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D" },
  "High Availability":      { label: "🟢 High Availability",      color: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
  "Moderate":               { label: "🟡 Moderate Availability",  color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", text: "#B45309" },
  "Low Availability":       { label: "🔴 Low Availability",       color: "#EF4444", bg: "#FEF2F2", border: "#FECACA", text: "#B91C1C" },
  "Very Low Availability":  { label: "🔴 Very Low Availability",  color: "#7F1D1D", bg: "#FFF5F5", border: "#FEB2B2", text: "#7F1D1D" },
};

// 3-category styling
const CATEGORY_3_CONFIG = {
  "High Availability":   { label: "🟢 High Availability",   color: "#10B981", bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D" },
  "Medium Availability": { label: "🟡 Medium Availability", color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", text: "#B45309" },
  "Low Availability":    { label: "🔴 Low Availability",    color: "#EF4444", bg: "#FEF2F2", border: "#FECACA", text: "#B91C1C" },
};

export default function TimeAvailabilityPage({ timeAvailabilityData = [], setTimeAvailabilityData }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("Semua");
  const [filterClass5, setFilterClass5] = useState("Semua");
  const [filterClass3, setFilterClass3] = useState("Semua");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const fileInputRef = useRef(null);

  // Template CSV Download
  const downloadTemplate = () => {
    const header = "Nama Tutor,Tutor Type,March 2026,April 2026,May 2026,June 2026\n";
    const blob = new Blob([header], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Template_Tutor_Sessions_Data.csv";
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
        const newRecords = [];

        parsed.forEach((row, idx) => {
          try {
            const name = String(row["Nama Tutor"] || row["Name"] || "").trim();
            if (!name) return;

            const type = String(row["Tutor Type"] || "").trim();
            const mar = Number(row["March 2026"]) || 0;
            const apr = Number(row["April 2026"]) || 0;
            const may = Number(row["May 2026"]) || 0;
            const jun = Number(row["June 2026"]) || 0;

            const total = mar + apr + may + jun;
            const avg = total / 4;

            newRecords.push({
              id: (Date.now() + idx).toString(),
              name,
              type: type || "N/A",
              march: mar,
              april: apr,
              may: may,
              june: jun,
              total,
              average: avg
            });
          } catch (err) {
            console.error(`Error parsing Intertest row ${idx + 2}:`, err);
          }
        });

        if (newRecords.length > 0) {
          try {
            await importTimeAvailability(newRecords);
            alert(`✅ Berhasil mengimpor ${newRecords.length} data sesi tutor.`);
          } catch (err) {
            console.error("Gagal mengimpor data sesi:", err);
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
    if (!window.confirm("PERINGATAN MENGHAPUS DATABASE:\nApakah Anda yakin ingin MENGHAPUS SEMUA DATA TIME AVAILABILITY TUTOR di database Firestore?\n\nTindakan ini tidak dapat dibatalkan!")) {
      return;
    }

    setIsResetting(true);
    if (setTimeAvailabilityData) setTimeAvailabilityData([]);

    try {
      await deleteAllTimeAvailability();
      alert("✅ Semua data time availability tutor berhasil dihapus dari database Firestore.");
    } catch (e) {
      console.error("Gagal menghapus data:", e);
      alert("❌ Gagal mereset data: " + e.message);
    } finally {
      setIsResetting(false);
    }
  };

  // 1. Calculate Dynamic Percentiles based on Average sessions
  const percentiles = useMemo(() => {
    const averages = timeAvailabilityData.map(t => Number(t.average) || 0);
    if (averages.length === 0) {
      return { p20: 0, p40: 0, p60: 0, p80: 0, p33: 0, p66: 0 };
    }
    return {
      p20: getPercentile(averages, 20),
      p40: getPercentile(averages, 40),
      p60: getPercentile(averages, 60),
      p80: getPercentile(averages, 80),
      p33: getPercentile(averages, 33),
      p66: getPercentile(averages, 66)
    };
  }, [timeAvailabilityData]);

  // 2. Classify tutors dynamically based on calculated percentiles
  const classifiedData = useMemo(() => {
    return timeAvailabilityData.map(t => {
      const avg = Number(t.average) || 0;
      let class5 = "Very High Availability";
      let class3 = "High Availability";

      // 5 Categories: Lower average sessions -> Higher availability
      if (avg <= percentiles.p20) {
        class5 = "Very High Availability";
      } else if (avg <= percentiles.p40) {
        class5 = "High Availability";
      } else if (avg <= percentiles.p60) {
        class5 = "Moderate";
      } else if (avg <= percentiles.p80) {
        class5 = "Low Availability";
      } else {
        class5 = "Very Low Availability";
      }

      // 3 Categories: P33 and P66
      if (avg <= percentiles.p33) {
        class3 = "High Availability";
      } else if (avg <= percentiles.p66) {
        class3 = "Medium Availability";
      } else {
        class3 = "Low Availability";
      }

      return { ...t, class5, class3 };
    });
  }, [timeAvailabilityData, percentiles]);

  // Dynamic filter options
  const filterOptions = useMemo(() => {
    const typeSet = new Set();
    classifiedData.forEach(t => {
      if (t.type) typeSet.add(t.type);
    });
    return Array.from(typeSet).sort();
  }, [classifiedData]);

  // Filtered dataset
  const filtered = useMemo(() => {
    return classifiedData.filter(t => {
      if (filterType !== "Semua" && t.type !== filterType) return false;
      if (filterClass5 !== "Semua" && t.class5 !== filterClass5) return false;
      if (filterClass3 !== "Semua" && t.class3 !== filterClass3) return false;

      if (search) {
        const q = search.toLowerCase();
        if (!t.name?.toLowerCase().includes(q)) return false;
      }

      return true;
    }).sort((a, b) => a.average - b.average); // Sort by average sessions asc (lowest sessions / highest availability first)
  }, [classifiedData, filterType, filterClass5, filterClass3, search]);

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
    const counts5 = {
      "Very High Availability": 0,
      "High Availability": 0,
      "Moderate": 0,
      "Low Availability": 0,
      "Very Low Availability": 0
    };
    classifiedData.forEach(t => {
      if (counts5[t.class5] !== undefined) {
        counts5[t.class5]++;
      }
    });

    const averageSessions = classifiedData.length
      ? (classifiedData.reduce((acc, t) => acc + (t.average || 0), 0) / classifiedData.length).toFixed(2)
      : 0;

    return { counts5, averageSessions };
  }, [classifiedData]);

  // Chart data preparation
  const chartData = useMemo(() => {
    return [
      { name: "Very High", count: metrics.counts5["Very High Availability"], color: "#10B981" },
      { name: "High",      count: metrics.counts5["High Availability"],      color: "#3B82F6" },
      { name: "Moderate",  count: metrics.counts5["Moderate"],               color: "#F59E0B" },
      { name: "Low",       count: metrics.counts5["Low Availability"],       color: "#EF4444" },
      { name: "Very Low",  count: metrics.counts5["Very Low Availability"],  color: "#7F1D1D" },
    ];
  }, [metrics]);

  return (
    <div>
      {/* Page Title & Actions Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0 }}>Tutor Time Availability Analysis</h1>
          <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>Analisis ketersediaan waktu berdasarkan rata-rata sesi mengajar (Percentiles: P20, P40, P60, P80 & P33, P66)</p>
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
            {isImporting ? "⏳ Mengimpor..." : "📤 Upload CSV Sessions"}
          </button>
        </div>
      </div>

      {/* Percentile Info Bar & Key Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
        
        {/* Dynamic Percentile Value Summary */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            📐 Nilai Batas Persentil Dinamis (Average Sesi)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
            {[
              { label: "P20", val: percentiles.p20.toFixed(2), desc: "Very High" },
              { label: "P40", val: percentiles.p40.toFixed(2), desc: "High" },
              { label: "P60", val: percentiles.p60.toFixed(2), desc: "Moderate" },
              { label: "P80", val: percentiles.p80.toFixed(2), desc: "Low" },
              { label: "P33", val: percentiles.p33.toFixed(2), desc: "3-Cat Low" },
              { label: "P66", val: percentiles.p66.toFixed(2), desc: "3-Cat High" },
            ].map((p, idx) => (
              <div key={idx} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#4F46E5" }}>{p.label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", marginTop: 3 }}>{p.val}</div>
                <div style={{ fontSize: 9, color: "#64748B", marginTop: 2 }}>{p.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 10, fontStyle: "italic" }}>
            * Persentil dihitung otomatis dari nilai Rata-rata Sesi seluruh tutor.
          </div>
        </div>

        {/* High-level Metrics */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", gap: 16 }}>
          <div style={{ flex: 1, borderRight: "1px solid #F1F5F9" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tutor Teranalisis</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#0F172A", marginTop: 4 }}>{classifiedData.length}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>Tutor aktif terdaftar</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Rata-rata Sesi Pool</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#4F46E5", marginTop: 4 }}>{metrics.averageSessions}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>Sesi per tutor / bulan</div>
          </div>
        </div>

      </div>

      {/* Visual Chart - Tutor Distribution */}
      {classifiedData.length > 0 && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "24px", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
            📊 Grafik Distribusi Time Availability Tutor (5 Kategori)
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600, fill: "#475569" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} />
                <Tooltip cursor={{ fill: "#F8FAFC" }} contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={48}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Multi-Category Filters */}
      <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
          🔍 Filter & Pencarian Ketersediaan Waktu
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
          {/* Search Box */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>Cari Nama Tutor</label>
            <div style={{ position: "relative" }}>
              <input value={search} onChange={e => handleFilterChange(setSearch, e.target.value)} placeholder="Tulis nama tutor..."
                style={{ width: "100%", padding: "9px 12px 9px 34px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: 14 }}>🔍</span>
            </div>
          </div>

          {/* Tutor Type Filter */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>Tutor Type</label>
            <select value={filterType} onChange={e => handleFilterChange(setFilterType, e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF", cursor: "pointer", boxSizing: "border-box" }}>
              <option value="Semua">Semua Type ({filterOptions.length})</option>
              {filterOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* 5-Category Classification Filter */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>Availability (5 Kategori)</label>
            <select value={filterClass5} onChange={e => handleFilterChange(setFilterClass5, e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF", cursor: "pointer", boxSizing: "border-box" }}>
              <option value="Semua">Semua Kategori</option>
              <option value="Very High Availability">Very High Availability (Sesi Sedikit)</option>
              <option value="High Availability">High Availability</option>
              <option value="Moderate">Moderate Availability</option>
              <option value="Low Availability">Low Availability</option>
              <option value="Very Low Availability">Very Low Availability (Sesi Banyak)</option>
            </select>
          </div>

          {/* 3-Category Classification Filter */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>Availability (3 Kategori)</label>
            <select value={filterClass3} onChange={e => handleFilterChange(setFilterClass3, e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF", cursor: "pointer", boxSizing: "border-box" }}>
              <option value="Semua">Semua Kategori</option>
              <option value="High Availability">High Availability (Sesi &lt;= P33)</option>
              <option value="Medium Availability">Medium Availability (P33 - P66)</option>
              <option value="Low Availability">Low Availability (Sesi &gt; P66)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>
            Menampilkan <span style={{ color: "#0F172A" }}>{filtered.length}</span> dari <span style={{ color: "#0F172A" }}>{classifiedData.length}</span> tutor
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
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1100 }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}>
                {["#", "Nama Tutor", "Tutor Type", "March", "April", "May", "June", "Grand Total", "Average Sesi", "Classification (5)", "Classification (3)"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: h === "#" || h === "Average Sesi" || h.includes("Classification") || h === "Grand Total" ? "center" : "left", fontWeight: 700, fontSize: 11, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: "48px 20px", textAlign: "center", color: "#94A3B8" }}>
                    {classifiedData.length === 0
                      ? "Belum ada data ketersediaan waktu. Silakan klik tombol 'Upload CSV Sessions' di atas untuk mengimpor file."
                      : "Tidak ada data tutor yang cocok dengan filter pencarian."}
                  </td>
                </tr>
              ) : (
                paginatedData.map((t, i) => {
                  const globalRank = (currentPage - 1) * pageSize + i + 1;
                  const c5 = CATEGORY_5_CONFIG[t.class5] || { label: t.class5, bg: "#FFF", border: "#E2E8F0", text: "#0F172A" };
                  const c3 = CATEGORY_3_CONFIG[t.class3] || { label: t.class3, bg: "#FFF", border: "#E2E8F0", text: "#0F172A" };

                  return (
                    <tr key={t.id} style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#FAFBFF"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 700, color: "#94A3B8", fontSize: 12 }}>#{globalRank}</td>
                      <td style={{ padding: "14px 16px", fontWeight: 700, color: "#0F172A" }}>{t.name}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ background: "#F1F5F9", color: "#475569", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                          {t.type || "N/A"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", color: "#475569" }}>{t.march}</td>
                      <td style={{ padding: "14px 16px", color: "#475569" }}>{t.april}</td>
                      <td style={{ padding: "14px 16px", color: "#475569" }}>{t.may}</td>
                      <td style={{ padding: "14px 16px", color: "#475569" }}>{t.june}</td>
                      <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 600, color: "#334155" }}>{t.total}</td>
                      <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 800, color: "#4F46E5" }}>{t.average.toFixed(2)}</td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <span style={{
                          background: c5.bg,
                          color: c5.text,
                          border: `1px solid ${c5.border}`,
                          borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 700,
                          display: "inline-block", minWidth: 150
                        }}>
                          {c5.label.replace("🟢 ", "").replace("🟡 ", "").replace("🔴 ", "")}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <span style={{
                          background: c3.bg,
                          color: c3.text,
                          border: `1px solid ${c3.border}`,
                          borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 700,
                          display: "inline-block", minWidth: 140
                        }}>
                          {c3.label.replace("🟢 ", "").replace("🟡 ", "").replace("🔴 ", "")}
                        </span>
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
    </div>
  );
}

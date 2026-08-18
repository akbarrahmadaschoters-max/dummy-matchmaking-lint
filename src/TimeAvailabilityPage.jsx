import React, { useState, useMemo, useRef, useEffect } from "react";
import Papa from "papaparse";
import { db } from "./firebase.js";
import { collection, doc, getDocs, writeBatch, setDoc, onSnapshot } from "firebase/firestore";
import { importTimeAvailability, deleteAllTimeAvailability } from "./timeAvailabilityService.js";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import targaryenPassword from "../env/HouseofTargareyan?raw";

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
  "Very High Availability": { label: "Very High", color: "#10B981", bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D", desc: "Sesi mengajar sedikit, ketersediaan waktu sangat longgar." },
  "High Availability":      { label: "High",      color: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8", desc: "Sesi mengajar di bawah rata-rata, ketersediaan waktu luang." },
  "Moderate":               { label: "Moderate",  color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", text: "#B45309", desc: "Jumlah sesi normal, ketersediaan waktu sedang." },
  "Low Availability":       { label: "Low",       color: "#EF4444", bg: "#FEF2F2", border: "#FECACA", text: "#B91C1C", desc: "Jadwal padat, ketersediaan waktu terbatas." },
  "Very Low Availability":  { label: "Very Low",  color: "#7F1D1D", bg: "#FFF5F5", border: "#FEB2B2", text: "#7F1D1D", desc: "Sesi mengajar sangat banyak, ketersediaan waktu hampir habis." },
};

function CalculationDetailModal({ tutor, percentiles, onClose }) {
  if (!tutor) return null;

  const avg = tutor.average;
  const c5 = CATEGORY_5_CONFIG[tutor.class5] || { label: tutor.class5, color: "#475569", bg: "#F8FAFC", border: "#E2E8F0", text: "#0F172A", desc: "" };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 60,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      backdropFilter: "blur(4px)"
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#FFFFFF", borderRadius: 20, width: "100%", maxWidth: 540,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden", display: "flex", flexDirection: "column"
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, background: "#EEF2FF", color: "#4F46E5", padding: "3px 8px", borderRadius: 6, textTransform: "uppercase" }}>
              Analisis Time Availability ({tutor.type || "Program"})
            </span>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", marginTop: 6 }}>{tutor.name}</div>
          </div>
          <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", borderRadius: "50%", width: 30, height: 30, fontSize: 18, color: "#64748B", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}>
          
          {/* Sesi Bulanan */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Riwayat Sesi 4 Bulan (Payroll)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[
                { label: "Maret", val: tutor.march },
                { label: "April", val: tutor.april },
                { label: "Mei", val: tutor.may },
                { label: "Juni", val: tutor.june },
              ].map((m, idx) => (
                <div key={idx} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>{m.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", marginTop: 3 }}>{m.val} sesi</div>
                </div>
              ))}
            </div>
          </div>

          {/* Formula Rata-rata */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Perhitungan Rata-rata Sesi</div>
            <div style={{ fontSize: 13, color: "#475569", marginTop: 4, fontFamily: "monospace" }}>
              ({tutor.march} + {tutor.april} + {tutor.may} + {tutor.june}) / 4 = <span style={{ fontWeight: 800, color: "#4F46E5" }}>{avg.toFixed(2)}</span>
            </div>
          </div>

          {/* Scale / Percentile Position */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Posisi di Antara Batas Persentil ({tutor.type || "Semua"})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {/* Visual Scale Bar */}
              <div style={{ height: 10, background: "#E2E8F0", borderRadius: 99, position: "relative", marginTop: 15, marginBottom: 15 }}>
                {/* P20 Marker */}
                <div style={{ position: "absolute", left: "20%", top: -14, fontSize: 9, fontWeight: 700, color: "#94A3B8" }}>P20 ({percentiles.p20.toFixed(1)})</div>
                <div style={{ position: "absolute", left: "20%", height: "100%", width: 2, background: "#CBD5E1" }} />
                
                {/* P40 Marker */}
                <div style={{ position: "absolute", left: "40%", top: -14, fontSize: 9, fontWeight: 700, color: "#94A3B8" }}>P40 ({percentiles.p40.toFixed(1)})</div>
                <div style={{ position: "absolute", left: "40%", height: "100%", width: 2, background: "#CBD5E1" }} />

                {/* P60 Marker */}
                <div style={{ position: "absolute", left: "60%", top: -14, fontSize: 9, fontWeight: 700, color: "#94A3B8" }}>P60 ({percentiles.p60.toFixed(1)})</div>
                <div style={{ position: "absolute", left: "60%", height: "100%", width: 2, background: "#CBD5E1" }} />

                {/* P80 Marker */}
                <div style={{ position: "absolute", left: "80%", top: -14, fontSize: 9, fontWeight: 700, color: "#94A3B8" }}>P80 ({percentiles.p80.toFixed(1)})</div>
                <div style={{ position: "absolute", left: "80%", height: "100%", width: 2, background: "#CBD5E1" }} />

                {/* Current Value Pointer */}
                {(() => {
                  const maxVal = Math.max(percentiles.p80 * 1.3, avg);
                  const leftPercent = maxVal > 0 ? Math.min(96, (avg / maxVal) * 100) : 0;
                  return (
                    <div style={{
                      position: "absolute", left: `${leftPercent}%`, top: -6, transform: "translateX(-50%)",
                      width: 22, height: 22, borderRadius: "50%", background: c5.color, border: "2px solid #FFF",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#FFF", fontSize: 9, fontWeight: 800
                    }} title={`Rata-rata: ${avg.toFixed(2)}`}>
                      ★
                    </div>
                  );
                })()}
              </div>

              {/* Text explanation */}
              <div style={{ background: c5.bg, border: `1px solid ${c5.border}`, borderRadius: 12, padding: "14px 16px", marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: c5.text }}>Kategori: {c5.label} Availability</span>
                  <span style={{ fontSize: 11, background: "#FFF", border: `1px solid ${c5.border}`, color: c5.text, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                    Sesi: {avg.toFixed(2)}
                  </span>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: c5.text, lineHeight: 1.5 }}>
                  {c5.desc}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid #F1F5F9", background: "#F8FAFC", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 9, background: "#FFF", border: "1.5px solid #E2E8F0", color: "#475569", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TimeAvailabilityPage({ timeAvailabilityData = [], setTimeAvailabilityData }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("Semua");
  const [filterClass5, setFilterClass5] = useState("Semua");
  const [selectedTutor, setSelectedTutor] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [viewMode, setViewMode] = useState("heatmap"); // "heatmap" or "table"

  const fileInputRef = useRef(null);

  // Sync state observer
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "sync_status", "time_availability"), (docSnap) => {
      if (docSnap.exists()) {
        setIsSynced(docSnap.data().synced);
      } else {
        setIsSynced(false);
      }
    });
    return () => unsub();
  }, []);

  // Auto-load default CSV if timeAvailabilityData has fewer records than full dataset (359 rows)
  useEffect(() => {
    if (!timeAvailabilityData || timeAvailabilityData.length < 300) {
      fetch("/csv/Time Availability.csv")
        .then(res => res.text())
        .then(csvText => {
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const records = [];
              results.data.forEach((row, idx) => {
                const name = (row["Nama Tutor"] || row["Name"] || "").trim();
                if (!name) return;
                const type = (row["Tutor Type"] || "").trim() || "N/A";
                if (type.toUpperCase() === "SAA") return; // Skip SAA tutors

                const mar = Number(row["March 2026"]) || 0;
                const apr = Number(row["April 2026"]) || 0;
                const may = Number(row["May 2026"]) || 0;
                const jun = Number(row["June 2026"]) || 0;
                const avgVal = row["Average"];
                const avg = avgVal ? Number(avgVal) : (mar + apr + may + jun) / 4;

                records.push({
                  id: `ta-default-${idx}-${name.replace(/\s+/g, '_')}`,
                  name,
                  type,
                  march: mar,
                  april: apr,
                  may: may,
                  june: jun,
                  total: mar + apr + may + jun,
                  average: avg
                });
              });

              if (records.length > 0 && setTimeAvailabilityData) {
                setTimeAvailabilityData(records);
              }
            }
          });
        })
        .catch(err => console.error("Error auto-loading Time Availability CSV:", err));
    }
  }, [timeAvailabilityData, setTimeAvailabilityData]);

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
            if (type.toUpperCase() === "SAA") return; // Skip SAA tutors

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
            console.error(`Error parsing row ${idx + 2}:`, err);
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
    const userPass = window.prompt("Masukkan kata sandi untuk memperbarui/menghapus data:");
    if (userPass !== targaryenPassword.trim()) {
      alert("❌ Kata sandi salah! Tindakan ditolak.");
      return;
    }

    if (!window.confirm("PERINGATAN MENGHAPUS DATABASE:\nApakah Anda yakin ingin MENGHAPUS SEMUA DATA TIME AVAILABILITY TUTOR di database Firestore?\n\nTindakan ini tidak dapat dibatalkan!")) {
      return;
    }

    setIsResetting(true);
    if (setTimeAvailabilityData) setTimeAvailabilityData([]);

    try {
      await deleteAllTimeAvailability();
      await setDoc(doc(db, "sync_status", "time_availability"), { synced: false, unsyncedAt: new Date().toISOString() });
      alert("✅ Semua data time availability tutor berhasil dihapus.");
    } catch (e) {
      console.error("Gagal menghapus data:", e);
      alert("❌ Gagal mereset data: " + e.message);
    } finally {
      setIsResetting(false);
    }
  };

  // Bulk Sync to main dashboard and offline dashboard
  const handleSync = async () => {
    if (!window.confirm("Apakah Anda yakin ingin MENYELARASKAN ketersediaan waktu tutor ini ke Main Dashboard dan Offline Dashboard secara massal?")) {
      return;
    }

    setIsSyncing(true);
    try {
      const snapshot = await getDocs(collection(db, "teachers"));
      const teachersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const batch = writeBatch(db);
      let updatedCount = 0;

      teachersList.forEach(t => {
        const match = classifiedData.find(avail => avail.name.toLowerCase().trim() === t.name.toLowerCase().trim());
        if (match) {
          const mappedAvailability = match.class5.replace(" Availability", "");
          const docRef = doc(db, "teachers", t.id);

          batch.update(docRef, {
            prevAvailability: t.availability || "Moderate",
            availability: mappedAvailability
          });
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        await batch.commit();
        await setDoc(doc(db, "sync_status", "time_availability"), { synced: true, syncedAt: new Date().toISOString(), count: updatedCount });
        alert(`✅ Berhasil menyelaraskan ketersediaan waktu untuk ${updatedCount} tutor ke Main & Offline Dashboard!`);
      } else {
        alert("ℹ Tidak ada nama tutor yang cocok di Main Dashboard untuk diselaraskan.");
      }
    } catch (err) {
      console.error("Gagal melakukan sinkronisasi:", err);
      alert("❌ Gagal sinkronisasi: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Cancel / Undo Sync
  const handleUndoSync = async () => {
    if (!window.confirm("Apakah Anda yakin ingin MEMBATALKAN sinkronisasi ketersediaan waktu dan mengembalikannya ke nilai semula?")) {
      return;
    }

    setIsSyncing(true);
    try {
      const snapshot = await getDocs(collection(db, "teachers"));
      const teachersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const batch = writeBatch(db);
      let restoredCount = 0;

      teachersList.forEach(t => {
        if (t.prevAvailability) {
          const docRef = doc(db, "teachers", t.id);
          batch.update(docRef, {
            availability: t.prevAvailability,
            prevAvailability: null
          });
          restoredCount++;
        }
      });

      if (restoredCount > 0) {
        await batch.commit();
        await setDoc(doc(db, "sync_status", "time_availability"), { synced: false, unsyncedAt: new Date().toISOString() });
        alert(`✅ Berhasil membatalkan sinkronisasi. ${restoredCount} tutor telah dikembalikan ke ketersediaan waktu semula.`);
      } else {
        alert("ℹ Tidak ada data sinkronisasi sebelumnya yang bisa dibatalkan.");
      }
    } catch (err) {
      console.error("Gagal membatalkan sinkronisasi:", err);
      alert("❌ Error: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Dynamic filter options
  const filterOptions = useMemo(() => {
    const typeSet = new Set();
    timeAvailabilityData.forEach(t => {
      if (t.type && t.type !== "N/A" && t.type.toUpperCase() !== "SAA") typeSet.add(t.type);
    });
    return Array.from(typeSet).sort();
  }, [timeAvailabilityData]);

  // 1. Program-filtered dataset (Intertest, Lingua, or Semua - Excludes SAA completely)
  const programFilteredData = useMemo(() => {
    return timeAvailabilityData.filter(t => {
      if (t.type && t.type.toUpperCase() === "SAA") return false;
      if (filterType !== "Semua" && t.type !== filterType) return false;
      return true;
    });
  }, [timeAvailabilityData, filterType]);

  // 2. Dynamic percentiles based on active program dataset
  const percentiles = useMemo(() => {
    const averages = programFilteredData.map(t => Number(t.average) || 0);
    if (averages.length === 0) {
      return { p20: 0, p40: 0, p60: 0, p80: 0 };
    }
    return {
      p20: getPercentile(averages, 20),
      p40: getPercentile(averages, 40),
      p60: getPercentile(averages, 60),
      p80: getPercentile(averages, 80)
    };
  }, [programFilteredData]);

  // 3. Classify tutors dynamically based on calculated percentiles for the active program
  const classifiedData = useMemo(() => {
    return programFilteredData.map(t => {
      const avg = Number(t.average) || 0;
      let class5 = "Very High Availability";

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

      return { ...t, class5 };
    });
  }, [programFilteredData, percentiles]);

  // 4. Further filter dataset by Availability Category (class5) and Search Query
  const filtered = useMemo(() => {
    return classifiedData.filter(t => {
      if (filterClass5 !== "Semua" && t.class5 !== filterClass5) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        if (!t.name?.toLowerCase().includes(q)) return false;
      }

      return true;
    }).sort((a, b) => a.average - b.average); // Sort by average sessions asc
  }, [classifiedData, filterClass5, search]);

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

  // Metrics summary based on program-classified dataset
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

  const pieData = useMemo(() => {
    return [
      { name: "Very High", value: metrics.counts5["Very High Availability"] || 0, color: "#10B981" },
      { name: "High",      value: metrics.counts5["High Availability"] || 0,      color: "#3B82F6" },
      { name: "Moderate",  value: metrics.counts5["Moderate"] || 0,               color: "#F59E0B" },
      { name: "Low",       value: metrics.counts5["Low Availability"] || 0,       color: "#EF4444" },
      { name: "Very Low",  value: metrics.counts5["Very Low Availability"] || 0,  color: "#7F1D1D" },
    ].filter(item => item.value > 0);
  }, [metrics]);

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Page Title & Actions Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0 }}>Tutor Time Availability Analysis</h1>
          <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>Analisis ketersediaan waktu berdasarkan rata-rata sesi mengajar (Percentiles: P20, P40, P60, P80)</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {isSynced ? (
            <button disabled={isSyncing} onClick={handleUndoSync} style={{
              background: "#FFFbeb", color: "#D97706", border: "1.5px solid #FDE68A", borderRadius: 10,
              padding: "11px 16px", fontSize: 13, fontWeight: 700, cursor: isSyncing ? "not-allowed" : "pointer", transition: "all 0.15s"
            }}>
              {isSyncing ? "⏳ Memproses..." : "↩ Batalkan Sinkronisasi"}
            </button>
          ) : (
            <button disabled={isSyncing || timeAvailabilityData.length === 0} onClick={handleSync} style={{
              background: "#4F46E5", color: "#FFF", border: "none", borderRadius: 10,
              padding: "11px 18px", fontSize: 13, fontWeight: 700, cursor: (isSyncing || timeAvailabilityData.length === 0) ? "not-allowed" : "pointer", transition: "all 0.15s",
              boxShadow: "0 4px 12px rgba(79,70,229,0.25)"
            }}>
              {isSyncing ? "⏳ Mensinkronkan..." : "🔗 Sinkronkan ke Dashboard"}
            </button>
          )}

          <button disabled={isResetting} onClick={handleResetData} style={{
            background: "#FEF2F2", color: "#EF4444", border: "1.5px solid #FECACA", borderRadius: 10,
            padding: "11px 16px", fontSize: 13, fontWeight: 700, cursor: isResetting ? "not-allowed" : "pointer", transition: "all 0.15s", opacity: isResetting ? 0.6 : 1
          }}>
            {isResetting ? "Memproses..." : "🗑 Perbarui Data"}
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
            {isImporting ? "⏳ Mengimpor..." : "📤 Upload CSV Sessions"}
          </button>
        </div>
      </div>

      {/* Percentile Info Bar & Explanations */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 20, marginBottom: 20 }}>
        
        {/* Dynamic Percentile Value Summary */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              📐 Nilai Batas Persentil Dinamis ({filterType === "Semua" ? "Seluruh Program" : filterType})
            </div>
            <span style={{ fontSize: 11, background: "#EEF2FF", color: "#4F46E5", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
              {classifiedData.length} Tutor
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[
              { label: "P20 (Persentil 20)", val: percentiles.p20.toFixed(2), color: "#10B981" },
              { label: "P40 (Persentil 40)", val: percentiles.p40.toFixed(2), color: "#3B82F6" },
              { label: "P60 (Persentil 60)", val: percentiles.p60.toFixed(2), color: "#F59E0B" },
              { label: "P80 (Persentil 80)", val: percentiles.p80.toFixed(2), color: "#EF4444" },
            ].map((p, idx) => (
              <div key={idx} style={{ background: "#F8FAFC", border: `1.5px solid ${p.color}25`, borderRadius: 10, padding: "12px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: p.color }}>{p.label.split(" ")[0]}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", marginTop: 4 }}>{p.val}</div>
                <div style={{ fontSize: 10, color: "#64748B", marginTop: 3 }}>Sesi / Bulan</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 10, fontStyle: "italic" }}>
            * Batas persentil dihitung secara dinamis berdasarkan data sesi rata-rata tutor program {filterType}.
          </div>
        </div>

        {/* Translation and Explanation of Percentiles */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            💡 Arti & Maksud Persentil Ketersediaan Waktu (Percentile Meaning)
          </div>
          <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, display: "flex", flexDirection: "column", gap: 6 }}>
            <div>
              • <strong>P20 ({percentiles.p20.toFixed(1)} Sesi)</strong>: Memisahkan 20% tutor dengan sesi paling sedikit (<strong>Very High Availability</strong>).
            </div>
            <div>
              • <strong>P40 ({percentiles.p40.toFixed(1)} Sesi)</strong>: Rata-rata sesi P20 - P40 diklasifikasikan sebagai <strong>High Availability</strong>.
            </div>
            <div>
              • <strong>P60 ({percentiles.p60.toFixed(1)} Sesi)</strong>: Rata-rata sesi P40 - P60 diklasifikasikan sebagai <strong>Moderate Availability</strong>.
            </div>
            <div>
              • <strong>P80 ({percentiles.p80.toFixed(1)} Sesi)</strong>: Rata-rata sesi P60 - P80 diklasifikasikan sebagai <strong>Low Availability</strong>. Di atas P80 (sesi terbanyak) diklasifikasikan sebagai <strong>Very Low Availability</strong>.
            </div>
          </div>
        </div>

      </div>

      {/* Visual Analytics (Pie & Bar Charts) */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "24px", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            📊 Analisis Visual Distribusi Ketersediaan Waktu Tutor ({filterType === "Semua" ? "Seluruh Program" : filterType})
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#4F46E5", background: "#EEF2FF", padding: "3px 10px", borderRadius: 8 }}>
            Total: {classifiedData.length} Tutor
          </span>
        </div>
        
        {classifiedData.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
            Belum ada data tutor untuk divisualisasikan. Silakan unggah berkas CSV terlebih dahulu.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24 }}>
            {/* Left Side: Large Pie Chart & Legend */}
            <div style={{ background: "#F8FAFC", border: "1px solid #F1F5F9", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", marginBottom: 16, textAlign: "center" }}>
                🟢 Persentase Distribusi Ketersediaan ({filterType})
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, gap: 16, flexWrap: "wrap" }}>
                <div style={{ width: 160, height: 160, margin: "0 auto" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} Tutor`, "Jumlah"]} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legend */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11, fontWeight: 600, flex: 1, minWidth: 150 }}>
                  {pieData.map(item => (
                    <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                        <span style={{ color: "#475569" }}>{item.name}</span>
                      </div>
                      <span style={{ color: "#0F172A", fontWeight: 700 }}>
                        {item.value} ({Math.round((item.value / classifiedData.length) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side: Bar Chart Comparison */}
            <div style={{ background: "#F8FAFC", border: "1px solid #F1F5F9", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", marginBottom: 16, textAlign: "center" }}>
                📊 Perbandingan Jumlah Tutor per Kategori ({filterType})
              </div>
              <div style={{ width: "100%", height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pieData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: "#64748B" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(0, 0, 0, 0.02)" }} formatter={(value) => [`${value} Tutor`, "Jumlah"]} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Filter Toolbar */}
      <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
          🔍 Pencarian & Filter Ketersediaan Waktu (Heatmap & Tabel)
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {/* Search Box */}
          <div style={{ position: "relative" }}>
            <input value={search} onChange={e => handleFilterChange(setSearch, e.target.value)} placeholder="Cari nama tutor..."
              style={{ width: "100%", padding: "9px 12px 9px 34px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF", boxSizing: "border-box" }} />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: 14 }}>🔍</span>
          </div>

          {/* Tutor Type Filter */}
          <select value={filterType} onChange={e => handleFilterChange(setFilterType, e.target.value)}
            style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF", cursor: "pointer", boxSizing: "border-box" }}>
            <option value="Semua">Semua Program ({timeAvailabilityData.length} Tutor)</option>
            {filterOptions.map(t => {
              const count = timeAvailabilityData.filter(x => x.type === t).length;
              return <option key={t} value={t}>{t} ({count} Tutor)</option>;
            })}
          </select>

          {/* Availability Category Filter */}
          <select value={filterClass5} onChange={e => handleFilterChange(setFilterClass5, e.target.value)}
            style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF", cursor: "pointer", boxSizing: "border-box" }}>
            <option value="Semua">Semua Availability ({classifiedData.length})</option>
            <option value="Very High Availability">Very High Availability (Sesi Sedikit)</option>
            <option value="High Availability">High Availability</option>
            <option value="Moderate">Moderate Availability</option>
            <option value="Low Availability">Low Availability</option>
            <option value="Very Low Availability">Very Low Availability (Sesi Banyak)</option>
          </select>
        </div>
      </div>

      {/* Visual Analytics Selector */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, background: "#F1F5F9", padding: 4, borderRadius: 10 }}>
          <button onClick={() => setViewMode("heatmap")} style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", transition: "all 0.15s",
            background: viewMode === "heatmap" ? "#FFFFFF" : "transparent",
            color: viewMode === "heatmap" ? "#0F172A" : "#64748B",
            boxShadow: viewMode === "heatmap" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
          }}>
            🌡️ Heatmap Grid View
          </button>
          <button onClick={() => setViewMode("table")} style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", transition: "all 0.15s",
            background: viewMode === "table" ? "#FFFFFF" : "transparent",
            color: viewMode === "table" ? "#0F172A" : "#64748B",
            boxShadow: viewMode === "table" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
          }}>
            📋 Daftar Tabel View
          </button>
        </div>

        <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>
          {isSynced ? "✅ Data Terintegrasi dengan Main Dashboard" : "❌ Belum Terintegrasi"}
        </div>
      </div>

      {/* Heatmap Grid View */}
      {viewMode === "heatmap" && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "24px", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                🌡️ Availability Heatmap Grid ({filtered.length} Tutor Tampil)
              </div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                Setiap kotak mewakili seorang tutor. Warna menunjukkan tingkat availability. Klik kotak untuk melihat detail perhitungan.
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {Object.entries(CATEGORY_5_CONFIG).map(([key, c]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: c.color }} />
                  <span style={{ color: "#475569" }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
              Tidak ada data ketersediaan waktu tutor untuk divisualisasikan. Silakan upload CSV atau ubah filter.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))", gap: 6 }}>
              {filtered.map(t => {
                const c = CATEGORY_5_CONFIG[t.class5] || { color: "#E2E8F0" };
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTutor(t)}
                    title={`${t.name} (${t.type})\nRata-rata: ${t.average.toFixed(2)} sesi\nKategori: ${t.class5}`}
                    style={{
                      aspectRatio: "1/1",
                      background: c.color,
                      borderRadius: 6,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#FFFFFF",
                      fontWeight: 800,
                      fontSize: 10,
                      transition: "transform 0.15s, box-shadow 0.15s",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = "scale(1.15) translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.15)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = "scale(1) translateY(0)";
                      e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.1)";
                    }}
                  >
                    {t.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Multi-Category Filters & Table */}
      <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", display: viewMode === "table" ? "block" : "none" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>Nama Tutor</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>Type</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>Maret</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>April</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>Mei</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>Juni</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>Rata-rata</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>Kategori Availability</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map(t => {
                const c = CATEGORY_5_CONFIG[t.class5] || { label: t.class5, bg: "#F8FAFC", text: "#475569", border: "#E2E8F0" };
                return (
                  <tr key={t.id} style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#FAFBFF"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "14px 16px", fontWeight: 700, color: "#0F172A" }}>{t.name}</td>
                    <td style={{ padding: "14px 16px", color: "#64748B", fontWeight: 600 }}>{t.type}</td>
                    <td style={{ padding: "14px 16px", textAlign: "center", color: "#475569" }}>{t.march}</td>
                    <td style={{ padding: "14px 16px", textAlign: "center", color: "#475569" }}>{t.april}</td>
                    <td style={{ padding: "14px 16px", textAlign: "center", color: "#475569" }}>{t.may}</td>
                    <td style={{ padding: "14px 16px", textAlign: "center", color: "#475569" }}>{t.june}</td>
                    <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 800, color: "#4F46E5" }}>{t.average.toFixed(2)}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 700 }}>
                        {c.label}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <button onClick={() => setSelectedTutor(t)} style={{ padding: "5px 11px", borderRadius: 7, border: "1.5px solid #E0E7FF", background: "#EEF2FF", color: "#4F46E5", fontWeight: 600, cursor: "pointer", fontSize: 11 }}>
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div style={{ padding: "16px 24px", background: "#F8FAFC", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "#64748B" }}>
            Halaman {currentPage} dari {totalPages}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #CBD5E1", background: "#FFF", fontSize: 12, fontWeight: 600, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>
              ← Prev
            </button>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #CBD5E1", background: "#FFF", fontSize: 12, fontWeight: 600, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}>
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedTutor && (
        <CalculationDetailModal tutor={selectedTutor} percentiles={percentiles} onClose={() => setSelectedTutor(null)} />
      )}
    </div>
  );
}

import React, { useState, useMemo, useRef } from "react";
import Papa from "papaparse";
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { INITIAL_TEACHERS, calcScore, getStatus, STATUS_CONFIG, scoreColor } from "./scoring.js";
import { StatusBadge, ScoreBar } from "./components.jsx";
import { useGoogleLogin } from "@react-oauth/google";
import { db } from "./firebase.js";
import { doc, setDoc, deleteDoc, writeBatch, collection } from "firebase/firestore";

function DrillDown({ teacher, score, onClose, onDisqualify, gToken, setGToken }) {
  const { breakdown, penalty } = score;
  const status = getStatus(score, teacher);
  const [showDisq, setShowDisq] = useState(false);
  const [reason, setReason] = useState("Time Availability");
  const [loadingCal, setLoadingCal] = useState(false);
  const [calMsg, setCalMsg] = useState(null);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defDate = tomorrow.toISOString().split("T")[0];
  const minDate = new Date().toISOString().split("T")[0];

  const [inspDate, setInspDate] = useState(defDate);
  const [inspTime, setInspTime] = useState("09:00");
  const [isScheduled, setIsScheduled] = useState(false);

  const createEvent = async (token) => {
    setLoadingCal(true);
    setCalMsg(null);
    try {
      const [year, month, day] = inspDate.split("-");
      const [hours, minutes] = inspTime.split(":");
      const start = new Date(year, month - 1, day, hours, minutes, 0, 0);
      const end = new Date(start);
      end.setHours(start.getHours() + 1);

      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: `Inspeksi Class — ${teacher.name}`,
          description: `Jadwal inspeksi untuk ${teacher.name} · Program: ${teacher.program}`,
          start: { dateTime: start.toISOString(), timeZone: "Asia/Jakarta" },
          end: { dateTime: end.toISOString(), timeZone: "Asia/Jakarta" }
        })
      });

      if (!res.ok) throw new Error("Gagal membuat event");
      setCalMsg({ type: "success", text: "✅ Event inspeksi berhasil dibuat di Google Calendar" });
      setIsScheduled(true);
    } catch (err) {
      setCalMsg({ type: "error", text: "❌ " + err.message });
    } finally {
      setLoadingCal(false);
    }
  };

  const login = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/calendar.events",
    onSuccess: (tokenResponse) => { setGToken(tokenResponse.access_token); createEvent(tokenResponse.access_token); },
    onError: () => setCalMsg({ type: "error", text: "❌ Google Login dibatalkan atau gagal" })
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#FFFFFF", borderRadius: 20, width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", overflow: "hidden" }}>
        <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>{teacher.name}</div>
              <div style={{ fontSize: 13, color: "#64748B", marginTop: 3 }}>{teacher.program} · {teacher.identifier} · Availability: {teacher.availability}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <StatusBadge status={status} />
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0F172A" }}>{score.final}<span style={{ fontSize: 14, fontWeight: 500, color: "#94A3B8" }}>/100</span></div>
            </div>
          </div>
        </div>
        <div style={{ padding: "20px 28px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>Score Breakdown</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {Object.values(breakdown).map(b => (
              <div key={b.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>
                    {b.label}
                    {b.label === "Class Inspection" && b.val === null && <span style={{ marginLeft: 8, fontSize: 11, background: "#FEF3C7", color: "#92400E", borderRadius: 6, padding: "1px 7px", fontWeight: 600 }}>Belum Diinspeksi</span>}
                    {b.label === "Compliance" && b.val !== null && b.val < 100 && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: "#B91C1C", fontWeight: 600 }}>(100 − {100 - b.val} = {b.val})</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>
                    {b.val !== null ? `${b.val} × ${Math.round(b.weight * 100)}%` : "—"}
                    <span style={{ marginLeft: 8, color: "#6366F1", fontWeight: 600 }}>= {b.contrib.toFixed(1)}</span>
                  </div>
                </div>
                {b.val !== null ? <ScoreBar val={b.val} color="#6366F1" /> : <div style={{ height: 6, background: "#F1F5F9", borderRadius: 99 }} />}
              </div>
            ))}
            {penalty > 0 && (
              <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#C2410C" }}>⚠ Ganti Tutor Penalty ({teacher.gantiTutor}×)</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#C2410C" }}>−{penalty} poin</span>
              </div>
            )}
            {!teacher.hasInspection && (
              <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#92400E" }}>
                ℹ Bobot redistribusi karena belum diinspeksi (QC 42% · NPS 36% · Compliance 12%)
              </div>
            )}
          </div>
        </div>
        {!teacher.hasInspection && (
          <div style={{ padding: "0 28px 16px" }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6, textTransform: "uppercase" }}>Tanggal Inspeksi</label>
                <input type="date" value={inspDate} min={minDate} onChange={e => setInspDate(e.target.value)} disabled={isScheduled} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6, textTransform: "uppercase" }}>Jam Mulai</label>
                <input type="time" value={inspTime} step="1800" onChange={e => setInspTime(e.target.value)} disabled={isScheduled} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <button onClick={() => gToken ? createEvent(gToken) : login()} disabled={loadingCal || isScheduled} style={{ width: "100%", background: isScheduled ? "#F0FDF4" : "#FEF3C7", color: isScheduled ? "#16A34A" : "#92400E", border: `1px solid ${isScheduled ? "#BBF7D0" : "#FDE68A"}`, borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600, cursor: (loadingCal || isScheduled) ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
              {loadingCal ? "⏳ Membuat Jadwal..." : isScheduled ? "✅ Inspeksi Dijadwalkan" : "📋 Trigger Jadwal Inspeksi"}
            </button>
            {calMsg && <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: calMsg.type === "success" ? "#F0FDF4" : "#FEF2F2", color: calMsg.type === "success" ? "#16A34A" : "#DC2626" }}>{calMsg.text}</div>}
          </div>
        )}
        <div style={{ padding: "0 28px 24px", display: "flex", gap: 12 }}>
          <button onClick={() => setShowDisq(true)} style={{ flex: 1, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600, color: "#B91C1C", cursor: "pointer" }}>⛔ Disqualify</button>
          <button onClick={onClose} style={{ flex: 1, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer" }}>Tutup</button>
        </div>
        {showDisq && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.95)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ width: "100%", background: "#FFF", borderRadius: 16, border: "1px solid #E2E8F0", padding: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#0F172A" }}>Konfirmasi Disqualify</h3>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748B" }}>Pilih alasan mendiskualifikasi <b>{teacher.name}</b>:</p>
              <select value={reason} onChange={e => setReason(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #E2E8F0", marginBottom: 20 }}>
                <option>Time Availability</option>
                <option>QC</option>
                <option>Compliance</option>
                <option>Force Majeur</option>
                <option>Lainnya</option>
              </select>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => onDisqualify(teacher.id, reason)} style={{ flex: 1, background: "#EF4444", color: "#FFF", border: "none", padding: "10px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>Confirm</button>
                <button onClick={() => setShowDisq(false)} style={{ flex: 1, background: "#F1F5F9", color: "#475569", border: "none", padding: "10px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>Batal</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditModal({ teacher, onSave, onClose }) {
  const [form, setForm] = useState({ ...teacher });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const fields = [
    { key: "name",        label: "Nama Teacher",             type: "text"   },
    { key: "program",     label: "Program",                  type: "select", opts: ["IELTS", "SAT"] },
    { key: "kota",        label: "Kota",                     type: "text"   },
    { key: "qc",          label: "QC Score (0–100)",         type: "number", min: 0, max: 100 },
    { key: "nps",         label: "NPS Tutor (0–100)",        type: "number", min: 0, max: 100 },
    { key: "inspection",  label: "Class Inspection (0–100)", type: "number", min: 0, max: 100 },
    { key: "compliance",  label: "Compliance (0–100)",       type: "number", min: 0, max: 100 },
    { key: "gantiTutor",  label: "Ganti Tutor Count",        type: "number", min: 0, max: 10  },
    { key: "availability",label: "Tingkat Availability",     type: "select", opts: ["High", "Medium", "Moderate", "Low"] },
  ];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#FFF", borderRadius: 20, width: "100%", maxWidth: 460, overflow: "hidden" }}>
        <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>Edit Teacher</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#94A3B8" }}>×</button>
        </div>
        <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14, maxHeight: "60vh", overflowY: "auto" }}>
          {fields.map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 5 }}>{f.label}</label>
              {f.type === "select" ? (
                <select value={form[f.key]} onChange={e => set(f.key, e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13 }}>
                  {f.opts.map(o => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input type={f.type} value={form[f.key]} onChange={e => set(f.key, f.type === "number" ? +e.target.value : e.target.value)} style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13 }} />
              )}
            </div>
          ))}
        </div>
        <div style={{ padding: "16px 28px 22px", display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 10, background: "#F8FAFC", border: "1.5px solid #E2E8F0", cursor: "pointer", fontWeight: 600, color: "#475569" }}>Batal</button>
          <button onClick={() => { onSave(form); onClose(); }} style={{ flex: 2, padding: "10px 0", borderRadius: 10, background: "#6366F1", color: "#FFF", border: "none", cursor: "pointer", fontWeight: 700 }}>Simpan</button>
        </div>
      </div>
    </div>
  );
}



function MetricCard({ statusKey, count, total, onClick, active, icon, labelOverride }) {
  const c = STATUS_CONFIG[statusKey] || { bg: "#FFFFFF", border: "#E2E8F0", text: "#64748B", label: labelOverride };
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div onClick={onClick} style={{
      background: active ? c.bg : "#FFFFFF",
      border: `1.5px solid ${active ? c.border : "#E2E8F0"}`,
      borderRadius: 14, padding: "16px 20px", cursor: onClick ? "pointer" : "default",
      transition: "all 0.18s", display: "flex", flexDirection: "column", justifyContent: "space-between",
      boxShadow: active ? `0 0 0 3px ${c.border}` : "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {icon && <div style={{ fontSize: 16 }}>{icon}</div>}
        <div style={{ fontSize: 11, fontWeight: 700, color: c.text || "#475569", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {labelOverride || c.label}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 32, fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>{count}</div>
        <div style={{ fontSize: 12, color: "#64748B", marginTop: 4, fontWeight: 600 }}>
          {pct}% of displayed
        </div>
      </div>
    </div>
  );
}

export default function OfflinePage({ teachers, setTeachers }) {
  const [selectedCity, setSelectedCity] = useState("All");
  const [activeMetric, setActiveMetric] = useState(null);
  const [tooltipContent, setTooltipContent] = useState("");

  const [drill, setDrill] = useState(null);
  const [editing, setEditing] = useState(null);
  const [gToken, setGToken] = useState(null);

  const updateTeacher = async (updated) => {
    try {
      await setDoc(doc(db, "teachers", updated.id.toString()), updated, { merge: true });
    } catch (e) {
      console.error("Error updating teacher:", e);
      alert("Gagal update: " + e.message);
    }
  };

  const removeTeacher = async (id) => {
    try {
      await deleteDoc(doc(db, "teachers", id.toString()));
    } catch (e) {
      console.error("Error removing teacher:", e);
      alert("Gagal menghapus: " + e.message);
    }
  };
  const fileInputRef = useRef(null);

  const offlineTeachers = useMemo(() => teachers.filter(t => t.kota), [teachers]);

  // Grouping teachers by city for the map
  const cityGroups = useMemo(() => {
    const groups = {};
    offlineTeachers.forEach(t => {
      if (!groups[t.kota]) {
        groups[t.kota] = {
          kota: t.kota,
          lat: t.lat,
          lng: t.lng,
          teachers: [],
          bestStatus: null,
          bestScore: -1
        };
      }
      const score = calcScore(t);
      const status = getStatus(score, t);
      groups[t.kota].teachers.push({ ...t, score, status });
      
      if (score.final > groups[t.kota].bestScore) {
        groups[t.kota].bestScore = score.final;
        groups[t.kota].bestStatus = status;
      }
    });
    return Object.values(groups);
  }, [offlineTeachers]);

  const scored = useMemo(() =>
    offlineTeachers.map(t => {
      const score = calcScore(t);
      return { ...t, score, status: getStatus(score, t) };
    }).sort((a, b) => b.score.final - a.score.final),
    [offlineTeachers]
  );

  const filtered = useMemo(() => scored.filter(t => {
    if (selectedCity !== "All" && t.kota !== selectedCity) return false;
    if (activeMetric && t.status !== activeMetric) return false;
    return true;
  }), [scored, selectedCity, activeMetric]);

  const counts = useMemo(() => {
    const c = { "Top Performer": 0, Eligible: 0, Watch: 0, "Perlu Review": 0, Disqualified: 0 };
    filtered.forEach(t => {
      if (t.isDisqualified) {
        c["Disqualified"]++;
      } else if (c[t.status] !== undefined) {
        c[t.status]++;
      }
    });
    return c;
  }, [filtered]);
  


  const downloadTemplate = () => {
    const header = "No,Tier,Nama Tutor,Kota,Skor QC,Skor NPS,Jumlah Detractors,Jumlah Passives,Jumlah Promoters,Compliance,Ganti Tutor,Program\n";
    const blob = new Blob([header], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Template_Offline_Teacher.csv";
    link.click();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const CITY_COORDINATES = {
          "jakarta": { lat: -6.2088, lng: 106.8456 },
          "bandung": { lat: -6.9175, lng: 107.6191 },
          "surabaya": { lat: -7.2504, lng: 112.7688 },
          "yogyakarta": { lat: -7.7956, lng: 110.3695 },
          "medan": { lat: 3.5800, lng: 98.6700 },
          "makassar": { lat: -5.1477, lng: 119.4327 },
          "denpasar": { lat: -8.6500, lng: 115.2167 },
          "semarang": { lat: -6.9667, lng: 110.4167 },
          "balikpapan": { lat: -1.2379, lng: 116.8529 },
          "palembang": { lat: -2.9909, lng: 104.7566 },
          "default": { lat: -2.5489, lng: 118.0149 }
        };
        const parsed = results.data;
        const newTeachers = [];
        parsed.forEach((row, idx) => {
          try {
            const name = String(row["Nama Tutor"] || "").trim();
            const kota = String(row["Kota"] || "").trim();
            const p = String(row["Program"] || "IELTS").trim();
            if (!name || !kota) throw new Error("Nama Tutor atau Kota kosong");

            const coords = CITY_COORDINATES[kota.toLowerCase()] || CITY_COORDINATES["default"];

            let qcRaw = row["Skor QC"];
            let qc = (qcRaw === null || qcRaw === undefined || String(qcRaw).trim() === "" || Number(qcRaw) === 0) ? null : Number(qcRaw);

            const d = Number(row["Jumlah Detractors"]) || 0;
            const pa = Number(row["Jumlah Passives"]) || 0;
            const pr = Number(row["Jumlah Promoters"]) || 0;
            const total = d + pa + pr;
            let nps = 0;
            if (total > 0) {
              const rawNps = ((pr - d) / total) * 100;
              nps = Math.round((rawNps + 100) / 2);
            }

            const comp = Number(row["Compliance"]) || 0;
            const ganti = Number(row["Ganti Tutor"]) || 0;

            newTeachers.push({
              id: (Date.now() + idx).toString(),
              name,
              kota,
              lat: coords.lat,
              lng: coords.lng,
              program: p,
              qc,
              nps,
              compliance: comp,
              gantiTutor: ganti,
              hasInspection: false,
              inspection: null,
              availability: "Moderate",
              identifier: "Baru",
              availabilitySlots: []
            });
          } catch(err) {
            console.error(`Error row ${idx + 2}: ${err.message}`);
          }
        });
        if (newTeachers.length > 0) {
          (async () => {
            try {
              const teachersRef = collection(db, "teachers");
              const batches = [];
              let currentBatch = writeBatch(db);
              let opCount = 0;

              newTeachers.forEach(teacher => {
                const docRef = doc(teachersRef, teacher.id.toString());
                currentBatch.set(docRef, teacher);
                opCount++;

                if (opCount === 500) {
                  batches.push(currentBatch.commit());
                  currentBatch = writeBatch(db);
                  opCount = 0;
                }
              });
              if (opCount > 0) batches.push(currentBatch.commit());

              await Promise.all(batches);
              alert(`Berhasil import ${newTeachers.length} teacher offline/hybrid.`);
            } catch (e) {
              console.error("Import error", e);
              alert("Gagal import: " + e.message);
            }
          })();
        }
      }
    });
    e.target.value = null;
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0 }}>Offline & Hybrid Teachers</h1>
          <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>Geographic distribution & status tracking</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={downloadTemplate} style={{
            background: "#F1F5F9", color: "#475569", border: "1.5px solid #E2E8F0", borderRadius: 10,
            padding: "11px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
          }}>Template CSV</button>
          
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} style={{ display: "none" }} />
          <button onClick={() => fileInputRef.current?.click()} style={{
            background: "#10B981", color: "#FFF", border: "none", borderRadius: 10,
            padding: "11px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
          }}>Import CSV</button>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        {/* Map Container */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, position: "relative", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
          {/* Header Map */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #F1F5F9", background: "#FFFFFF", zIndex: 20, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.05em" }}>Peta Sebaran</span>
              {selectedCity !== "All" && (
                <button onClick={() => setSelectedCity("All")} style={{ padding: "4px 10px", borderRadius: 6, background: "#FEF2F2", color: "#B91C1C", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  Reset Filter: {selectedCity} ✖
                </button>
              )}
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>Filter Kota:</span>
              <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}
                      style={{ padding: "8px 14px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, outline: "none", background: "#F8FAFC", fontWeight: 600, color: "#0F172A", minWidth: 160, cursor: "pointer" }}>
                <option value="All">Semua Kota</option>
                {Array.from(new Set(teachers.map(t => t.kota))).map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div style={{ position: "relative", width: "100%", height: 520, borderRadius: 16, overflow: "hidden" }}>
            {/* Legend as overlay */}
            <div style={{ position: "absolute", bottom: 20, right: 20, zIndex: 1000, background: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(4px)", padding: "12px 16px", borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Legend</div>
              {["Top Performer", "Eligible", "Watch", "Perlu Review"].map(s => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS_CONFIG[s].dot }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{s}</span>
                </div>
              ))}
            </div>

            <MapContainer 
              center={[-2.5, 118]} 
              zoom={5} 
              minZoom={4} 
              maxZoom={12} 
              maxBounds={[[-12, 94], [7, 142]]} 
              scrollWheelZoom={true} 
              style={{ width: "100%", height: "100%", background: "#E5E7EB" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              
              {cityGroups.map((city, i) => {
                const isSelected = selectedCity === city.kota;
                const opacity = selectedCity === "All" || isSelected ? 1 : 0.4;
                const color = STATUS_CONFIG[city.bestStatus]?.dot || "#6366F1";
                const isCluster = city.teachers.length > 1;
                const radius = isCluster ? Math.min(14 + (city.teachers.length * 0.5), 20) : 9;
                const strokeW = isCluster ? 2 : 2.5;
                
                const markerHtml = `
                  <div style="
                    background-color: ${color};
                    width: ${radius * 2}px;
                    height: ${radius * 2}px;
                    border-radius: 50%;
                    border: ${strokeW}px solid #FFFFFF;
                    box-shadow: 0px 3px 6px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: ${opacity};
                    ${isSelected ? 'transform: scale(1.15); box-shadow: 0px 0px 0px 4px ' + color + '66;' : ''}
                    transition: all 0.2s;
                  ">
                    ${isCluster ? `<span style="color: #FFFFFF; font-family: Inter; font-size: 11px; font-weight: 800;">${city.teachers.length}</span>` : ''}
                  </div>
                `;

                const customIcon = L.divIcon({
                  html: markerHtml,
                  className: "custom-leaflet-marker",
                  iconSize: [radius * 2, radius * 2],
                  iconAnchor: [radius, radius],
                });

                return (
                  <Marker 
                    key={i} 
                    position={[city.lat, city.lng]} 
                    icon={customIcon}
                    eventHandlers={{
                      click: () => setSelectedCity(city.kota)
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -radius]} opacity={1}>
                      <span style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 12 }}>{city.kota}</span>
                    </Tooltip>
                    <Popup>
                       <div style={{ padding: "4px", minWidth: 160, fontFamily: "Inter" }}>
                         <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", marginBottom: 8, textTransform: "uppercase" }}>{city.kota}</div>
                         <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 12 }}>{city.teachers.length} Teachers</div>
                         {["Top Performer", "Eligible", "Watch", "Perlu Review", "Disqualified"].map(s => {
                           const count = city.teachers.filter(t => t.status === s || (s === "Disqualified" && t.isDisqualified)).length;
                           if (count === 0) return null;
                           return (
                             <div key={s} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                               <span style={{ color: STATUS_CONFIG[s]?.text }}>{s}</span>
                               <span style={{ color: "#0F172A" }}>{count}</span>
                             </div>
                           )
                         })}
                       </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Analytics Container */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>
            COMPOSITE SCORE — {selectedCity === "All" ? "ALL CITIES" : selectedCity.toUpperCase()}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
             {["Top Performer", "Eligible", "Watch", "Perlu Review"].map(s => (
               <MetricCard key={s} statusKey={s} count={counts[s]} total={filtered.length}
                 active={activeMetric === s}
                 onClick={() => setActiveMetric(activeMetric === s ? null : s)} />
             ))}
          </div>
        </div>
      </div>



      {/* Table */}
      <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}>
              {["Rank", "Nama Teacher", "Kota", "Program", "Availability", "QC", "NPS", "Inspection", "Compliance", "Penalty", "Final Score", "Status", ""].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: h === "Final Score" || h === "Rank" ? "center" : "left", fontWeight: 700, fontSize: 11, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={t.id} id={`row-${t.id}`} style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#FAFBFF"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 700, color: "#94A3B8", fontSize: 12 }}>#{i + 1}</td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ fontWeight: 600, color: "#0F172A" }}>{t.name}</div>
                  {(t.gantiTutor === 1 || t.gantiTutor === 2) && (
                    <div style={{ fontSize: 10, color: "#B45309", fontWeight: 600, marginTop: 2 }}>⚠ Flagged</div>
                  )}
                </td>
                <td style={{ padding: "14px 16px", fontWeight: 600, color: "#475569" }}>{t.kota}</td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ background: "#F1F5F9", color: "#475569", borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>{t.program}</span>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 600, color: t.availability === "High" ? "#15803D" : t.availability === "Medium" ? "#1D4ED8" : t.availability === "Moderate" ? "#B45309" : "#B91C1C" }}>
                  {t.availability || "—"}
                </td>
                <td style={{ padding: "14px 16px", minWidth: 100 }}><ScoreBar val={t.qc} color="#6366F1" /></td>
                <td style={{ padding: "14px 16px", minWidth: 100 }}><ScoreBar val={t.nps} color="#8B5CF6" /></td>
                <td style={{ padding: "14px 16px", minWidth: 110 }}>
                  {t.hasInspection
                    ? <ScoreBar val={t.inspection || 0} color="#06B6D4" />
                    : <span style={{ fontSize: 11, background: "#FEF3C7", color: "#92400E", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>Belum Diinspeksi</span>
                  }
                </td>
                <td style={{ padding: "14px 16px", minWidth: 100 }}><ScoreBar val={t.compliance} color="#10B981" /></td>
                <td style={{ padding: "14px 16px", textAlign: "center" }}>
                  {(() => {
                    const c = t.gantiTutor;
                    const bg = c === 0 ? "#F1F5F9" : c === 1 ? "#FEF3C7" : c === 2 ? "#FFEDD5" : "#FEF2F2";
                    const text = c === 0 ? "#64748B" : c === 1 ? "#D97706" : c === 2 ? "#EA580C" : "#DC2626";
                    return (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <span style={{ background: bg, color: text, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{c}/3</span>
                        {c === 1 || c === 2 ? <span style={{ color: "#C2410C", fontWeight: 700, fontSize: 11 }}>−10</span> : null}
                      </div>
                    )
                  })()}
                </td>
                <td style={{ padding: "14px 16px", textAlign: "center" }}>
                  {t.isDisqualified ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor(t.score.final) }}>0</span>
                      <span style={{ fontSize: 10, background: "#FEF2F2", color: "#B91C1C", padding: "3px 6px", borderRadius: 4, fontWeight: 600, marginTop: 4, whiteSpace: "nowrap" }}>Excluded: {t.disqualifiedReason}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor(t.score.final) }}>{t.score.final}</span>
                  )}
                </td>
                <td style={{ padding: "14px 16px" }}><StatusBadge status={t.status} small /></td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setDrill({ teacher: t, score: t.score })} style={{ padding: "5px 11px", borderRadius: 7, border: "1.5px solid #E0E7FF", background: "#EEF2FF", color: "#4F46E5", fontWeight: 600, cursor: "pointer", fontSize: 11 }}>Detail</button>
                    <button onClick={() => setEditing(t)} style={{ padding: "5px 11px", borderRadius: 7, border: "1.5px solid #E2E8F0", background: "#F8FAFC", color: "#475569", fontWeight: 600, cursor: "pointer", fontSize: 11 }}>Edit</button>
                    <button onClick={() => removeTeacher(t.id)} style={{ padding: "5px 9px", borderRadius: 7, border: "1.5px solid #FECACA", background: "#FEF2F2", color: "#B91C1C", fontWeight: 600, cursor: "pointer", fontSize: 11 }}>×</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: "24px", textAlign: "center", color: "#94A3B8", fontSize: 13, fontWeight: 600 }}>Tidak ada data teacher untuk kriteria ini.</div>
        )}
      </div>

      {drill && (
        <DrillDown teacher={drill.teacher} score={drill.score} onClose={() => setDrill(null)} 
          onDisqualify={(id, reason) => {
            updateTeacher({ ...drill.teacher, isDisqualified: true, disqualifiedReason: reason, disqualifiedAt: new Date().toISOString() });
            setDrill(null);
          }}
          gToken={gToken} setGToken={setGToken}
        />
      )}
      {editing && <EditModal teacher={editing} onSave={updateTeacher} onClose={() => setEditing(null)} />}

    </div>
  );
}

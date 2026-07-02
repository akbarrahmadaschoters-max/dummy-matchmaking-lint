import { useState, useMemo, useRef } from "react";
import Papa from "papaparse";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { INITIAL_TEACHERS, calcScore, getStatus, STATUS_CONFIG, scoreColor } from "./scoring.js";
import { StatusBadge, ScoreBar } from "./components.jsx";
import { useGoogleLogin } from "@react-oauth/google";
import { db } from "./firebase.js";
import { doc, setDoc, deleteDoc, writeBatch, collection } from "firebase/firestore";
import { importTeachers, deleteAllTeachers } from "./teacherService.js";

// ─── Dashboard-specific sub-components ─────────────────────────
function MetricCard({ statusKey, count, total, onClick, active }) {
  const c = STATUS_CONFIG[statusKey];
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div onClick={onClick} style={{
      background: active ? c.bg : "#FFFFFF",
      border: `1.5px solid ${active ? c.border : "#E2E8F0"}`,
      borderRadius: 14, padding: "18px 22px", cursor: "pointer",
      transition: "all 0.18s", flex: 1, minWidth: 120,
      boxShadow: active ? `0 0 0 3px ${c.border}` : "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: c.text, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
        {c.label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>{count}</div>
      <div style={{ fontSize: 13, color: "#64748B", marginTop: 6, fontWeight: 500 }}>
        {pct}% of pool
      </div>
    </div>
  );
}

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

      console.log("Token before fetch:", token);

      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          summary: `Inspeksi Class — ${teacher.name}`,
          description: `Jadwal inspeksi untuk ${teacher.name} · Program: ${teacher.program} · Triggered dari LINT Matchmaking Dashboard`,
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
    onSuccess: (tokenResponse) => {
      setGToken(tokenResponse.access_token);
      createEvent(tokenResponse.access_token);
    },
    onError: () => setCalMsg({ type: "error", text: "❌ Google Login dibatalkan atau gagal" })
  });

  const handleTrigger = () => {
    if (gToken) {
      createEvent(gToken);
    } else {
      login();
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#FFFFFF", borderRadius: 20, width: "100%", maxWidth: 520,
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)", overflow: "hidden",
      }}>
        <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>{teacher.name}</div>
              <div style={{ fontSize: 13, color: "#64748B", marginTop: 3 }}>
                {teacher.program} · {teacher.identifier} · Availability: {teacher.availability}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <StatusBadge status={status} />
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0F172A" }}>
                {score.final}<span style={{ fontSize: 14, fontWeight: 500, color: "#94A3B8" }}>/100</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "20px 28px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
            Score Breakdown
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {Object.values(breakdown).map(b => (
                <div key={b.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>
                      {b.label}
                      {b.label === "Class Inspection" && b.val === null && (
                        <span style={{ marginLeft: 8, fontSize: 11, background: "#FEF3C7", color: "#92400E", borderRadius: 6, padding: "1px 7px", fontWeight: 600 }}>Belum Diinspeksi</span>
                      )}
                      {b.label === "Compliance" && b.val !== null && b.val < 100 && (
                        <span style={{ marginLeft: 8, fontSize: 11, color: "#B91C1C", fontWeight: 600 }}>
                          (100 {(() => {
                            let diff = 100 - b.val;
                            let parts = [];
                            if (diff >= 20) { parts.push("− 20"); diff -= 20; }
                            while (diff >= 8) { parts.push("− 8"); diff -= 8; }
                            while (diff >= 3) { parts.push("− 3"); diff -= 3; }
                            if (diff > 0) parts.push(`− ${diff}`);
                            return parts.join(" ") + ` = ${b.val}`;
                          })()})
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>
                      {b.val !== null ? `${b.val} × ${Math.round(b.weight * 100)}%` : "—"}
                      <span style={{ marginLeft: 8, color: "#6366F1", fontWeight: 600 }}>= {b.contrib.toFixed(1)}</span>
                    </div>
                  </div>
                  {b.val !== null ? (
                    <ScoreBar val={b.val} color="#6366F1" />
                  ) : (
                    <div style={{ height: 6, background: "#F1F5F9", borderRadius: 99 }} />
                  )}
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
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tanggal Inspeksi</label>
                <input type="date" value={inspDate} min={minDate} onChange={e => setInspDate(e.target.value)} disabled={isScheduled} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: isScheduled ? "#F8FAFC" : "#FFF", color: isScheduled ? "#94A3B8" : "#0F172A", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Jam Mulai</label>
                <input type="time" value={inspTime} step="1800" onChange={e => setInspTime(e.target.value)} disabled={isScheduled} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: isScheduled ? "#F8FAFC" : "#FFF", color: isScheduled ? "#94A3B8" : "#0F172A", boxSizing: "border-box" }} />
              </div>
            </div>
            <button onClick={handleTrigger} disabled={loadingCal || isScheduled} style={{
              width: "100%", background: isScheduled ? "#F0FDF4" : "#FEF3C7", color: isScheduled ? "#16A34A" : "#92400E", border: `1px solid ${isScheduled ? "#BBF7D0" : "#FDE68A"}`,
              borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600, cursor: (loadingCal || isScheduled) ? "not-allowed" : "pointer", transition: "all 0.2s"
            }}>
              {loadingCal ? "⏳ Membuat Jadwal..." : isScheduled ? "✅ Inspeksi Dijadwalkan" : "📋 Trigger Jadwal Inspeksi"}
            </button>
            {calMsg && (
              <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: calMsg.type === "success" ? "#F0FDF4" : "#FEF2F2", color: calMsg.type === "success" ? "#16A34A" : "#DC2626", border: `1px solid ${calMsg.type === "success" ? "#BBF7D0" : "#FECACA"}` }}>
                {calMsg.text}
              </div>
            )}
          </div>
        )}

        <div style={{ padding: "0 28px 24px", display: "flex", gap: 12 }}>
          <button onClick={() => setShowDisq(true)} style={{
            flex: 1, background: "#FEF2F2", border: "1px solid #FECACA",
            borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600, color: "#B91C1C", cursor: "pointer",
          }}>
            ⛔ Disqualify Teacher
          </button>
          <button onClick={onClose} style={{
            flex: 1, background: "#F8FAFC", border: "1px solid #E2E8F0",
            borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer",
          }}>
            Tutup
          </button>
        </div>

        {showDisq && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.95)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(4px)" }}>
            <div style={{ width: "100%", background: "#FFF", borderRadius: 16, border: "1px solid #E2E8F0", padding: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#0F172A" }}>Konfirmasi Disqualify</h3>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748B" }}>Pilih alasan mendiskualifikasi <b>{teacher.name}</b>:</p>
              <select value={reason} onChange={e => setReason(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #E2E8F0", marginBottom: 20 }}>
                <option>Time Availability</option>
                <option>QC</option>
                <option>Compliance</option>
                <option>Force Majeur</option>
                <option>Ganti Tutor 3x+</option>
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
    { key: "qc",          label: "QC Score (0–100)",         type: "number", min: 0, max: 100 },
    { key: "nps",         label: "NPS Tutor (0–100)",        type: "number", min: 0, max: 100 },
    { key: "inspection",  label: "Class Inspection (0–100)", type: "number", min: 0, max: 100 },
    { key: "compliance",  label: "Compliance (0–100)",       type: "number", min: 0, max: 100 },
    { key: "gantiTutor",  label: "Ganti Tutor Count",        type: "number", min: 0, max: 10  },
    { key: "identifier",  label: "Identifier Tutor",         type: "select", opts: ["Baru", "Lama"] },
    { key: "availability",label: "Tingkat Availability",     type: "select", opts: ["High", "Medium", "Moderate"] },
  ];

  const inputStyle = {
    width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0",
    borderRadius: 9, fontSize: 13, color: "#0F172A", outline: "none",
    background: "#F8FAFC", boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#FFF", borderRadius: 20, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", overflow: "hidden" }}>
        <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>Edit Teacher</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#94A3B8" }}>×</button>
        </div>
        <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14, maxHeight: "60vh", overflowY: "auto" }}>
          {fields.map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 5 }}>{f.label}</label>
              {f.type === "select" ? (
                <select value={form[f.key]} onChange={e => set(f.key, e.target.value)} style={inputStyle}>
                  {f.opts.map(o => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input type={f.type} value={form[f.key]} min={f.min} max={f.max}
                  onChange={e => set(f.key, f.type === "number" ? +e.target.value : e.target.value)}
                  style={inputStyle} />
              )}
            </div>
          ))}
          <div style={{ display: "flex", gap: 12 }}>
            {[{ k: "hasInspection", l: "Punya Inspection Data" }].map(({ k, l }) => (
              <label key={k} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#374151", cursor: "pointer" }}>
                <input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)} style={{ width: 15, height: 15 }} />
                {l}
              </label>
            ))}
          </div>
        </div>
        <div style={{ padding: "16px 28px 22px", display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#F8FAFC", color: "#475569", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Batal</button>
          <button onClick={() => { onSave(form); onClose(); }} style={{ flex: 2, padding: "10px 0", borderRadius: 10, border: "none", background: "#6366F1", color: "#FFF", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Simpan Perubahan</button>
        </div>
      </div>
    </div>
  );
}

function AddTeacherModal({ onSave, onClose }) {
  const blank = { id: Date.now(), name: "", program: "IELTS", qc: 80, nps: 75, inspection: 70, compliance: 85, gantiTutor: 0, hasInspection: true, identifier: "Baru", availability: "Moderate", availabilitySlots: [] };
  return <EditModal teacher={blank} onSave={onSave} onClose={onClose} />;
}

function ProgramHealthCard({ programName, scoredTeachers }) {
  const programTeachers = scoredTeachers.filter(t => t.program === programName);
  
  const c = { "Top Performer": 0, Eligible: 0, Watch: 0, "Perlu Review": 0 };
  programTeachers.forEach(t => {
    if (!t.isDisqualified && c[t.status] !== undefined) {
      c[t.status]++;
    }
  });

  const activeCount = Object.values(c).reduce((a, b) => a + b, 0);

  const dData = [
    { name: "Top Performer", value: c["Top Performer"], color: STATUS_CONFIG["Top Performer"].dot, status: "Top Performer" },
    { name: "Eligible",      value: c["Eligible"],      color: STATUS_CONFIG["Eligible"].dot, status: "Eligible" },
    { name: "Watch",         value: c["Watch"],         color: STATUS_CONFIG["Watch"].dot, status: "Watch" },
    { name: "Perlu Review",  value: c["Perlu Review"],  color: STATUS_CONFIG["Perlu Review"].dot, status: "Perlu Review" },
  ].filter(d => d.value > 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pct = activeCount > 0 ? Math.round((data.value / activeCount) * 100) : 0;
      return (
        <div style={{ background: "#FFF", border: "1px solid #E2E8F0", padding: "12px 16px", borderRadius: 12, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: data.color }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{STATUS_CONFIG[data.status].label}</span>
          </div>
          <div style={{ fontSize: 13, color: "#475569" }}>
            <span style={{ fontWeight: 600, color: "#0F172A" }}>{data.value}</span> teachers ({pct}%)
          </div>
        </div>
      );
    }
    return null;
  };

  const top5 = programTeachers
    .filter(t => !t.isDisqualified)
    .sort((a, b) => b.score.final - a.score.final)
    .slice(0, 5);

  return (
    <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A" }}>Pool Health &mdash; {programName}</div>
      
      {programTeachers.length === 0 ? (
        <div style={{ flex: 1, padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#94A3B8", background: "#F8FAFC", borderRadius: 12, border: "2px dashed #E2E8F0" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#64748B" }}>Belum ada data teacher untuk program ini</div>
          <div style={{ fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>Import CSV atau tambah teacher untuk program ini agar muncul di sini</div>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dData} innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                    {dData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", textAlign: "center", pointerEvents: "none" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>{activeCount}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>Teachers</div>
              </div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {["Top Performer", "Eligible", "Watch", "Perlu Review"].map(s => {
                const val = c[s];
                const pct = activeCount > 0 ? Math.round((val / activeCount) * 100) : 0;
                return (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS_CONFIG[s].dot, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>{s}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>{val} <span style={{ color: "#94A3B8", fontWeight: 500, fontSize: 11 }}>({pct}%)</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Top 5 Spotlight</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {top5.map((t, idx) => (
                <div key={t.id} onClick={() => document.getElementById(`row-${t.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                     style={{ 
                       background: idx === 0 ? "linear-gradient(to right, #EEF2FF, #FFF)" : "#FFF",
                       border: idx === 0 ? "1.5px solid #C7D2FE" : "1px solid #E2E8F0", 
                       borderRadius: 12, padding: "12px 16px", cursor: "pointer",
                       display: "flex", alignItems: "center", gap: 12, transition: "transform 0.15s",
                       boxShadow: idx === 0 ? "0 4px 12px rgba(79,70,229,0.06)" : "none"
                     }}
                     onMouseEnter={e => e.currentTarget.style.transform = "translateX(4px)"}
                     onMouseLeave={e => e.currentTarget.style.transform = "translateX(0)"}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: idx === 0 ? "#4F46E5" : "#94A3B8", width: 24, textAlign: "center" }}>
                    #{idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: 6 }}>
                      {t.name}
                      {idx === 0 && <span style={{ fontSize: 12 }}>👑</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: scoreColor(t.score.final), lineHeight: 1 }}>{t.score.final}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────
export default function DashboardPage({ teachers, setTeachers }) {
  const [filterProgram, setFilterProgram] = useState("All");
  const [filterStatus, setFilterStatus]   = useState("All");
  const [filterReason, setFilterReason]   = useState("Semua");
  const [filterAvail, setFilterAvail]     = useState("All");
  const [search, setSearch]           = useState("");
  const [drill, setDrill]             = useState(null);
  const [editing, setEditing]         = useState(null);
  const [adding, setAdding]           = useState(false);
  const [activeMetric, setActiveMetric]   = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [gToken, setGToken] = useState(null);
  const fileInputRef = useRef(null);
  
  const [matchMode, setMatchMode]         = useState(false);
  const [matchProgram, setMatchProgram]   = useState("IELTS");
  const [matchSlot, setMatchSlot]         = useState("Senin 19:00");

  const downloadTemplate = () => {
    const header = "No,Tier,Nama Tutor,Skor QC,Skor NPS,Jumlah Detractors,Jumlah Passives,Jumlah Promoters,Compliance,Ganti Tutor,Program\n";
    const blob = new Blob([header], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Template_Import_Teacher.csv";
    link.click();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data;
        const ready = [];
        const errors = [];
        parsed.forEach((row, idx) => {
          try {
            const p = String(row["Program"] || "").trim();
            const name = String(row["Nama Tutor"] || "").trim();
            if (!p || !name) throw new Error("Program atau Nama Tutor kosong");
            
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

            ready.push({
              id: (Date.now() + idx).toString(),
              name,
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
            errors.push(`Baris ${idx + 2}: ${err.message}`);
          }
        });
        setImportPreview({ ready, errors });
      }
    });
    e.target.value = null;
  };

  const scored = useMemo(() =>
    teachers.map(t => {
      const score = calcScore(t);
      return { ...t, score, status: getStatus(score, t) };
    }).sort((a, b) => b.score.final - a.score.final),
    [teachers]
  );

  const filtered = useMemo(() => scored.filter(t => {
    if (t.identifier === "Baru") return false;
    if (t.isDisqualified) return activeMetric === "Disqualified";
    if (matchMode) {
      if (t.program !== matchProgram) return false;
      if (!t.availabilitySlots?.includes(matchSlot)) return false;
      return true;
    }
    if (filterProgram !== "All" && t.program !== filterProgram) return false;
    const fs = activeMetric || filterStatus;
    if (fs !== "All" && t.status !== fs) return false;
    if (filterAvail !== "All" && t.availability !== filterAvail) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [scored, matchMode, matchProgram, matchSlot, filterProgram, filterStatus, filterAvail, search, activeMetric]);

  const counts = useMemo(() => {
    const c = { "Top Performer": 0, Eligible: 0, Watch: 0, "Perlu Review": 0, Disqualified: 0 };
    scored.forEach(t => {
      if (t.isDisqualified) {
        c["Disqualified"]++;
      } else if (c[t.status] !== undefined) {
        c[t.status]++;
      }
    });
    return c;
  }, [scored]);

  const updateTeacher = async (updated) => {
    try {
      await setDoc(doc(db, "teachers", updated.id.toString()), updated, { merge: true });
    } catch (e) {
      console.error("Error updating teacher:", e);
      alert("Gagal update: " + e.message);
    }
  };

  const addTeacher = async (t) => {
    try {
      const id = Date.now().toString();
      await setDoc(doc(db, "teachers", id), { ...t, id });
    } catch (e) {
      console.error("Error adding teacher:", e);
      alert("Gagal menambah: " + e.message);
    }
  };

  const removeTeacher = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data teacher ini?")) return;
    
    // Optimistic update agar UI langsung merespons
    setTeachers(prev => prev.filter(t => t.id !== id));
    
    try {
      await deleteDoc(doc(db, "teachers", id.toString()));
    } catch (e) {
      console.error("Error removing teacher:", e);
      alert("Gagal menghapus: " + e.message);
    }
  };

  const handleResetData = async () => {
    if (!window.confirm("PERINGATAN: Anda yakin ingin MENGHAPUS SEMUA DATA teacher di seluruh aplikasi? Tindakan ini tidak dapat dibatalkan!")) return;
    
    setIsResetting(true);
    setTeachers([]); // Optimistic clear
    try {
      await deleteAllTeachers();
      alert("✅ Semua data berhasil dihapus / diperbarui.");
    } catch (e) {
      console.error("Gagal menghapus data:", e);
      alert("❌ Gagal mereset data: " + e.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div>
        {/* Page Title */}
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0 }}>Teacher Pool Overview</h1>
            <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>Ranked list · Weighted scoring engine · Real-time flags</p>
            <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: "#4F46E5", background: "#EEF2FF", padding: "3px 8px", borderRadius: 6, display: "inline-block" }}>
              Data per {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button disabled={isResetting} onClick={handleResetData} style={{
              background: "#FEF2F2", color: "#EF4444", border: "1.5px solid #FECACA", borderRadius: 10,
              padding: "11px 16px", fontSize: 13, fontWeight: 700, cursor: isResetting ? "not-allowed" : "pointer", transition: "all 0.15s", opacity: isResetting ? 0.6 : 1
            }}>{isResetting ? "Memproses..." : "Perbarui Data"}</button>
            <button onClick={downloadTemplate} style={{
              background: "#F1F5F9", color: "#475569", border: "1.5px solid #E2E8F0", borderRadius: 10,
              padding: "11px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
            }}>Download Template CSV</button>
            
            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} style={{ display: "none" }} />
            <button onClick={() => fileInputRef.current?.click()} style={{
              background: "#10B981", color: "#FFF", border: "none", borderRadius: 10,
              padding: "11px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
            }}>Import CSV</button>

            <button onClick={() => setAdding(true)} style={{
              background: "#6366F1", color: "#FFF", border: "none", borderRadius: 10,
              padding: "11px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
              boxShadow: "0 4px 12px rgba(99,102,241,0.25)"
            }}>+ Tambah Teacher</button>
          </div>
        </div>

        {/* Metric Cards */}
        <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
          {["Top Performer", "Eligible", "Watch", "Perlu Review", "Disqualified"].map(s => (
            <MetricCard key={s} statusKey={s} count={counts[s]} total={teachers.length}
              active={activeMetric === s}
              onClick={() => setActiveMetric(activeMetric === s ? null : s)} />
          ))}
        </div>

        {/* Pool Health & Spotlight (Split by Program) */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24 }}>
            <ProgramHealthCard programName="Lingua" scoredTeachers={scored} />
            <ProgramHealthCard programName="Intertest" scoredTeachers={scored} />
          </div>
        </div>

        {/* Match Mode Panel */}
        <div style={{ background: "linear-gradient(135deg,#EEF2FF,#F5F3FF)", border: "1.5px solid #C7D2FE", borderRadius: 16, padding: "20px 24px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 22 }}>🎯</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#3730A3" }}>Match Mode</div>
              <div style={{ fontSize: 13, color: "#6366F1", marginTop: 2 }}>Masukkan kebutuhan student untuk mencari teacher terbaik yang available</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4F46E5", display: "block", marginBottom: 6 }}>Program</label>
              <select value={matchProgram} onChange={e => setMatchProgram(e.target.value)} disabled={matchMode} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #C7D2FE", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF" }}>
                <option>IELTS</option>
                <option>SAT</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4F46E5", display: "block", marginBottom: 6 }}>Slot Waktu</label>
              <select value={matchSlot} onChange={e => setMatchSlot(e.target.value)} disabled={matchMode} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #C7D2FE", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF" }}>
                <option>Senin 19:00</option>
                <option>Selasa 19:00</option>
                <option>Rabu 19:00</option>
                <option>Kamis 16:00</option>
                <option>Jumat 16:00</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {!matchMode ? (
                <button onClick={() => setMatchMode(true)} style={{ padding: "11px 24px", background: "#4F46E5", color: "#FFF", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cari Match</button>
              ) : (
                <button onClick={() => { setMatchMode(false); setFilterProgram("All"); setFilterStatus("All"); setFilterAvail(false); setSearch(""); setActiveMetric(null); }} style={{ padding: "11px 24px", background: "#FFF", color: "#B91C1C", border: "1.5px solid #FECACA", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Reset Pool</button>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        {!matchMode && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama teacher..."
              style={{ width: "100%", padding: "9px 12px 9px 36px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF", boxSizing: "border-box" }} />
            <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: 15 }}>🔍</span>
          </div>
          {["All", "IELTS", "SAT"].map(p => (
            <button key={p} onClick={() => setFilterProgram(p)} style={{
              padding: "8px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: filterProgram === p ? "1.5px solid #6366F1" : "1.5px solid #E2E8F0",
              background: filterProgram === p ? "#EEF2FF" : "#FFF",
              color: filterProgram === p ? "#4F46E5" : "#64748B",
            }}>{p === "All" ? "Semua Program" : p}</button>
          ))}
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setFilterReason("Semua"); }}
                  style={{ padding: "10px 14px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF", minWidth: 140 }}>
            <option value="All">Semua Status</option>
            <option value="Top Performer">Top Performer</option>
            <option value="Eligible">Eligible</option>
            <option value="Watch">Watch</option>
            <option value="Perlu Review">Perlu Review</option>
          </select>
          <select value={filterAvail} onChange={e => setFilterAvail(e.target.value)}
                  style={{ padding: "10px 14px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF", minWidth: 160 }}>
            <option value="All">Semua Availability</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Moderate">Moderate</option>
            <option value="Low">Low</option>
          </select>
        </div>
        )}

        {/* Table */}
        <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}>
                {["Rank", "Nama Teacher", "Program", "Availability", "QC", "NPS", "Inspection", "Compliance", "Penalty", "Final Score", "Status", ""].map(h => (
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
        </div>

        <div style={{ marginTop: 16, fontSize: 12, color: "#94A3B8", textAlign: "right" }}>
          Menampilkan {filtered.length} dari {teachers.length} teacher · Klik metric card untuk filter cepat · Klik Detail untuk breakdown score
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
      {adding && <AddTeacherModal onSave={addTeacher} onClose={() => setAdding(false)} />}
      
      {importPreview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#FFF", borderRadius: 20, width: "100%", maxWidth: 500, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 18, color: "#0F172A" }}>Preview Import CSV</h2>
            <div style={{ background: "#F1F5F9", padding: 16, borderRadius: 12, marginBottom: 16 }}>
              <div style={{ color: "#16A34A", fontWeight: 700, marginBottom: 8 }}>✅ {importPreview.ready.length} Teacher siap di-import</div>
              {importPreview.errors.length > 0 && (
                <div style={{ color: "#DC2626", fontWeight: 600, fontSize: 13, marginTop: 8 }}>
                  ❌ {importPreview.errors.length} Baris gagal diproses (error/kosong)
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setImportPreview(null)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#F8FAFC", color: "#475569", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Batal</button>
              <button disabled={importPreview.ready.length === 0 || isImporting} onClick={async () => {
                setIsImporting(true);
                try {
                  await importTeachers(importPreview.ready);
                  alert(`✅ ${importPreview.ready.length} teacher berhasil diimpor ke Firestore!`);
                  setImportPreview(null);
                } catch (e) {
                  console.error("Import error", e);
                  alert("❌ Import gagal: " + e.message);
                } finally {
                  setIsImporting(false);
                }
              }} style={{ flex: 1, padding: "10px 0", borderRadius: 10, background: "linear-gradient(135deg,#6366F1,#4F46E5)", color: "#FFF", fontWeight: 700, cursor: isImporting ? "not-allowed" : "pointer", opacity: importPreview.ready.length === 0 || isImporting ? 0.5 : 1, border: "none" }}>
                {isImporting ? "Mengimpor..." : "Simpan ke Database"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

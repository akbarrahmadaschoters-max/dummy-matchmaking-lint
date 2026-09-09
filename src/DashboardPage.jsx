import { useState, useMemo, useRef, useEffect } from "react";
import Papa from "papaparse";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from "recharts";
import { INITIAL_TEACHERS, calcScore, getStatus, STATUS_CONFIG, scoreColor } from "./scoring.js";
import { StatusBadge, ScoreBar, ExportButtons } from "./components.jsx";
import { exportToExcel, exportToPdf } from "./utils/exportUtils.js";
import { useGoogleLogin } from "@react-oauth/google";
import { db } from "./firebase.js";
import { doc, setDoc, deleteDoc, writeBatch, collection } from "firebase/firestore";
import { importTeachers, deleteAllTeachers } from "./teacherService.js";
import targaryenPassword from "../env/HouseofTargareyan?raw";

// ─── Animated Active Slice Render Shape ─────────────────────────
const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 7}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: "drop-shadow(0px 6px 12px rgba(0,0,0,0.18))", transition: "all 0.3s ease" }}
      />
    </g>
  );
};

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

function ProgramHealthCard({ programName, scoredTeachers, activeProgram, activeMetric, onSelectFilter }) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const programTeachers = scoredTeachers.filter(t => t.program === programName);
  
  const c = { "Top Performer": 0, Eligible: 0, Watch: 0, "Perlu Review": 0 };
  programTeachers.forEach(t => {
    if (!t.isDisqualified && c[t.status] !== undefined) {
      c[t.status]++;
    }
  });

  const activeCount = Object.values(c).reduce((a, b) => a + b, 0);

  const dData = [
    { name: "Top Performer", value: c["Top Performer"], color: "#22C55E", status: "Top Performer" },
    { name: "Eligible",      value: c["Eligible"],      color: "#3B82F6", status: "Eligible" },
    { name: "Watch",         value: c["Watch"],         color: "#F59E0B", status: "Watch" },
    { name: "Perlu Review",  value: c["Perlu Review"],  color: "#EF4444", status: "Perlu Review" },
  ].filter(d => d.value > 0);

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  const activeSegment = activeIndex >= 0 ? dData[activeIndex] : null;
  const displayVal = activeSegment ? activeSegment.value : activeCount;
  const displayLabel = activeSegment ? STATUS_CONFIG[activeSegment.status].label : "Total Active";
  const displayPct = activeSegment && activeCount > 0 ? Math.round((activeSegment.value / activeCount) * 100) : 100;

  return (
    <div style={{
      background: "#FFFFFF",
      border: "1.5px solid #E2E8F0",
      borderRadius: 20,
      padding: "24px",
      flex: 1,
      minWidth: 340,
      boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
      transition: "all 0.2s ease"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#4F46E5", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {programName} Program Health
          </div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
            Distribusi performa {activeCount} tutor {programName} · Klik untuk filter
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, background: "#EEF2FF", color: "#4F46E5", padding: "4px 12px", borderRadius: 100 }}>
          {activeCount} Tutor
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        {/* Animated Donut Chart with SVG Center Text */}
        <div style={{ width: 160, height: 160, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <PieChart width={160} height={160}>
            <Pie
              cx="50%"
              cy="50%"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={dData}
              dataKey="value"
              innerRadius={50}
              outerRadius={68}
              paddingAngle={4}
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {dData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                  onClick={() => {
                    if (onSelectFilter) onSelectFilter(programName, entry.status);
                  }}
                  style={{
                    cursor: "pointer",
                    outline: "none",
                    opacity: activeIndex === -1 || activeIndex === index ? 1 : 0.4,
                    transition: "opacity 0.2s ease"
                  }} 
                />
              ))}
            </Pie>
            <text 
              x="50%" 
              y={activeSegment ? "42%" : "46%"} 
              textAnchor="middle" 
              dominantBaseline="middle" 
              fill="#0F172A" 
              style={{ fontSize: "22px", fontWeight: 900, cursor: "pointer", userSelect: "none" }}
              onClick={() => { if (onSelectFilter) onSelectFilter(programName, "All"); }}
            >
              {displayVal}
            </text>
            <text 
              x="50%" 
              y={activeSegment ? "57%" : "59%"} 
              textAnchor="middle" 
              dominantBaseline="middle" 
              fill={activeSegment ? activeSegment.color : "#64748B"} 
              style={{ fontSize: "10px", fontWeight: 800, cursor: "pointer", userSelect: "none" }}
              onClick={() => { if (onSelectFilter) onSelectFilter(programName, "All"); }}
            >
              {displayLabel}
            </text>
            {activeSegment && (
              <text 
                x="50%" 
                y="69%" 
                textAnchor="middle" 
                dominantBaseline="middle" 
                fill="#94A3B8" 
                style={{ fontSize: "9px", fontWeight: 700, cursor: "pointer", userSelect: "none" }}
                onClick={() => { if (onSelectFilter) onSelectFilter(programName, "All"); }}
              >
                ({displayPct}%)
              </text>
            )}
          </PieChart>
        </div>

        {/* Dynamic Interactive Cards Grid */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {["Top Performer", "Eligible", "Watch", "Perlu Review"].map((statusKey) => {
            const count = c[statusKey];
            const cfg = STATUS_CONFIG[statusKey];
            const pct = activeCount > 0 ? Math.round((count / activeCount) * 100) : 0;
            const dataIndex = dData.findIndex(d => d.status === statusKey);
            const isHovered = activeIndex === dataIndex && dataIndex !== -1;
            const isSelected = activeProgram === programName && activeMetric === statusKey;

            return (
              <div 
                key={statusKey} 
                onMouseEnter={() => { if (dataIndex !== -1) setActiveIndex(dataIndex); }}
                onMouseLeave={() => setActiveIndex(-1)}
                onClick={() => {
                  if (onSelectFilter) onSelectFilter(programName, statusKey);
                }}
                style={{ 
                  background: isSelected ? cfg.bg : isHovered ? cfg.bg : "#F8FAFC", 
                  border: `1.5px solid ${isSelected || isHovered ? cfg.border : "#E2E8F0"}`, 
                  borderRadius: 12, 
                  padding: "10px 14px",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: isHovered || isSelected ? "translateY(-2px)" : "none",
                  boxShadow: isSelected ? `0 0 0 3px ${cfg.border}` : isHovered ? `0 6px 16px ${cfg.border}` : "none"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: cfg.text }}>{statusKey}</span>
                  </div>
                  <span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600 }}>{pct}%</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", marginTop: 4 }}>{count}</div>
              </div>
            );
          })}
        </div>
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
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      backdropFilter: "blur(4px)"
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#FFFFFF", borderRadius: 20, width: "100%", maxWidth: 560,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "90vh",
        display: "flex", flexDirection: "column"
      }}>
        <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#0F172A" }}>{teacher.name}</span>
              <StatusBadge status={status} />
            </div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
              Program: <strong>{teacher.program}</strong> &nbsp;·&nbsp;
              Availability: <strong style={{ color: teacher.availability === "Very High" ? "#10B981" : teacher.availability === "High" ? "#3B82F6" : teacher.availability === "Moderate" ? "#F59E0B" : "#EF4444" }}>{teacher.availability}</strong>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", borderRadius: "50%", width: 32, height: 32, fontSize: 18, color: "#64748B", cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, #F8FAFC, #EEF2FF)", padding: "16px 20px", borderRadius: 14, border: "1px solid #E0E7FF" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Final Score</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: scoreColor(score.final), lineHeight: 1, marginTop: 4 }}>{score.final}<span style={{ fontSize: 18, color: "#94A3B8" }}>/100</span></div>
            </div>
            {penalty > 0 && (
              <div style={{ textAlign: "right", background: "#FEF2F2", padding: "8px 14px", borderRadius: 10, border: "1px solid #FECACA" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#B91C1C" }}>Penalty Applied</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#EF4444" }}>−{penalty} Poin</div>
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Score Breakdown</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(breakdown).map(([k, item]) => {
                if (!item) return null;
                const isIns = k === "inspection";
                const isMissing = item.val === null;
                return (
                  <div key={k} style={{ background: "#F8FAFC", padding: "12px 16px", borderRadius: 12, border: "1px solid #E2E8F0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: "#0F172A", marginBottom: 6 }}>
                      <span>{item.label}</span>
                      <span>
                        {isMissing ? (
                          <span style={{ fontSize: 11, background: "#FEF3C7", color: "#92400E", padding: "2px 8px", borderRadius: 6 }}>Belum Ada Data</span>
                        ) : (
                          `${item.val} × Math.round(${item.weight * 100}%) = +${item.contrib.toFixed(1)}`
                        )}
                      </span>
                    </div>
                    {!isMissing && <ScoreBar val={item.val} color={k === "qc" ? "#6366F1" : k === "nps" ? "#8B5CF6" : k === "inspection" ? "#06B6D4" : "#10B981"} />}
                  </div>
                );
              })}
            </div>
          </div>

          {!teacher.hasInspection && (
            <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E", marginBottom: 4 }}>📅 Trigger Jadwal Inspeksi Kelas</div>
              <div style={{ fontSize: 12, color: "#B45309", marginBottom: 12 }}>Tutor ini belum memiliki nilai Class Inspection. Jadwalkan inspeksi via Google Calendar:</div>

              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#B45309", marginBottom: 4 }}>TANGGAL INSPEKSI</label>
                  <input type="date" min={minDate} value={inspDate} onChange={e => setInspDate(e.target.value)} style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #FCD34D", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#B45309", marginBottom: 4 }}>JAM MULAI</label>
                  <input type="time" value={inspTime} onChange={e => setInspTime(e.target.value)} style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #FCD34D", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              {calMsg && (
                <div style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 10, background: calMsg.type === "success" ? "#DCFCE7" : "#FEF2F2", color: calMsg.type === "success" ? "#15803D" : "#B91C1C" }}>
                  {calMsg.text}
                </div>
              )}

              <button disabled={loadingCal || isScheduled} onClick={handleTrigger} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: isScheduled ? "#10B981" : "linear-gradient(135deg, #F59E0B, #D97706)", color: "#FFF", fontWeight: 700, fontSize: 13, cursor: isScheduled ? "default" : "pointer" }}>
                {loadingCal ? "⏳ Membuat Event..." : isScheduled ? "✔ Inspeksi Terjadwal" : "📅 Trigger Jadwal Inspeksi"}
              </button>
            </div>
          )}

          <div style={{ paddingTop: 10, borderTop: "1px solid #F1F5F9" }}>
            {!showDisq ? (
              <button onClick={() => setShowDisq(true)} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1.5px solid #FECACA", background: "#FEF2F2", color: "#DC2626", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                ⛔ Disqualify Teacher
              </button>
            ) : (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#991B1B", marginBottom: 8 }}>Pilih Alasan Diskualifikasi:</div>
                <select value={reason} onChange={e => setReason(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #FCA5A5", fontSize: 13, marginBottom: 12, outline: "none" }}>
                  <option value="Time Availability">Time Availability</option>
                  <option value="QC">QC Score Terlalu Rendah</option>
                  <option value="Compliance">Pelanggaran Compliance</option>
                  <option value="Force Majeur">Force Majeur</option>
                  <option value="Ganti Tutor 3x+">Ganti Tutor 3x+</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setShowDisq(false)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFF", color: "#475569", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Batal</button>
                  <button onClick={() => onDisqualify(teacher.id, reason)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "#DC2626", color: "#FFF", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Konfirmasi Disqualify</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "16px 28px", background: "#F8FAFC", borderTop: "1px solid #F1F5F9", textAlign: "right" }}>
          <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 10, border: "1px solid #CBD5E1", background: "#FFF", color: "#475569", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Tutup</button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ teacher, onSave, onClose }) {
  const [form, setForm] = useState({ ...teacher });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fields = [
    { key: "name",        label: "Nama Teacher",             type: "text"   },
    { key: "program",     label: "Program",                  type: "select", opts: ["Lingua", "Intertest"] },
    { key: "qc",          label: "QC Score (0–100)",         type: "number", min: 0, max: 100 },
    { key: "nps",         label: "NPS Tutor (0–100)",        type: "number", min: 0, max: 100 },
    { key: "inspection",  label: "Class Inspection (0–100)", type: "number", min: 0, max: 100 },
    { key: "compliance",  label: "Compliance (0–100)",       type: "number", min: 0, max: 100 },
    { key: "gantiTutor",  label: "Ganti Tutor Count",        type: "number", min: 0, max: 10  },
    { key: "identifier",  label: "Identifier Tutor",         type: "select", opts: ["Baru", "Lama"] },
    { key: "availability",label: "Tingkat Availability",     type: "select", opts: ["Very High", "High", "Moderate", "Low", "Very Low"] },
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
  const blank = { id: Date.now(), name: "", program: "Lingua", qc: 80, nps: 75, inspection: 70, compliance: 85, gantiTutor: 0, hasInspection: true, identifier: "Baru", availability: "Moderate", availabilitySlots: [] };
  return <EditModal teacher={blank} onSave={onSave} onClose={onClose} />;
}

function PaginationBar({ currentPage, totalPages, totalItems, onPageChange, label }) {
  if (totalItems === 0) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, flexWrap: "wrap", gap: 12, padding: "12px 18px", background: "#FFF", borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
      <div style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>
        Menampilkan <strong>{Math.min((currentPage - 1) * 50 + 1, totalItems)}</strong> - <strong>{Math.min(currentPage * 50, totalItems)}</strong> dari <strong>{totalItems}</strong> {label} (50 tutor per halaman)
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button 
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          style={{
            padding: "6px 14px", borderRadius: 8, border: "1.5px solid #E2E8F0",
            background: currentPage === 1 ? "#F8FAFC" : "#FFF",
            color: currentPage === 1 ? "#CBD5E1" : "#475569",
            fontWeight: 700, fontSize: 12, cursor: currentPage === 1 ? "not-allowed" : "pointer"
          }}
        >
          ◄ Sebelumnya
        </button>

        <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", padding: "0 8px" }}>
          Halaman {currentPage} dari {totalPages}
        </span>

        <button 
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          style={{
            padding: "6px 14px", borderRadius: 8, border: "1.5px solid #E2E8F0",
            background: currentPage >= totalPages ? "#F8FAFC" : "#FFF",
            color: currentPage >= totalPages ? "#CBD5E1" : "#475569",
            fontWeight: 700, fontSize: 12, cursor: currentPage >= totalPages ? "not-allowed" : "pointer"
          }}
        >
          Berikutnya ►
        </button>
      </div>
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

  // Pagination States (50 items per page)
  const [pageMain, setPageMain] = useState(1);
  const [pageOnboarding, setPageOnboarding] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const fileInputRef = useRef(null);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPageMain(1);
  }, [filterProgram, filterStatus, filterAvail, search, activeMetric]);

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

  const scored = useMemo(() => {
    const list = teachers.map(t => {
      const score = calcScore(t);
      return { ...t, score, status: getStatus(score, t) };
    }).sort((a, b) => b.score.final - a.score.final);

    let rankCounter = 1;
    return list.map(t => {
      if (t.identifier !== "Baru" && !t.isDisqualified) {
        return { ...t, rank: rankCounter++ };
      }
      return { ...t, rank: "—" };
    });
  }, [teachers]);

  const filtered = useMemo(() => scored.filter(t => {
    if (t.identifier === "Baru") return false;
    if (t.isDisqualified) return activeMetric === "Disqualified";
    if (filterProgram !== "All" && t.program !== filterProgram) return false;
    const fs = activeMetric || filterStatus;
    if (fs !== "All" && t.status !== fs) return false;
    if (filterAvail !== "All" && t.availability !== filterAvail) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [scored, filterProgram, filterStatus, filterAvail, search, activeMetric]);

  // Paginated Main Pool (50 per page)
  const totalPagesMain = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginatedMain = useMemo(() => {
    const start = (pageMain - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, pageMain]);

  // Paginated Onboarding / Tutor Baru Pool (50 per page)
  const newTeachersAll = useMemo(() => {
    return teachers.filter(t => t.identifier === "Baru" || t.qc === null || t.qc === undefined);
  }, [teachers]);

  const totalPagesOnboarding = Math.ceil(newTeachersAll.length / ITEMS_PER_PAGE) || 1;
  const paginatedOnboarding = useMemo(() => {
    const start = (pageOnboarding - 1) * ITEMS_PER_PAGE;
    return newTeachersAll.slice(start, start + ITEMS_PER_PAGE);
  }, [newTeachersAll, pageOnboarding]);

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
    setTeachers(prev => prev.filter(t => t.id !== id));
    try {
      await deleteDoc(doc(db, "teachers", id.toString()));
    } catch (e) {
      console.error("Error removing teacher:", e);
      alert("Gagal menghapus: " + e.message);
    }
  };

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
      console.error("Gagal menghapus data:", e);
      alert("❌ Gagal mereset data: " + e.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportPDF = () => {
    exportToPdf({
      title: "Dashboard Overview - Matchmaking Scored Teachers",
      subtitle: `Program: ${filterProgram} | Status: ${filterStatus} | Total Data: ${filtered.length}`,
      fileName: `Dashboard_Matchmaking_${filterProgram}_${Date.now()}`,
      columns: [
        { header: "Rank", key: (t) => t.rank || "-" },
        { header: "Nama Teacher", key: "name" },
        { header: "Program", key: "program" },
        { header: "Availability", key: (t) => t.availability || "-" },
        { header: "Status", key: "status" },
        { header: "Final Score", key: (t) => t.score?.final ?? 0 },
        { header: "QC Score", key: (t) => t.score?.qcScore ?? "-" },
        { header: "NPS Score", key: (t) => t.score?.npsScore ?? "-" },
        { header: "Inspection", key: (t) => t.score?.inspectionScore ?? "-" },
        { header: "Compliance", key: (t) => t.score?.complianceScore ?? "-" },
      ],
      data: filtered,
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      fileName: `Dashboard_Matchmaking_${filterProgram}_${Date.now()}`,
      sheetName: "Dashboard Teachers",
      columns: [
        { header: "Rank", key: (t) => t.rank || "-" },
        { header: "Nama Teacher", key: "name" },
        { header: "Program", key: "program" },
        { header: "Availability", key: (t) => t.availability || "-" },
        { header: "Status", key: "status" },
        { header: "Final Score", key: (t) => t.score?.final ?? 0 },
        { header: "QC Score", key: (t) => t.score?.qcScore ?? "-" },
        { header: "NPS Score", key: (t) => t.score?.npsScore ?? "-" },
        { header: "Inspection", key: (t) => t.score?.inspectionScore ?? "-" },
        { header: "Compliance", key: (t) => t.score?.complianceScore ?? "-" },
      ],
      data: filtered,
    });
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
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <ExportButtons onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} />
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
              boxShadow: "0 4px 12px rgba(99,102,241,0.25)",
            }}>+ Tambah Teacher</button>
          </div>
        </div>

        {/* Metric Cards */}
        <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
          {["Top Performer", "Eligible", "Watch", "Perlu Review", "Disqualified"].map(k => (
            <MetricCard
              key={k}
              statusKey={k}
              count={counts[k]}
              total={teachers.length}
              active={activeMetric === k}
              onClick={() => setActiveMetric(activeMetric === k ? null : k)}
            />
          ))}
        </div>

        {/* Program Health Breakdown Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 20, marginBottom: 28 }}>
          <ProgramHealthCard 
            programName="Lingua" 
            scoredTeachers={scored}
            activeProgram={filterProgram}
            activeMetric={activeMetric}
            onSelectFilter={(prog, stat) => {
              if (filterProgram === prog && activeMetric === stat) {
                setFilterProgram("All");
                setActiveMetric(null);
              } else {
                setFilterProgram(prog);
                setActiveMetric(stat === "All" ? null : stat);
              }
            }}
          />
          <ProgramHealthCard 
            programName="Intertest" 
            scoredTeachers={scored}
            activeProgram={filterProgram}
            activeMetric={activeMetric}
            onSelectFilter={(prog, stat) => {
              if (filterProgram === prog && activeMetric === stat) {
                setFilterProgram("All");
                setActiveMetric(null);
              } else {
                setFilterProgram(prog);
                setActiveMetric(stat === "All" ? null : stat);
              }
            }}
          />
        </div>

        {/* Filters Bar */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama teacher..."
              style={{ width: "100%", padding: "9px 12px 9px 36px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, outline: "none", background: "#FFF", boxSizing: "border-box" }} />
            <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: 15 }}>🔍</span>
          </div>
          {["All", "Lingua", "Intertest"].map(p => (
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

        {/* Main Ranking Table */}
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
              {paginatedMain.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8", fontSize: 14 }}>
                    Tidak ada data teacher reguler yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedMain.map((t, i) => (
                  <tr key={t.id} id={`row-${t.id}`} style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#FAFBFF"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 700, color: "#94A3B8", fontSize: 12 }}>{t.rank === "—" ? "—" : `#${t.rank}`}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600, color: "#0F172A" }}>{t.name}</div>
                      {(t.gantiTutor === 1 || t.gantiTutor === 2) && (
                        <div style={{ fontSize: 10, color: "#B45309", fontWeight: 600, marginTop: 2 }}>⚠ Flagged</div>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ background: "#F1F5F9", color: "#475569", borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>{t.program}</span>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 600, color: t.availability === "Very High" ? "#10B981" : t.availability === "High" ? "#3B82F6" : t.availability === "Moderate" ? "#F59E0B" : t.availability === "Low" ? "#EF4444" : t.availability === "Very Low" ? "#7F1D1D" : "#64748B" }}>
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar for Main Pool */}
        <PaginationBar 
          currentPage={pageMain} 
          totalPages={totalPagesMain} 
          totalItems={filtered.length} 
          onPageChange={setPageMain} 
          label="Tutor Reguler" 
        />

        {/* ─── TABEL KHUSUS: TUTOR BARU (BELUM PUNYA STUDENT / SKOR QC) ─── */}
        <div style={{ marginTop: 48, background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 20, padding: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>🌱</span>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: 0 }}>Daftar Tutor Baru & Onboarding (Belum Punya Student / QC)</h2>
                <span style={{ background: "#FEF3C7", color: "#B45309", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>{newTeachersAll.length} Tutor</span>
              </div>
              <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>
                Tutor yang belum memiliki riwayat student atau skor QC awal. Update data manual atau promosikan ke Pool Utama.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setAdding(true)} style={{
                background: "#4F46E5", color: "#FFF", border: "none", borderRadius: 10,
                padding: "9px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 12px rgba(79,70,229,0.25)"
              }}>
                ➕ Tambah Tutor Baru Manual
              </button>
            </div>
          </div>

          <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 850 }}>
              <thead style={{ background: "#FFFBEB", borderBottom: "1.5px solid #FDE68A" }}>
                <tr>
                  {["Nama Tutor Baru", "Program", "Availability", "Kelengkapan Data", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: h === "Actions" ? "right" : "left", fontWeight: 700, fontSize: 11, color: "#92400E", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedOnboarding.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8", fontSize: 13 }}>
                      Tidak ada tutor baru di tahap onboarding saat ini.
                    </td>
                  </tr>
                ) : (
                  paginatedOnboarding.map(t => {
                    return (
                      <tr key={t.id} style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#FFFDF5"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "14px 16px", fontWeight: 700, color: "#0F172A" }}>{t.name}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ background: "#F1F5F9", color: "#475569", borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>{t.program}</span>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 600, color: "#64748B" }}>
                          {t.availability || "Moderate"}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: t.qc !== null ? "#DCFCE7" : "#FEF2F2", color: t.qc !== null ? "#16A34A" : "#DC2626", fontWeight: 700 }}>
                              {t.qc !== null ? `✔ QC: ${t.qc}` : "✖ QC"}
                            </span>
                            <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: t.nps !== null ? "#DCFCE7" : "#FEF2F2", color: t.nps !== null ? "#16A34A" : "#DC2626", fontWeight: 700 }}>
                              {t.nps !== null ? `✔ NPS: ${t.nps}` : "✖ NPS"}
                            </span>
                            <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: t.compliance !== null ? "#DCFCE7" : "#FEF2F2", color: t.compliance !== null ? "#16A34A" : "#DC2626", fontWeight: 700 }}>
                              {t.compliance !== null ? `✔ Comp: ${t.compliance}` : "✖ Comp"}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ background: "#F1F5F9", color: "#475569", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>🌱 Onboarding</span>
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button onClick={() => setEditing(t)} style={{ padding: "5px 11px", borderRadius: 7, border: "1.5px solid #E2E8F0", background: "#FFF", color: "#475569", fontWeight: 600, cursor: "pointer", fontSize: 11 }}>✏ Edit Manual</button>
                            <button onClick={async () => {
                              if (confirm(`Promosikan ${t.name} ke Pool Utama Matchmaking?`)) {
                                updateTeacher({ ...t, identifier: "Lama" });
                                alert(`✅ ${t.name} berhasil dipromosikan ke Pool Utama!`);
                              }
                            }} style={{ padding: "5px 11px", borderRadius: 7, border: "none", background: "#4F46E5", color: "#FFF", fontWeight: 700, cursor: "pointer", fontSize: 11 }}>🚀 Promote</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar for Onboarding Pool */}
          <PaginationBar 
            currentPage={pageOnboarding} 
            totalPages={totalPagesOnboarding} 
            totalItems={newTeachersAll.length} 
            onPageChange={setPageOnboarding} 
            label="Tutor Baru & Onboarding" 
          />
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

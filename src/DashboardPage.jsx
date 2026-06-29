import { useState, useMemo } from "react";
import { INITIAL_TEACHERS, calcScore, getStatus, STATUS_CONFIG, scoreColor } from "./scoring.js";
import { StatusBadge, ScoreBar } from "./components.jsx";

// ─── Dashboard-specific sub-components ─────────────────────────
function MetricCard({ statusKey, count, onClick, active }) {
  const c = STATUS_CONFIG[statusKey];
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
      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>teacher</div>
    </div>
  );
}

function DrillDown({ teacher, score, onClose }) {
  const { breakdown, penalty, disqualifiedReason } = score;
  const status = getStatus(score.final, teacher.gantiTutor, teacher.available);

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
                {teacher.program} · {teacher.available ? "Available" : "Tidak Available"}
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

          {disqualifiedReason ? (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "14px 18px", color: "#B91C1C", fontSize: 14 }}>
              ⛔ Auto-Disqualified: {disqualifiedReason}
            </div>
          ) : (
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
          )}
        </div>

        {!teacher.hasInspection && (
          <div style={{ padding: "0 28px 20px" }}>
            <button style={{
              width: "100%", background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A",
              borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              📋 Trigger Jadwal Inspeksi
            </button>
          </div>
        )}

        <div style={{ padding: "0 28px 24px" }}>
          <button onClick={onClose} style={{
            width: "100%", background: "#F8FAFC", border: "1px solid #E2E8F0",
            borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer",
          }}>
            Tutup
          </button>
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
    { key: "program",     label: "Program",                  type: "select", opts: ["IELTS", "SAT"] },
    { key: "qc",          label: "QC Score (0–100)",         type: "number", min: 0, max: 100 },
    { key: "nps",         label: "NPS Tutor (0–100)",        type: "number", min: 0, max: 100 },
    { key: "inspection",  label: "Class Inspection (0–100)", type: "number", min: 0, max: 100 },
    { key: "compliance",  label: "Compliance (0–100)",       type: "number", min: 0, max: 100 },
    { key: "gantiTutor",  label: "Ganti Tutor Count",        type: "number", min: 0, max: 10  },
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
            {[{ k: "hasInspection", l: "Punya Inspection Data" }, { k: "available", l: "Available" }].map(({ k, l }) => (
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
  const blank = { id: Date.now(), name: "", program: "IELTS", qc: 80, nps: 75, inspection: 70, compliance: 85, gantiTutor: 0, hasInspection: true, available: true, availabilitySlots: [] };
  return <EditModal teacher={blank} onSave={onSave} onClose={onClose} />;
}

// ─── Main Dashboard ────────────────────────────────────────────
export default function DashboardPage({ teachers, setTeachers }) {
  const [filterProgram, setFilterProgram] = useState("All");
  const [filterStatus, setFilterStatus]   = useState("All");
  const [filterAvail, setFilterAvail]     = useState(false);
  const [search, setSearch]           = useState("");
  const [drill, setDrill]             = useState(null);
  const [editing, setEditing]         = useState(null);
  const [adding, setAdding]           = useState(false);
  const [activeMetric, setActiveMetric]   = useState(null);
  
  const [matchMode, setMatchMode]         = useState(false);
  const [matchProgram, setMatchProgram]   = useState("IELTS");
  const [matchSlot, setMatchSlot]         = useState("Senin 19:00");

  const scored = useMemo(() =>
    teachers.map(t => {
      const score = calcScore(t);
      return { ...t, score, status: getStatus(score.final, t.gantiTutor, t.available) };
    }).sort((a, b) => b.score.final - a.score.final),
    [teachers]
  );

  const filtered = useMemo(() => scored.filter(t => {
    if (matchMode) {
      if (t.status === "Disqualified") return false;
      if (t.program !== matchProgram) return false;
      if (!t.availabilitySlots?.includes(matchSlot)) return false;
      return true;
    }
    if (filterProgram !== "All" && t.program !== filterProgram) return false;
    const fs = activeMetric || filterStatus;
    if (fs !== "All" && t.status !== fs) return false;
    if (filterAvail && !t.available) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [scored, matchMode, matchProgram, matchSlot, filterProgram, filterStatus, filterAvail, search, activeMetric]);

  const counts = useMemo(() => {
    const c = { "Top Performer": 0, Eligible: 0, Watch: 0, Disqualified: 0 };
    scored.forEach(t => c[t.status]++);
    return c;
  }, [scored]);

  const barMax = useMemo(() => Math.max(...scored.map(t => t.score.final), 1), [scored]);

  const updateTeacher = (updated) => setTeachers(ts => ts.map(t => t.id === updated.id ? updated : t));
  const addTeacher    = (t)       => setTeachers(ts => [...ts, { ...t, id: Date.now() }]);
  const removeTeacher = (id)      => setTeachers(ts => ts.filter(t => t.id !== id));

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
          <button onClick={() => setAdding(true)} style={{
            background: "#6366F1", color: "#FFF", border: "none", borderRadius: 10,
            padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 7,
          }}>
            + Tambah Teacher
          </button>
        </div>

        {/* Metric Cards */}
        <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
          {["Top Performer", "Eligible", "Watch", "Disqualified"].map(s => (
            <MetricCard key={s} statusKey={s} count={counts[s]}
              active={activeMetric === s}
              onClick={() => setActiveMetric(activeMetric === s ? null : s)} />
          ))}
        </div>

        {/* Chart */}
        <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 24px", marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 18 }}>
            Composite Score — All Teachers
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {scored.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 140, fontSize: 12, color: "#374151", fontWeight: 500, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                <div style={{ flex: 1, height: 20, background: "#F1F5F9", borderRadius: 99, position: "relative", overflow: "hidden" }}>
                  <div style={{
                    position: "absolute", left: 0, top: 0, height: "100%",
                    width: `${(t.score.final / barMax) * 100}%`,
                    background: scoreColor(t.score.final), borderRadius: 99,
                    transition: "width 0.5s ease",
                  }} />
                </div>
                <div style={{ width: 32, fontSize: 12, fontWeight: 700, color: scoreColor(t.score.final), textAlign: "right", flexShrink: 0 }}>{t.score.final}</div>
              </div>
            ))}
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

        {matchMode && (
          <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, background: "#22C55E", borderRadius: "50%" }}></span>
            {filtered.length} teacher available untuk {matchProgram}, {matchSlot} — diurut by score
          </div>
        )}

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
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569", cursor: "pointer", padding: "8px 12px", border: filterAvail ? "1.5px solid #6366F1" : "1.5px solid #E2E8F0", borderRadius: 9, background: filterAvail ? "#EEF2FF" : "#FFF" }}>
            <input type="checkbox" checked={filterAvail} onChange={e => setFilterAvail(e.target.checked)} style={{ width: 14, height: 14 }} />
            Available Only
          </label>
          {(filterProgram !== "All" || filterStatus !== "All" || filterAvail || search || activeMetric) && (
            <button onClick={() => { setFilterProgram("All"); setFilterStatus("All"); setFilterAvail(false); setSearch(""); setActiveMetric(null); }}
              style={{ padding: "8px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1.5px solid #FECACA", background: "#FEF2F2", color: "#B91C1C" }}>
              Reset Filter
            </button>
          )}
        </div>
        )}

        {/* Table */}
        <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}>
                {["Rank", "Nama Teacher", "Program", "QC", "NPS", "Inspection", "Compliance", "Penalty", "Final Score", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: h === "Final Score" || h === "Rank" ? "center" : "left", fontWeight: 700, fontSize: 11, color: "#64748B", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8", fontSize: 14 }}>Tidak ada teacher yang sesuai filter.</td></tr>
              ) : filtered.map((t, i) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #F1F5F9" }}
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
                    {t.score.disqualifiedReason ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor(t.score.final) }}>0</span>
                        <span style={{ fontSize: 10, background: "#FEF2F2", color: "#B91C1C", padding: "3px 6px", borderRadius: 4, fontWeight: 600, marginTop: 4, whiteSpace: "nowrap" }}>Excluded: {t.score.disqualifiedReason}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor(t.score.final) }}>{t.score.final}</span>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px" }}><StatusBadge status={t.status} small /></td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setDrill(t)} style={{ padding: "5px 11px", borderRadius: 7, border: "1.5px solid #E0E7FF", background: "#EEF2FF", color: "#4F46E5", fontWeight: 600, cursor: "pointer", fontSize: 11 }}>Detail</button>
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

      {drill    && <DrillDown teacher={drill} score={drill.score} onClose={() => setDrill(null)} />}
      {editing  && <EditModal teacher={editing} onSave={updateTeacher} onClose={() => setEditing(null)} />}
      {adding   && <AddTeacherModal onSave={addTeacher} onClose={() => setAdding(false)} />}
    </div>
  );
}

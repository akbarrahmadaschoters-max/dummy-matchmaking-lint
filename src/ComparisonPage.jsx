import { useState, useMemo } from "react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { rankTeachers, scoreColor } from "./scoring.js";
import { StatusBadge } from "./components.jsx";

const FACTORS = [
  { key: "qc", label: "QC Score" },
  { key: "nps", label: "NPS Tutor" },
  { key: "inspection", label: "Inspection" },
  { key: "compliance", label: "Compliance" },
];

const COLOR_A = "#6366F1";
const COLOR_B = "#F59E0B";

function TeacherPicker({ label, value, options, onChange, color }) {
  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: color }} />
        {label}
      </label>
      <select value={value ?? ""} onChange={e => onChange(e.target.value ? +e.target.value : null)}
        style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${color}40`, borderRadius: 11, fontSize: 14, fontWeight: 600, color: "#0F172A", outline: "none", background: "#FFF", cursor: "pointer", boxSizing: "border-box" }}>
        <option value="">— Pilih Teacher —</option>
        {options.map(t => <option key={t.id} value={t.id}>{t.name} ({t.score.final})</option>)}
      </select>
    </div>
  );
}

function StatRow({ label, a, b, suffix = "" }) {
  const aWin = a > b, bWin = b > a;
  const cell = (val, win) => (
    <div style={{ flex: 1, textAlign: "center", padding: "10px 0", fontWeight: 700, fontSize: 16,
      color: win ? "#0F172A" : "#94A3B8",
      background: win ? "#F8FAFC" : "transparent", borderRadius: 8 }}>
      {val}{suffix}
      {win && <span style={{ marginLeft: 5, fontSize: 11, color: "#22C55E" }}>▲</span>}
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #F1F5F9" }}>
      {cell(a, aWin)}
      <div style={{ width: 130, textAlign: "center", fontSize: 12, fontWeight: 600, color: "#64748B", flexShrink: 0 }}>{label}</div>
      {cell(b, bWin)}
    </div>
  );
}

export default function ComparisonPage({ teachers }) {
  const ranked = useMemo(() => rankTeachers(teachers), [teachers]);
  const eligible = useMemo(() => ranked.filter(t => t.score.final > 0), [ranked]);

  // Auto-suggest: top 2 eligible teachers
  const suggested = useMemo(() => {
    if (eligible.length < 2) return null;
    return [eligible[0].id, eligible[1].id];
  }, [eligible]);

  const [idA, setIdA] = useState(suggested ? suggested[0] : null);
  const [idB, setIdB] = useState(suggested ? suggested[1] : null);

  const teacherA = ranked.find(t => t.id === idA) || null;
  const teacherB = ranked.find(t => t.id === idB) || null;
  const ready = teacherA && teacherB && teacherA.id !== teacherB.id;

  const applySuggestion = () => {
    if (suggested) { setIdA(suggested[0]); setIdB(suggested[1]); }
  };

  // Radar data
  const radarData = FACTORS.map(f => ({
    factor: f.label,
    A: teacherA ? (f.key === "inspection" && !teacherA.hasInspection ? null : teacherA[f.key] || 0) : 0,
    B: teacherB ? (f.key === "inspection" && !teacherB.hasInspection ? null : teacherB[f.key] || 0) : 0,
  }));

  // Bar data
  const barData = FACTORS.map(f => ({
    factor: f.label,
    [teacherA?.name || "A"]: teacherA ? (f.key === "inspection" && !teacherA.hasInspection ? null : teacherA[f.key] || 0) : 0,
    [teacherB?.name || "B"]: teacherB ? (f.key === "inspection" && !teacherB.hasInspection ? null : teacherB[f.key] || 0) : 0,
  }));

  // Recommendation logic
  const recommendation = useMemo(() => {
    if (!ready) return null;
    const diff = teacherA.score.final - teacherB.score.final;
    const winner = diff > 0 ? teacherA : teacherB;
    const loser = diff > 0 ? teacherB : teacherA;
    const absDiff = Math.abs(diff);

    let reasons = [];
    FACTORS.forEach(f => {
      if (f.key === "inspection" && (!winner.hasInspection || !loser.hasInspection)) return;
      const wv = winner[f.key] || 0;
      const lv = loser[f.key] || 0;
      if (wv > lv + 5) reasons.push(`${f.label} lebih unggul (${wv} vs ${lv})`);
    });
    if (winner.gantiTutor < loser.gantiTutor) reasons.push(`riwayat ganti tutor lebih bersih (${winner.gantiTutor}× vs ${loser.gantiTutor}×)`);

    return { winner, loser, absDiff, reasons, tie: absDiff === 0 };
  }, [ready, teacherA, teacherB]);

  const card = { background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "22px 24px" };
  const cardTitle = { fontSize: 12, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 18 };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0 }}>Teacher Comparison</h1>
        <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>Bandingkan dua teacher head-to-head · Auto-suggest pasangan terbaik</p>
      </div>

      {/* Auto-suggest banner */}
      {suggested && (
        <div style={{ background: "linear-gradient(135deg,#EEF2FF,#F5F3FF)", border: "1.5px solid #C7D2FE", borderRadius: 14, padding: "16px 22px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>✨</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#3730A3" }}>Suggested Match-up</div>
              <div style={{ fontSize: 13, color: "#6366F1", marginTop: 2 }}>
                {ranked.find(t => t.id === suggested[0])?.name} vs {ranked.find(t => t.id === suggested[1])?.name} — dua teacher score tertinggi di pool
              </div>
            </div>
          </div>
          <button onClick={applySuggestion} style={{ background: "#6366F1", color: "#FFF", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            Pakai Suggestion
          </button>
        </div>
      )}

      {/* Pickers */}
      <div style={{ ...card, marginBottom: 20, display: "flex", gap: 20, alignItems: "flex-end", flexWrap: "wrap" }}>
        <TeacherPicker label="Teacher A" value={idA} options={ranked} onChange={setIdA} color={COLOR_A} />
        <div style={{ fontSize: 14, fontWeight: 800, color: "#CBD5E1", paddingBottom: 11 }}>VS</div>
        <TeacherPicker label="Teacher B" value={idB} options={ranked} onChange={setIdB} color={COLOR_B} />
      </div>

      {!ready ? (
        <div style={{ ...card, textAlign: "center", padding: "60px 24px", color: "#94A3B8" }}>
          {teacherA && teacherB && teacherA.id === teacherB.id
            ? "Pilih dua teacher yang berbeda untuk membandingkan."
            : "Pilih dua teacher untuk mulai membandingkan."}
        </div>
      ) : (
        <>
          {/* Recommendation */}
          {recommendation && (
            <div style={{ background: recommendation.tie ? "#FFFBEB" : "#F0FDF4", border: `1.5px solid ${recommendation.tie ? "#FDE68A" : "#BBF7D0"}`, borderRadius: 16, padding: "20px 24px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: recommendation.tie ? "#B45309" : "#15803D", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>
                💡 Rekomendasi Sistem
              </div>
              {recommendation.tie ? (
                <div style={{ fontSize: 15, color: "#92400E" }}>
                  Kedua teacher punya composite score identik ({teacherA.score.final}). Pertimbangkan faktor lain seperti availability slot atau program fit.
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 16, color: "#0F172A", marginBottom: 8 }}>
                    Pilih <strong style={{ color: "#15803D" }}>{recommendation.winner.name}</strong> — unggul <strong>{recommendation.absDiff} poin</strong> ({recommendation.winner.score.final} vs {recommendation.loser.score.final}).
                  </div>
                  {recommendation.reasons.length > 0 && (
                    <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                      Keunggulan utama: {recommendation.reasons.join(" · ")}.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Head-to-head score banner */}
          <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            {[{ t: teacherA, color: COLOR_A }, { t: teacherB, color: COLOR_B }].map(({ t, color }, i) => (
              <div key={i} style={{ ...card, flex: 1, minWidth: 240, borderTop: `3px solid ${color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#0F172A" }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "#64748B", margin: "3px 0 8px" }}>{t.program} · {t.available ? "Available" : "Tidak Available"}</div>
                    <StatusBadge status={t.status} small />
                  </div>
                  <div style={{ fontSize: 34, fontWeight: 800, color: scoreColor(t.score.final), lineHeight: 1 }}>{t.score.final}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            {/* Radar */}
            <div style={card}>
              <div style={cardTitle}>Radar — Profil Per Faktor</div>
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="factor" tick={{ fontSize: 12, fill: "#64748B" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#CBD5E1" }} />
                  <Radar name={teacherA.name} dataKey="A" stroke={COLOR_A} fill={COLOR_A} fillOpacity={0.25} strokeWidth={2} />
                  <Radar name={teacherB.name} dataKey="B" stroke={COLOR_B} fill={COLOR_B} fillOpacity={0.25} strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Bar */}
            <div style={card}>
              <div style={cardTitle}>Bar — Side by Side</div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={barData} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="factor" tick={{ fontSize: 11, fill: "#64748B" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} cursor={{ fill: "#F8FAFC" }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                  <Bar dataKey={teacherA.name} fill={COLOR_A} radius={[5, 5, 0, 0]} maxBarSize={36} />
                  <Bar dataKey={teacherB.name} fill={COLOR_B} radius={[5, 5, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Head-to-head table */}
          <div style={card}>
            <div style={cardTitle}>Head-to-Head Breakdown</div>
            <div style={{ display: "flex", alignItems: "center", paddingBottom: 8, borderBottom: "2px solid #E2E8F0" }}>
              <div style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 700, color: COLOR_A }}>{teacherA.name}</div>
              <div style={{ width: 130, flexShrink: 0 }} />
              <div style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 700, color: COLOR_B }}>{teacherB.name}</div>
            </div>
            <StatRow label="QC Score" a={teacherA.qc} b={teacherB.qc} />
            <StatRow label="NPS Tutor" a={teacherA.nps} b={teacherB.nps} />
            <StatRow label="Inspection" a={teacherA.hasInspection ? teacherA.inspection : "N/A"} b={teacherB.hasInspection ? teacherB.inspection : "N/A"} />
            <StatRow label="Compliance" a={teacherA.compliance} b={teacherB.compliance} />
            <StatRow label="Ganti Tutor" a={teacherA.gantiTutor} b={teacherB.gantiTutor} suffix="×" />
            <div style={{ display: "flex", alignItems: "center", marginTop: 8, paddingTop: 8 }}>
              <div style={{ flex: 1, textAlign: "center", fontSize: 22, fontWeight: 800, color: scoreColor(teacherA.score.final) }}>{teacherA.score.final}</div>
              <div style={{ width: 130, textAlign: "center", fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.05em", textTransform: "uppercase", flexShrink: 0 }}>Final Score</div>
              <div style={{ flex: 1, textAlign: "center", fontSize: 22, fontWeight: 800, color: scoreColor(teacherB.score.final) }}>{teacherB.score.final}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

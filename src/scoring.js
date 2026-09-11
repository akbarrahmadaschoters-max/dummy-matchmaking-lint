// ─── Dummy Data ────────────────────────────────────────────────
export const INITIAL_TEACHERS = [];

// ─── Helper function ────────────────────────────────────────────
function parseScoreValue(v) {
  if (v === null || v === undefined || v === "" || String(v).trim().toLowerCase() === "nan") return null;
  const n = Number(v);
  return isNaN(n) ? null : Math.max(0, Math.min(100, n));
}

// ─── Scoring Engine ────────────────────────────────────────────
export function calcScore(t) {
  if (!t || t.identifier === "Baru") {
    return {
      final: 0,
      penalty: 0,
      breakdown: {
        qc:         { label: "QC Score",         val: null, weight: 0, contrib: 0 },
        nps:        { label: "NPS Tutor",        val: null, weight: 0, contrib: 0 },
        inspection: { label: "Class Inspection", val: null, weight: 0, contrib: 0 },
        compliance: { label: "Compliance",       val: null, weight: 0, contrib: 0 },
      },
      disqualifiedReason: null,
      isOnboarding: true
    };
  }

  const qcVal   = parseScoreValue(t.qc);
  const npsVal  = parseScoreValue(t.nps);
  const insVal  = t.hasInspection ? parseScoreValue(t.inspection) : null;
  const compVal = parseScoreValue(t.compliance);

  // Active weights: a component is active if it has a valid numerical value (>= 0)
  const activeWeights = {
    qc:   qcVal   !== null ? 0.35 : 0,
    nps:  npsVal  !== null ? 0.30 : 0,
    ins:  insVal  !== null ? 0.20 : 0,
    comp: compVal !== null ? 0.15 : 0,
  };

  const sumW = activeWeights.qc + activeWeights.nps + activeWeights.ins + activeWeights.comp;
  let qcW = 0, npsW = 0, insW = 0, compW = 0;

  if (sumW > 0) {
    qcW   = activeWeights.qc / sumW;
    npsW  = activeWeights.nps / sumW;
    insW  = activeWeights.ins / sumW;
    compW = activeWeights.comp / sumW;
  }

  const qcContrib   = (qcVal   ?? 0) * qcW;
  const npsContrib  = (npsVal  ?? 0) * npsW;
  const insContrib  = (insVal  ?? 0) * insW;
  const compContrib = (compVal ?? 0) * compW;

  const raw     = qcContrib + npsContrib + insContrib + compContrib;
  const ganti   = Number(t.gantiTutor) || 0;
  const penalty = ganti >= 1 && ganti < 3 ? 10 : 0;
  const final   = sumW > 0 ? Math.max(0, Math.round(raw - penalty)) : 0;

  const breakdown = {
    qc:         { label: "QC Score",         val: qcVal,   weight: qcW,   contrib: qcContrib   },
    nps:        { label: "NPS Tutor",        val: npsVal,  weight: npsW,  contrib: npsContrib  },
    inspection: { label: "Class Inspection", val: insVal,  weight: insW,  contrib: insContrib  },
    compliance: { label: "Compliance",       val: compVal, weight: compW, contrib: compContrib },
  };

  return { final, penalty, breakdown, disqualifiedReason: null };
}

export function getStatus(score, t) {
  if (t && t.isDisqualified) return "Disqualified";
  if (score.isOnboarding) return "Onboarding";
  if (score.final < 40 || (t && t.gantiTutor >= 2)) return "Perlu Review";
  if (score.final >= 80) return "Top Performer";
  if (score.final >= 60) return "Eligible";
  return "Watch";
}

// ─── Status Config ─────────────────────────────────────────────
export const STATUS_CONFIG = {
  "Top Performer": { label: "⭐ Top Performer", bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0", dot: "#22C55E" },
  "Eligible":      { label: "✔ Eligible",       bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE", dot: "#3B82F6" },
  "Watch":         { label: "⚠ Watch",           bg: "#FFFBEB", text: "#B45309", border: "#FDE68A", dot: "#F59E0B" },
  "Perlu Review":  { label: "⚠ Perlu Review",    bg: "#FEF9C3", text: "#A16207", border: "#FEF08A", dot: "#EAB308" },
  "Disqualified":  { label: "⛔ Disqualified",   bg: "#FEF2F2", text: "#B91C1C", border: "#FECACA", dot: "#EF4444" },
  "Onboarding":    { label: "🌱 Onboarding",     bg: "#F1F5F9", text: "#475569", border: "#E2E8F0", dot: "#94A3B8" },
};

export const scoreColor = (s) => {
  if (s >= 80) return "#22C55E";
  if (s >= 60) return "#3B82F6";
  if (s >= 40) return "#F59E0B";
  return "#EF4444";
};

// Helper: enrich teacher list with score + status, sorted desc
export function rankTeachers(teachers) {
  return teachers
    .map(t => {
      const score = calcScore(t);
      return { ...t, score, status: getStatus(score, t) };
    })
    .sort((a, b) => b.score.final - a.score.final);
}

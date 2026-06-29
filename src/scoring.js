// ─── Dummy Data ────────────────────────────────────────────────
export const INITIAL_TEACHERS = [
  { id: 1, name: "Rizky Aditya", program: "IELTS", qc: 92, nps: 88, inspection: 85, compliance: 95, gantiTutor: 0, hasInspection: true, available: true },
  { id: 2, name: "Salsabila Putri", program: "IELTS", qc: 85, nps: 91, inspection: 80, compliance: 88, gantiTutor: 1, hasInspection: true, available: true },
  { id: 3, name: "Dimas Pratama", program: "SAT", qc: 78, nps: 72, inspection: null, compliance: 90, gantiTutor: 0, hasInspection: false, available: true },
  { id: 4, name: "Nadia Kusuma", program: "IELTS", qc: 65, nps: 70, inspection: 60, compliance: 75, gantiTutor: 2, hasInspection: true, available: true },
  { id: 5, name: "Farhan Haikal", program: "SAT", qc: 55, nps: 48, inspection: 50, compliance: 60, gantiTutor: 1, hasInspection: true, available: false },
  { id: 6, name: "Tiara Anggraini", program: "IELTS", qc: 90, nps: 85, inspection: null, compliance: 92, gantiTutor: 0, hasInspection: false, available: true },
  { id: 7, name: "Bimo Santoso", program: "SAT", qc: 38, nps: 35, inspection: 40, compliance: 45, gantiTutor: 3, hasInspection: true, available: true },
  { id: 8, name: "Kirana Dewi", program: "IELTS", qc: 82, nps: 79, inspection: 75, compliance: 85, gantiTutor: 0, hasInspection: true, available: true },
  { id: 9, name: "Yusuf Hamdani", program: "SAT", qc: 70, nps: 66, inspection: 70, compliance: 80, gantiTutor: 1, hasInspection: true, available: true },
  { id: 10, name: "Mega Wulandari", program: "IELTS", qc: 45, nps: 52, inspection: 48, compliance: 55, gantiTutor: 2, hasInspection: true, available: true },
];

// ─── Scoring Engine ────────────────────────────────────────────
export function calcScore(t) {
  if (t.gantiTutor >= 3) return { final: 0, disqualifiedReason: "3× Ganti Tutor", breakdown: {} };
  if (!t.available) return { final: 0, disqualifiedReason: "Tidak Available", breakdown: {} };

  let qcW = 0.35, npsW = 0.30, insW = 0.20, compW = 0.10;

  if (!t.hasInspection) {
    qcW = 0.42; npsW = 0.36; insW = 0; compW = 0.12;
  }

  const qcContrib   = t.qc * qcW;
  const npsContrib  = t.nps * npsW;
  const insContrib  = t.hasInspection ? (t.inspection || 0) * insW : 0;
  const compContrib = t.compliance * compW;

  const breakdown = {
    qc:         { label: "QC Score",         val: t.qc,                                  weight: qcW,   contrib: qcContrib   },
    nps:        { label: "NPS Tutor",        val: t.nps,                                 weight: npsW,  contrib: npsContrib  },
    inspection: { label: "Class Inspection", val: t.hasInspection ? t.inspection : null, weight: insW,  contrib: insContrib  },
    compliance: { label: "Compliance",       val: t.compliance,                          weight: compW, contrib: compContrib },
  };

  const raw     = qcContrib + npsContrib + insContrib + compContrib;
  const penalty = t.gantiTutor >= 1 ? 10 : 0;
  const final   = Math.max(0, Math.round(raw - penalty));

  return { final, penalty, breakdown, disqualifiedReason: null };
}

export function getStatus(score, gantiTutor, available) {
  if (gantiTutor >= 3 || !available) return "Disqualified";
  if (score >= 80) return "Top Performer";
  if (score >= 60) return "Eligible";
  if (score >= 40) return "Watch";
  return "Disqualified";
}

// ─── Status Config ─────────────────────────────────────────────
export const STATUS_CONFIG = {
  "Top Performer": { label: "⭐ Top Performer", bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0", dot: "#22C55E" },
  "Eligible":      { label: "✔ Eligible",       bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE", dot: "#3B82F6" },
  "Watch":         { label: "⚠ Watch",           bg: "#FFFBEB", text: "#B45309", border: "#FDE68A", dot: "#F59E0B" },
  "Disqualified":  { label: "⛔ Disqualified",   bg: "#FEF2F2", text: "#B91C1C", border: "#FECACA", dot: "#EF4444" },
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
      return { ...t, score, status: getStatus(score.final, t.gantiTutor, t.available) };
    })
    .sort((a, b) => b.score.final - a.score.final);
}

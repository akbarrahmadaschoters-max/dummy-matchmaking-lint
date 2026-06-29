// ─── Dummy Data ────────────────────────────────────────────────
export const INITIAL_TEACHERS = [
  { id: 1, name: "Rizky Aditya", program: "IELTS", qc: 92, nps: 88, inspection: 85, compliance: 95, gantiTutor: 0, hasInspection: true, identifier: "Lama", availability: "High", availabilitySlots: ["Senin 19:00", "Selasa 19:00"] },
  { id: 2, name: "Salsabila Putri", program: "IELTS", qc: 85, nps: 91, inspection: 80, compliance: 88, gantiTutor: 1, hasInspection: true, identifier: "Lama", availability: "Medium", availabilitySlots: ["Selasa 19:00", "Rabu 19:00"] },
  { id: 3, name: "Dimas Pratama", program: "SAT", qc: 78, nps: 72, inspection: null, compliance: 90, gantiTutor: 0, hasInspection: false, identifier: "Lama", availability: "High", availabilitySlots: ["Senin 19:00", "Kamis 16:00"] },
  { id: 4, name: "Nadia Kusuma", program: "IELTS", qc: 65, nps: 70, inspection: 60, compliance: 75, gantiTutor: 2, hasInspection: true, identifier: "Lama", availability: "High", availabilitySlots: ["Jumat 16:00"] },
  { id: 5, name: "Farhan Haikal", program: "SAT", qc: 55, nps: 48, inspection: 50, compliance: 60, gantiTutor: 1, hasInspection: true, identifier: "Lama", availability: "Moderate", availabilitySlots: [] },
  { id: 6, name: "Tiara Anggraini", program: "IELTS", qc: 90, nps: 85, inspection: null, compliance: 92, gantiTutor: 0, hasInspection: false, identifier: "Lama", availability: "High", availabilitySlots: ["Selasa 19:00", "Kamis 16:00"] },
  { id: 7, name: "Bimo Santoso", program: "SAT", qc: 38, nps: 35, inspection: 40, compliance: 45, gantiTutor: 3, hasInspection: true, identifier: "Lama", availability: "High", availabilitySlots: ["Rabu 19:00"] },
  { id: 8, name: "Kirana Dewi", program: "IELTS", qc: 82, nps: 79, inspection: 75, compliance: 85, gantiTutor: 0, hasInspection: true, identifier: "Lama", availability: "Medium", availabilitySlots: ["Senin 19:00", "Rabu 19:00"] },
  { id: 9, name: "Yusuf Hamdani", program: "SAT", qc: 70, nps: 66, inspection: 70, compliance: 80, gantiTutor: 1, hasInspection: true, identifier: "Lama", availability: "Moderate", availabilitySlots: ["Selasa 19:00"] },
  { id: 10, name: "Mega Wulandari", program: "IELTS", qc: 45, nps: 52, inspection: 48, compliance: 55, gantiTutor: 2, hasInspection: true, identifier: "Baru", availability: "Moderate", availabilitySlots: ["Jumat 16:00"] },
];

// ─── Scoring Engine ────────────────────────────────────────────
export function calcScore(t) {
  if (t.identifier === "Baru") {
    return { final: 0, penalty: 0, breakdown: {}, disqualifiedReason: null, isOnboarding: true };
  }

  let activeWeights = {
    qc: (t.qc !== null && t.qc > 0) ? 0.35 : 0,
    nps: (t.nps !== null && t.nps > 0) ? 0.30 : 0,
    ins: (t.hasInspection && t.inspection !== null) ? 0.20 : 0,
    comp: (t.compliance !== null && t.compliance > 0) ? 0.15 : 0,
  };

  let sumW = activeWeights.qc + activeWeights.nps + activeWeights.ins + activeWeights.comp;
  let qcW = 0, npsW = 0, insW = 0, compW = 0;
  
  if (sumW > 0) {
    qcW = activeWeights.qc / sumW;
    npsW = activeWeights.nps / sumW;
    insW = activeWeights.ins / sumW;
    compW = activeWeights.comp / sumW;
  }

  const qcContrib   = (t.qc || 0) * qcW;
  const npsContrib  = (t.nps || 0) * npsW;
  const insContrib  = t.hasInspection ? (t.inspection || 0) * insW : 0;
  const compContrib = (t.compliance || 0) * compW;

  const breakdown = {
    qc:         { label: "QC Score",         val: t.qc,                                  weight: qcW,   contrib: qcContrib   },
    nps:        { label: "NPS Tutor",        val: t.nps,                                 weight: npsW,  contrib: npsContrib  },
    inspection: { label: "Class Inspection", val: t.hasInspection ? t.inspection : null, weight: insW,  contrib: insContrib  },
    compliance: { label: "Compliance",       val: t.compliance,                          weight: compW, contrib: compContrib },
  };

  const raw     = qcContrib + npsContrib + insContrib + compContrib;
  const penalty = t.gantiTutor >= 1 && t.gantiTutor < 3 ? 10 : 0;
  const final   = Math.max(0, Math.round(raw - penalty));

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

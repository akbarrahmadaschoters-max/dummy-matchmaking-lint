import { useState } from "react";
import { INITIAL_TEACHERS } from "./scoring.js";
import DashboardPage from "./DashboardPage.jsx";
import ComparisonPage from "./ComparisonPage.jsx";
import OnboardingPage from "./OnboardingPage.jsx";
import DisqualifiedPage from "./DisqualifiedPage.jsx";

export default function App() {
  const [teachers, setTeachers] = useState(INITIAL_TEACHERS);
  const [page, setPage] = useState("dashboard");

  console.log("Verify Client ID:", import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const tabStyle = (active) => ({
    padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
    cursor: "pointer", border: "none", transition: "all 0.15s",
    background: active ? "#EEF2FF" : "transparent",
    color: active ? "#4F46E5" : "#64748B",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", padding: "0 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#6366F1,#818CF8)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#FFF", fontSize: 14, fontWeight: 800 }}>L</span>
              </div>
              <div>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>LINT</span>
                <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 8 }}>Matchmaking Dashboard</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, background: "#F8FAFC", padding: 4, borderRadius: 11 }}>
              <button style={tabStyle(page === "dashboard")} onClick={() => setPage("dashboard")}>Dashboard</button>
              <button style={tabStyle(page === "comparison")} onClick={() => setPage("comparison")}>Comparison</button>
              <button style={tabStyle(page === "onboarding")} onClick={() => setPage("onboarding")}>Onboarding Pool</button>
              <button style={tabStyle(page === "disqualified")} onClick={() => setPage("disqualified")}>Disqualified</button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "#94A3B8", background: "#F1F5F9", borderRadius: 6, padding: "3px 9px", fontWeight: 500 }}>PRD v1.0 · H2 2026</span>
            <div style={{ width: 32, height: 32, background: "#E0E7FF", borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#4F46E5" }}>AR</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 32px" }}>
        {page === "dashboard" && <DashboardPage teachers={teachers} setTeachers={setTeachers} />}
        {page === "comparison" && <ComparisonPage teachers={teachers} />}
        {page === "onboarding" && <OnboardingPage teachers={teachers} setTeachers={setTeachers} />}
        {page === "disqualified" && <DisqualifiedPage teachers={teachers} setTeachers={setTeachers} />}
      </div>
    </div>
  );
}

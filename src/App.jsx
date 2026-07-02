import { useState, useEffect } from "react";
import { auth, googleProvider, db } from "./firebase.js";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { INITIAL_TEACHERS } from "./scoring.js";
import DashboardPage from "./DashboardPage.jsx";
import ComparisonPage from "./ComparisonPage.jsx";
import OnboardingPage from "./OnboardingPage.jsx";
import DisqualifiedPage from "./DisqualifiedPage.jsx";
import OfflinePage from "./OfflinePage.jsx";
import LoginHero from "./LoginHero.jsx";

export default function App() {
  const [teachers, setTeachers] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (currentUser) {
        // Start listening to Firestore when logged in
        const unsubscribeDb = onSnapshot(collection(db, "teachers"), (snapshot) => {
          const teachersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Fallback to INITIAL_TEACHERS if DB is empty for demo purposes (optional)
          if (teachersData.length === 0) {
            setTeachers(INITIAL_TEACHERS);
          } else {
            setTeachers(teachersData);
          }
        });
        return () => unsubscribeDb();
      } else {
        setTeachers([]);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleLogout = async () => {
    try {
      if (user?.uid === 'dummy-user-123') {
        setUser(null);
        setTeachers([]);
        return;
      }
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  console.log("Verify Client ID:", import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const tabStyle = (active) => ({
    padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
    cursor: "pointer", border: "none", transition: "all 0.15s",
    background: active ? "#EEF2FF" : "transparent",
    color: active ? "#4F46E5" : "#64748B",
  });

  if (authLoading) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC" }}>Loading...</div>;
  }

  if (!user) {
    return <LoginHero />;
  }

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
              <button style={tabStyle(page === "offline")} onClick={() => setPage("offline")}>Offline & Hybrid</button>
              <button style={tabStyle(page === "onboarding")} onClick={() => setPage("onboarding")}>Onboarding Pool</button>
              <button style={tabStyle(page === "disqualified")} onClick={() => setPage("disqualified")}>Disqualified</button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: "#4F46E5", background: "#EEF2FF", borderRadius: 6, padding: "3px 9px", fontWeight: 700 }}>Developed by Akbar</span>
              <img src={user.photoURL} alt={user.displayName} style={{ width: 32, height: 32, borderRadius: 99, border: "1px solid #E2E8F0" }} title={user.displayName} />
            </div>
            <button onClick={handleLogout} style={{ background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>Logout</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 32px" }}>
        {page === "dashboard" && <DashboardPage teachers={teachers} setTeachers={setTeachers} />}
        {page === "comparison" && <ComparisonPage teachers={teachers} />}
        {page === "offline" && <OfflinePage teachers={teachers} setTeachers={setTeachers} />}
        {page === "onboarding" && <OnboardingPage teachers={teachers} setTeachers={setTeachers} />}
        {page === "disqualified" && <DisqualifiedPage teachers={teachers} setTeachers={setTeachers} />}
      </div>
    </div>
  );
}

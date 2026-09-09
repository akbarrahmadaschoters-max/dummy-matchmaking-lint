import React, { useState, useEffect, useMemo, useRef } from "react";
import Papa from "papaparse";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import targaryenPassword from "../env/HouseofTargareyan?raw";
import { deleteAllTeachers } from "./teacherService.js";
import { ExportButtons } from "./components.jsx";
import { exportToExcel, exportToPdf } from "./utils/exportUtils.js";

// Helper component to center map smoothly on selected branch
function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== undefined && center[1] !== undefined && !isNaN(center[0]) && !isNaN(center[1])) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// Helper component to fit map bounds to active route
function MapRouteFitter({ routeCoords }) {
  const map = useMap();
  useEffect(() => {
    if (routeCoords && routeCoords.length >= 2) {
      const bounds = L.latLngBounds(routeCoords);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }, [routeCoords, map]);
  return null;
}

// Calculate straight-line distance (Haversine formula) in kilometers
const calculateHaversineKm = (lat1, lon1, lat2, lon2) => {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return 0;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Estimate road distance & motor time from Haversine
const calculateHaversineEstimate = (lat1, lon1, lat2, lon2) => {
  const straightKm = calculateHaversineKm(lat1, lon1, lat2, lon2);
  // Urban road factor ~1.25x
  const roadKm = straightKm * 1.25;
  // Estimated average motor speed ~25 km/h in urban area
  const motorMinutes = Math.max(1, Math.round((roadKm / 25) * 60));
  return {
    distanceKm: parseFloat(roadKm.toFixed(1)),
    motorMinutes,
    straightKm: parseFloat(straightKm.toFixed(1))
  };
};

// Fetch real road route geometry & duration from OSRM API with fallback
const fetchOSRMRoute = async (lat1, lon1, lat2, lon2) => {
  const fallback = calculateHaversineEstimate(lat1, lon1, lat2, lon2);
  const fallbackCoords = [[lat1, lon1], [lat2, lon2]];

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`OSRM API error: ${res.status}`);
    const data = await res.json();

    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distKm = parseFloat((route.distance / 1000).toFixed(1));
      // Motorcycle speed factor relative to driving duration (~0.85)
      const motorMins = Math.max(1, Math.round((route.duration / 60) * 0.85));
      const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

      return {
        distanceKm: distKm,
        motorMinutes: motorMins,
        routeCoords: coords,
        isOSRM: true
      };
    }
  } catch (err) {
    console.warn("OSRM routing fallback to Haversine estimate:", err.message);
  }

  return {
    distanceKm: fallback.distanceKm,
    motorMinutes: fallback.motorMinutes,
    routeCoords: fallbackCoords,
    isOSRM: false
  };
};

const CITY_GEOCODING_FALLBACKS = {
  "jakarta": { lat: -6.2088, lng: 106.8456 },
  "jakarta selatan": { lat: -6.2615, lng: 106.8106 },
  "jakarta timur": { lat: -6.2250, lng: 106.9004 },
  "jakarta barat": { lat: -6.1683, lng: 106.7589 },
  "jakarta utara": { lat: -6.1384, lng: 106.8640 },
  "jakarta pusat": { lat: -6.1805, lng: 106.8283 },
  "bekasi": { lat: -6.2415, lng: 106.9924 },
  "tangerang": { lat: -6.1702, lng: 106.6403 },
  "tangerang selatan": { lat: -6.2886, lng: 106.7179 },
  "depok": { lat: -6.4025, lng: 106.7942 },
  "bogor": { lat: -6.5971, lng: 106.7900 },
  "bandung": { lat: -6.9175, lng: 107.6191 },
  "surabaya": { lat: -7.2504, lng: 112.7688 },
  "malang": { lat: -7.9666, lng: 112.6326 },
  "semarang": { lat: -6.9667, lng: 110.4167 },
  "yogyakarta": { lat: -7.7956, lng: 110.3695 },
  "solo": { lat: -7.5755, lng: 110.8243 },
  "surakarta": { lat: -7.5755, lng: 110.8243 },
  "medan": { lat: 3.5800, lng: 98.6700 },
  "palembang": { lat: -2.9909, lng: 104.7566 },
  "pekanbaru": { lat: 0.5071, lng: 101.4478 },
  "padang": { lat: -0.9471, lng: 100.4172 },
  "lampung": { lat: -5.4500, lng: 105.2667 },
  "bandar lampung": { lat: -5.4500, lng: 105.2667 },
  "denpasar": { lat: -8.6500, lng: 115.2167 },
  "bali": { lat: -8.6500, lng: 115.2167 },
  "makassar": { lat: -5.1477, lng: 119.4327 },
  "manado": { lat: 1.4748, lng: 124.8428 },
  "balikpapan": { lat: -1.2379, lng: 116.8529 },
  "samarinda": { lat: -0.5022, lng: 117.1536 },
  "pontianak": { lat: -0.0263, lng: 109.3425 },
  "banjarmasin": { lat: -3.3167, lng: 114.5900 },
  "default": { lat: -2.5489, lng: 118.0149 }
};

// Helper to parse CSV content into structured tutor records
const parseTutorsFromCSV = (csvText, programName) => {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false
  });

  const records = [];

  parsed.data.forEach((row, idx) => {
    const rawTutor = (row["Tutor"] || row["Nama Tutor"] || row["Nama"] || "").trim();
    if (!rawTutor) return; // IGNORE rows without tutors as requested

    const branchName = (row["Name"] || row["Nama Cabang"] || row["Cabang"] || "").trim();
    const uniqueName = (row["Unique Name"] || row["Kode Cabang"] || branchName || "Cabang Baru").trim();
    const regional = (row["First Name"] || row["Regional"] || row["Kota"] || row["City"] || "Lainnya").trim();
    const academy = (row["Academy Ruangguru"] || row["Academy"] || "Brain Academy").trim();
    const address = (row["Address"] || row["Alamat"] || "").trim();
    
    let lat = parseFloat(row["Latitude"] || row["Lat"]);
    let lng = parseFloat(row["Longitude"] || row["Lng"] || row["Long"]);

    if (isNaN(lat) || isNaN(lng)) {
      const regKey = regional.toLowerCase().trim();
      const fallback = CITY_GEOCODING_FALLBACKS[regKey] || CITY_GEOCODING_FALLBACKS["default"];
      lat = fallback.lat;
      lng = fallback.lng;
    }

    const tutorList = rawTutor
      .split(/[\r\n,]+/)
      .map(t => t.strip ? t.strip() : t.trim())
      .filter(t => t.length > 0);

    tutorList.forEach((tutorName, subIdx) => {
      records.push({
        id: `${programName}-${idx}-${subIdx}-${tutorName.replace(/\s+/g, '_')}`,
        tutorName,
        program: programName,
        branchName,
        uniqueName,
        regional,
        academy,
        address,
        lat,
        lng
      });
    });
  });

  return records;
};

// Component for individual multi-branch tutor card with real OSRM road distance & motor time
function TutorCardItem({ mt, tutorSelections, setTutorSelections, branchMapGroups, handleSelectRoute, calculateHaversineEstimate, fetchOSRMRoute }) {
  const sel = tutorSelections[mt.tutorName] || {
    originKey: mt.branches[0]?.key,
    targetKey: mt.branches[1]?.key || mt.branches[0]?.key
  };

  const curOrigin = mt.branches.find(b => b.key === sel.originKey) || mt.branches[0];
  const curTarget = mt.branches.find(b => b.key === sel.targetKey) || mt.branches[1] || mt.branches[0];

  const [cardRoute, setCardRoute] = useState(() =>
    calculateHaversineEstimate(curOrigin.origLat, curOrigin.origLng, curTarget.origLat, curTarget.origLng)
  );

  useEffect(() => {
    let isMounted = true;
    if (!curOrigin || !curTarget || curOrigin.key === curTarget.key) {
      setCardRoute({ distanceKm: 0, motorMinutes: 0, isOSRM: false });
      return;
    }

    // Set instant Haversine estimate first
    const instant = calculateHaversineEstimate(curOrigin.origLat, curOrigin.origLng, curTarget.origLat, curTarget.origLng);
    setCardRoute(instant);

    // Fetch real OSRM road distance asynchronously
    fetchOSRMRoute(curOrigin.origLat, curOrigin.origLng, curTarget.origLat, curTarget.origLng).then(res => {
      if (isMounted && res) {
        setCardRoute(res);
      }
    });

    return () => { isMounted = false; };
  }, [curOrigin.key, curTarget.key]);

  return (
    <div
      style={{
        flexShrink: 0,
        border: "1.5px solid #E0E7FF",
        borderRadius: 12,
        padding: 12,
        background: "#FFFFFF",
        boxShadow: "0 2px 6px rgba(99, 102, 241, 0.06)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 13, color: "#1E1B4B" }}>🧑‍🏫 {mt.tutorName}</span>
        <span style={{ fontSize: 10, fontWeight: 800, background: "#EEF2FF", color: "#4F46E5", padding: "2px 8px", borderRadius: 99 }}>
          {mt.branchCount} Cabang
        </span>
      </div>

      {/* Interactive Branch List */}
      <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "8px 10px", marginBottom: 8, fontSize: 11, border: "1px solid #F1F5F9" }}>
        <div style={{ fontWeight: 700, color: "#475569", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Daftar Cabang ({mt.branches.length}):</span>
          <span style={{ fontSize: 10, color: "#6366F1" }}>Pilih Asal & Tujuan</span>
        </div>

        {mt.branches.map((b, bIdx) => {
          const isAsal = b.key === curOrigin.key;
          const isTujuan = b.key === curTarget.key;

          return (
            <div
              key={bIdx}
              style={{
                display: "flex",
                justify: "space-between",
                alignItems: "center",
                padding: "4px 8px",
                borderRadius: 6,
                marginBottom: 4,
                background: isAsal ? "#EEF2FF" : isTujuan ? "#F0FDF4" : "#FFFFFF",
                border: `1px solid ${isAsal ? "#C7D2FE" : isTujuan ? "#BBF7D0" : "#E2E8F0"}`
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {isAsal && <span style={{ fontSize: 9, background: "#4F46E5", color: "#FFF", borderRadius: 4, padding: "1px 5px", fontWeight: 800 }}>ASAL</span>}
                {isTujuan && <span style={{ fontSize: 9, background: "#166534", color: "#FFF", borderRadius: 4, padding: "1px 5px", fontWeight: 800 }}>TUJUAN</span>}
                <span style={{ color: "#0F172A", fontWeight: 600, fontSize: 11 }}>{b.uniqueName}</span>
              </div>

              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {!isAsal && (
                  <button
                    onClick={() => setTutorSelections(prev => ({ ...prev, [mt.tutorName]: { originKey: b.key, targetKey: curTarget.key } }))}
                    style={{ background: "#E0E7FF", color: "#3730A3", border: "none", borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                  >
                    Set Asal
                  </button>
                )}
                {!isTujuan && (
                  <button
                    onClick={() => setTutorSelections(prev => ({ ...prev, [mt.tutorName]: { originKey: curOrigin.key, targetKey: b.key } }))}
                    style={{ background: "#DCFCE7", color: "#166534", border: "none", borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                  >
                    Set Tujuan
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Interactive Dropdowns */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px dashed #CBD5E1" }}>
          <div>
            <label style={{ fontSize: 9, fontWeight: 800, color: "#4F46E5", textTransform: "uppercase", display: "block", marginBottom: 2 }}>📍 Dari (Asal):</label>
            <select
              value={curOrigin.key}
              onChange={(e) => setTutorSelections(prev => ({ ...prev, [mt.tutorName]: { originKey: e.target.value, targetKey: curTarget.key } }))}
              style={{ width: "100%", padding: "4px 6px", fontSize: 11, borderRadius: 6, border: "1px solid #CBD5E1", background: "#FFFFFF", fontWeight: 600, cursor: "pointer" }}
            >
              {mt.branches.map(b => (
                <option key={b.key} value={b.key}>{b.uniqueName}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 9, fontWeight: 800, color: "#166534", textTransform: "uppercase", display: "block", marginBottom: 2 }}>🏁 Ke (Tujuan):</label>
            <select
              value={curTarget.key}
              onChange={(e) => setTutorSelections(prev => ({ ...prev, [mt.tutorName]: { originKey: curOrigin.key, targetKey: e.target.value } }))}
              style={{ width: "100%", padding: "4px 6px", fontSize: 11, borderRadius: 6, border: "1px solid #CBD5E1", background: "#FFFFFF", fontWeight: 600, cursor: "pointer" }}
            >
              {mt.branches.map(b => (
                <option key={b.key} value={b.key}>{b.uniqueName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Route distance & action button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6, borderTop: "1px dashed #E2E8F0" }}>
        <div style={{ fontSize: 11, color: "#64748B" }}>
          📏 <b>{cardRoute.distanceKm} km</b> · 🛵 <b>~{cardRoute.motorMinutes} m</b>
          {cardRoute.isOSRM && <span style={{ color: "#059669", marginLeft: 4, fontWeight: 700 }} title="Rute Jalan Riil OSRM">✓</span>}
        </div>
        <button
          onClick={() => {
            const b1 = branchMapGroups.find(x => x.key === curOrigin.key) || curOrigin;
            const b2 = branchMapGroups.find(x => x.key === curTarget.key) || curTarget;
            handleSelectRoute(b1, b2);
          }}
          disabled={curOrigin.key === curTarget.key}
          style={{
            background: curOrigin.key === curTarget.key ? "#CBD5E1" : "linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 700,
            cursor: curOrigin.key === curTarget.key ? "not-allowed" : "pointer"
          }}
        >
          🗺️ Lihat Rute
        </button>
      </div>
    </div>
  );
}

export default function OfflinePage() {
  const [linguaData, setLinguaData] = useState([]);
  const [intertestData, setIntertestData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Filter States
  const [selectedProgram, setSelectedProgram] = useState("All"); // All, Lingua, Intertest
  const [selectedRegional, setSelectedRegional] = useState("All");
  const [selectedBranchKey, setSelectedBranchKey] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("map"); // 'map' or 'table'
  const [expandedRegional, setExpandedRegional] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  // Route & Distance Calculation State
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [sidebarTab, setSidebarTab] = useState("branches"); // 'branches' or 'multiTutors'
  const [tutorSelections, setTutorSelections] = useState({}); // { [tutorName]: { originKey, targetKey } }

  // Trigger route selection between two branches
  const handleSelectRoute = async (origin, target) => {
    if (!origin || !target || origin.key === target.key) return;

    // 1. Instantly set Haversine estimate fallback while fetching OSRM
    const instantEst = calculateHaversineEstimate(origin.origLat, origin.origLng, target.origLat, target.origLng);
    const fallbackCoords = [[origin.origLat, origin.origLng], [target.origLat, target.origLng]];

    setSelectedRoute({
      origin,
      target,
      distanceKm: instantEst.distanceKm,
      motorMinutes: instantEst.motorMinutes,
      routeCoords: fallbackCoords,
      isLoading: true,
      isOSRM: false
    });

    // 2. Fetch OSRM real road geometry in background
    const osrmResult = await fetchOSRMRoute(origin.origLat, origin.origLng, target.origLat, target.origLng);

    setSelectedRoute({
      origin,
      target,
      distanceKm: osrmResult.distanceKm,
      motorMinutes: osrmResult.motorMinutes,
      routeCoords: osrmResult.routeCoords,
      isLoading: false,
      isOSRM: osrmResult.isOSRM
    });
  };

  // Download Template CSV Offline
  const downloadTemplate = () => {
    const header = "No,Academy Ruangguru,Name,Address,Unique Name,First Name,End Name,Tutor,Latitude,Longitude\n1,Brain Academy,Bekasi - Cibubur,\"Jl. Alternatif Cibubur No.35A\",BAC Cibubur,Bekasi,Cibubur,Siti Aisyah,-6.378482,106.9194989\n";
    const blob = new Blob([header], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Template_Offline_BAC_EAC.csv";
    link.click();
  };

  // Reset / Perbarui Data (Password Protected)
  const handleResetData = async () => {
    const userPass = window.prompt("Masukkan kata sandi untuk memperbarui/menghapus data:");
    if (userPass !== targaryenPassword.trim()) {
      alert("❌ Kata sandi salah! Tindakan ditolak.");
      return;
    }

    if (!window.confirm("PERINGATAN: Anda yakin ingin MENGHAPUS SEMUA DATA teacher di seluruh aplikasi? Tindakan ini tidak dapat dibatalkan!")) return;

    setIsResetting(true);
    setLinguaData([]);
    setIntertestData([]);
    try {
      await deleteAllTeachers();
      alert("✅ Semua data berhasil dihapus / diperbarui.");
    } catch (e) {
      console.error("Gagal mereset data:", e);
      alert("❌ Gagal mereset data: " + e.message);
    } finally {
      setIsResetting(false);
    }
  };

  const fileInputLinguaRef = useRef(null);
  const fileInputIntertestRef = useRef(null);

  // Auto load default CSVs on initial mount
  useEffect(() => {
    let isMounted = true;
    const fetchDefaultCSVs = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const [resLingua, resIntertest] = await Promise.all([
          fetch("/csv/BAC&EAC Lingua.csv").catch(() => null),
          fetch("/csv/BAC&EAC Intertest.csv").catch(() => null)
        ]);

        if (resLingua && resLingua.ok) {
          const txtLingua = await resLingua.text();
          const linguaParsed = parseTutorsFromCSV(txtLingua, "Lingua");
          if (isMounted) setLinguaData(linguaParsed);
        }

        if (resIntertest && resIntertest.ok) {
          const txtIntertest = await resIntertest.text();
          const intertestParsed = parseTutorsFromCSV(txtIntertest, "Intertest");
          if (isMounted) setIntertestData(intertestParsed);
        }
      } catch (err) {
        console.error("Error loading initial CSV files:", err);
        if (isMounted) setErrorMsg("Gagal memuat data CSV default: " + err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDefaultCSVs();
    return () => { isMounted = false; };
  }, []);

  // Handle Dynamic Upload CSV Lingua
  const handleUploadLingua = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const csvText = Papa.unparse(results.data);
        const parsed = parseTutorsFromCSV(csvText, "Lingua");
        setLinguaData(parsed);
        alert(`Berhasil mengunggah ${parsed.length} data tutor Lingua dari CSV!`);
      },
      error: (err) => {
        alert("Gagal membaca file CSV Lingua: " + err.message);
      }
    });
    e.target.value = "";
  };

  // Handle Dynamic Upload CSV Intertest
  const handleUploadIntertest = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const csvText = Papa.unparse(results.data);
        const parsed = parseTutorsFromCSV(csvText, "Intertest");
        setIntertestData(parsed);
        alert(`Berhasil mengunggah ${parsed.length} data tutor Intertest dari CSV!`);
      },
      error: (err) => {
        alert("Gagal membaca file CSV Intertest: " + err.message);
      }
    });
    e.target.value = "";
  };

  // Combined tutor list
  const allTutorRecords = useMemo(() => {
    return [...linguaData, ...intertestData];
  }, [linguaData, intertestData]);

  // List of unique regionals
  const regionalOptions = useMemo(() => {
    const set = new Set();
    allTutorRecords.forEach(r => {
      if (r.regional) set.add(r.regional);
    });
    return Array.from(set).sort();
  }, [allTutorRecords]);

  // Check if search matches exist globally across all regionals
  const globalSearchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return allTutorRecords.filter(item => {
      if (selectedProgram !== "All" && item.program !== selectedProgram) return false;
      const matchName = item.tutorName.toLowerCase().includes(q);
      const matchBranch = item.uniqueName.toLowerCase().includes(q) || item.branchName.toLowerCase().includes(q);
      const matchRegional = item.regional.toLowerCase().includes(q);
      const matchAddress = item.address.toLowerCase().includes(q);
      return matchName || matchBranch || matchRegional || matchAddress;
    });
  }, [allTutorRecords, selectedProgram, searchQuery]);

  // Filtered tutors based on current active filters
  const filteredTutors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return allTutorRecords.filter(item => {
      if (selectedProgram !== "All" && item.program !== selectedProgram) return false;
      if (selectedRegional !== "All" && item.regional !== selectedRegional) return false;
      
      if (q !== "") {
        const matchName = item.tutorName.toLowerCase().includes(q);
        const matchBranch = item.uniqueName.toLowerCase().includes(q) || item.branchName.toLowerCase().includes(q);
        const matchRegional = item.regional.toLowerCase().includes(q);
        const matchAddress = item.address.toLowerCase().includes(q);
        if (!matchName && !matchBranch && !matchRegional && !matchAddress) return false;
      }
      return true;
    });
  }, [allTutorRecords, selectedProgram, selectedRegional, searchQuery]);

  // Group filtered data by branch for Map markers
  const branchMapGroups = useMemo(() => {
    const map = {};

    filteredTutors.forEach(item => {
      const key = `${item.uniqueName}-${item.regional}`;
      if (!map[key]) {
        map[key] = {
          key,
          uniqueName: item.uniqueName,
          branchName: item.branchName,
          regional: item.regional,
          academy: item.academy,
          address: item.address,
          origLat: item.lat,
          origLng: item.lng,
          lat: item.lat,
          lng: item.lng,
          linguaTutors: [],
          intertestTutors: []
        };
      }
      if (item.program === "Lingua") {
        if (!map[key].linguaTutors.includes(item.tutorName)) {
          map[key].linguaTutors.push(item.tutorName);
        }
      } else if (item.program === "Intertest") {
        if (!map[key].intertestTutors.includes(item.tutorName)) {
          map[key].intertestTutors.push(item.tutorName);
        }
      }
    });

    const groups = Object.values(map);

    // Apply Radial Spiderfy Offset for overlapping branch markers in same area!
    const locationMap = {};
    groups.forEach(b => {
      const locKey = `${b.origLat.toFixed(3)},${b.origLng.toFixed(3)}`;
      if (!locationMap[locKey]) locationMap[locKey] = [];
      locationMap[locKey].push(b);
    });

    const spiderfied = [];
    Object.values(locationMap).forEach(group => {
      if (group.length === 1) {
        spiderfied.push(group[0]);
      } else {
        const radiusOffset = 0.015; // visual spread offset
        group.forEach((item, index) => {
          const angle = (index / group.length) * 2 * Math.PI;
          spiderfied.push({
            ...item,
            lat: item.origLat + radiusOffset * Math.sin(angle),
            lng: item.origLng + radiusOffset * Math.cos(angle),
            isOffset: true
          });
        });
      }
    });

    return spiderfied;
  }, [filteredTutors]);

  // City Level Cluster Aggregation when Zoomed Out (selectedRegional === 'All' and map level)
  const cityClusterGroups = useMemo(() => {
    const map = {};
    branchMapGroups.forEach(b => {
      const reg = b.regional || "Lainnya";
      if (!map[reg]) {
        map[reg] = {
          regional: reg,
          branchCount: 0,
          latSum: 0,
          lngSum: 0,
          linguaCount: 0,
          intertestCount: 0,
          branches: []
        };
      }
      map[reg].branchCount += 1;
      map[reg].latSum += b.origLat;
      map[reg].lngSum += b.origLng;
      map[reg].linguaCount += b.linguaTutors.length;
      map[reg].intertestCount += b.intertestTutors.length;
      map[reg].branches.push(b);
    });

    return Object.values(map).map(c => ({
      ...c,
      lat: c.latSum / c.branchCount,
      lng: c.lngSum / c.branchCount,
      totalTutors: c.linguaCount + c.intertestCount
    }));
  }, [branchMapGroups]);

  // Group branches by Regional for Sidebar View
  const regionalSidebarGroups = useMemo(() => {
    const map = {};
    branchMapGroups.forEach(b => {
      const reg = b.regional || "Lainnya";
      if (!map[reg]) {
        map[reg] = {
          regional: reg,
          branches: [],
          totalLingua: 0,
          totalIntertest: 0,
          totalTutors: 0
        };
      }
      map[reg].branches.push(b);
      map[reg].totalLingua += b.linguaTutors.length;
      map[reg].totalIntertest += b.intertestTutors.length;
      map[reg].totalTutors += (b.linguaTutors.length + b.intertestTutors.length);
    });

    return Object.values(map).sort((a, b) => b.totalTutors - a.totalTutors);
  }, [branchMapGroups]);

  // Identify tutors assigned to multiple branches
  const multiBranchTutors = useMemo(() => {
    const tutorMap = {};

    allTutorRecords.forEach(record => {
      const name = record.tutorName.trim();
      if (!name) return;
      if (!tutorMap[name]) tutorMap[name] = new Map();
      const bKey = `${record.uniqueName}-${record.regional}`;
      if (!tutorMap[name].has(bKey)) {
        tutorMap[name].set(bKey, {
          uniqueName: record.uniqueName,
          regional: record.regional,
          program: record.program,
          origLat: record.lat,
          origLng: record.lng,
          key: bKey
        });
      }
    });

    const results = [];
    Object.entries(tutorMap).forEach(([tutorName, branchEntries]) => {
      if (branchEntries.size >= 2) {
        const branches = Array.from(branchEntries.values());
        const b1 = branches[0];
        const b2 = branches[1];
        const est = calculateHaversineEstimate(b1.origLat, b1.origLng, b2.origLat, b2.origLng);

        results.push({
          tutorName,
          branches,
          branchCount: branches.length,
          distKm: est.distanceKm,
          motorMinutes: est.motorMinutes
        });
      }
    });

    return results.sort((a, b) => b.branchCount - a.branchCount || a.distKm - b.distKm);
  }, [allTutorRecords]);

  // Helper to calculate top N nearest branches for a given branch
  const getNearestBranches = (sourceBranch, limit = 5) => {
    if (!sourceBranch || !branchMapGroups) return [];
    return branchMapGroups
      .filter(b => b.key !== sourceBranch.key)
      .map(b => {
        const est = calculateHaversineEstimate(sourceBranch.origLat, sourceBranch.origLng, b.origLat, b.origLng);
        return {
          ...b,
          distKm: est.distanceKm,
          motorMinutes: est.motorMinutes
        };
      })
      .sort((a, b) => a.distKm - b.distKm)
      .slice(0, limit);
  };

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalTutors = filteredTutors.length;
    const linguaCount = filteredTutors.filter(t => t.program === "Lingua").length;
    const intertestCount = filteredTutors.filter(t => t.program === "Intertest").length;
    const totalBranches = branchMapGroups.length;

    return { totalTutors, linguaCount, intertestCount, totalBranches };
  }, [filteredTutors, branchMapGroups]);

  // Target coordinates & zoom for active branch selection
  const activeBranch = useMemo(() => {
    if (!selectedBranchKey) return null;
    return branchMapGroups.find(b => b.key === selectedBranchKey);
  }, [selectedBranchKey, branchMapGroups]);

  const mapCenter = useMemo(() => {
    if (activeBranch && !isNaN(activeBranch.lat) && !isNaN(activeBranch.lng)) {
      return [activeBranch.lat, activeBranch.lng];
    }
    if (selectedRegional !== "All") {
      const regBranches = branchMapGroups.filter(b => b.regional === selectedRegional);
      if (regBranches.length > 0 && !isNaN(regBranches[0].lat) && !isNaN(regBranches[0].lng)) {
        return [regBranches[0].lat, regBranches[0].lng];
      }
    }
    if (branchMapGroups.length > 0 && !isNaN(branchMapGroups[0].lat) && !isNaN(branchMapGroups[0].lng)) {
      return [branchMapGroups[0].lat, branchMapGroups[0].lng];
    }
    return [-2.5, 118]; // Default Indonesia view
  }, [activeBranch, selectedRegional, branchMapGroups]);

  const mapZoom = useMemo(() => {
    if (activeBranch) return 13;
    if (selectedRegional !== "All" && branchMapGroups.length > 0) return 10;
    return 5;
  }, [activeBranch, selectedRegional, branchMapGroups]);

  // Check if regional filter is blocking search results
  const showGlobalSearchSuggestion = useMemo(() => {
    return (
      searchQuery.trim() !== "" &&
      selectedRegional !== "All" &&
      filteredTutors.length === 0 &&
      globalSearchMatches.length > 0
    );
  }, [searchQuery, selectedRegional, filteredTutors, globalSearchMatches]);

  const handleExportPDF = () => {
    exportToPdf({
      title: "Offline BAC & EAC Tutor Mapping Data",
      subtitle: `Program: ${selectedProgram} | Regional: ${selectedRegional} | Total Data: ${filteredTutors.length}`,
      fileName: `Offline_Tutors_${selectedProgram}_${Date.now()}`,
      columns: [
        { header: "Nama Tutor", key: "tutorName" },
        { header: "Cabang (Unique)", key: "uniqueName" },
        { header: "Nama Cabang", key: "branchName" },
        { header: "Regional", key: "regional" },
        { header: "Program", key: "program" },
        { header: "Alamat", key: "address" },
      ],
      data: filteredTutors,
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      fileName: `Offline_Tutors_${selectedProgram}_${Date.now()}`,
      sheetName: "Offline Tutors",
      columns: [
        { header: "Nama Tutor", key: "tutorName" },
        { header: "Cabang (Unique)", key: "uniqueName" },
        { header: "Nama Cabang", key: "branchName" },
        { header: "Regional", key: "regional" },
        { header: "Program", key: "program" },
        { header: "Alamat", key: "address" },
      ],
      data: filteredTutors,
    });
  };

  return (
    <div style={{ paddingBottom: 40, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Header Bar */}
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0, letterSpacing: "-0.02em" }}>
            Offline BAC & EAC Tutor Mapping
          </h1>
          <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>
            Visualisasi sebaran tutor Lingua & Intertest seluruh cabang dengan Split-View Panel & Overlap Resolution
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <ExportButtons onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} />
          <button disabled={isResetting} onClick={handleResetData} style={{
            background: "#FEF2F2", color: "#EF4444", border: "1.5px solid #FECACA", borderRadius: 10,
            padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: isResetting ? "not-allowed" : "pointer", opacity: isResetting ? 0.6 : 1
          }}>
            {isResetting ? "Memproses..." : "🗑 Perbarui Data"}
          </button>

          <button onClick={downloadTemplate} style={{
            background: "#F1F5F9", color: "#475569", border: "1.5px solid #E2E8F0", borderRadius: 10,
            padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer"
          }}>
            📥 Template CSV
          </button>

          <input
            type="file"
            accept=".csv"
            ref={fileInputLinguaRef}
            onChange={handleUploadLingua}
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileInputLinguaRef.current?.click()}
            style={{
              background: "linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)"
            }}
          >
            <span>📤</span> Upload CSV Lingua
          </button>

          <input
            type="file"
            accept=".csv"
            ref={fileInputIntertestRef}
            onChange={handleUploadIntertest}
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileInputIntertestRef.current?.click()}
            style={{
              background: "linear-gradient(135deg, #9333EA 0%, #7E22CE 100%)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 12px rgba(147, 51, 234, 0.25)"
            }}
          >
            <span>📤</span> Upload CSV Intertest
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px 20px", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Total Cabang Aktif</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0F172A" }}>{summaryStats.totalBranches}</div>
          <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Dengan Tutor Terdaftar</div>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px 20px", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4F46E5", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Total Tutor Displayed</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#4F46E5" }}>{summaryStats.totalTutors}</div>
          <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Jumlah Keseluruhan</div>
        </div>

        <div
          onClick={() => setSelectedProgram(selectedProgram === "Lingua" ? "All" : "Lingua")}
          style={{
            background: selectedProgram === "Lingua" ? "#EEF2FF" : "#FFFFFF",
            border: `1.5px solid ${selectedProgram === "Lingua" ? "#6366F1" : "#E2E8F0"}`,
            borderRadius: 14,
            padding: "16px 20px",
            cursor: "pointer",
            transition: "all 0.18s",
            boxShadow: selectedProgram === "Lingua" ? "0 0 0 3px rgba(99, 102, 241, 0.15)" : "0 2px 4px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4F46E5", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Tutor Lingua</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#312E81" }}>{summaryStats.linguaCount}</div>
          <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{selectedProgram === "Lingua" ? "✓ Filter Active" : "Klik untuk filter Lingua"}</div>
        </div>

        <div
          onClick={() => setSelectedProgram(selectedProgram === "Intertest" ? "All" : "Intertest")}
          style={{
            background: selectedProgram === "Intertest" ? "#F3E8FF" : "#FFFFFF",
            border: `1.5px solid ${selectedProgram === "Intertest" ? "#A855F7" : "#E2E8F0"}`,
            borderRadius: 14,
            padding: "16px 20px",
            cursor: "pointer",
            transition: "all 0.18s",
            boxShadow: selectedProgram === "Intertest" ? "0 0 0 3px rgba(168, 85, 247, 0.15)" : "0 2px 4px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9333EA", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Tutor Intertest</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#581C87" }}>{summaryStats.intertestCount}</div>
          <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{selectedProgram === "Intertest" ? "✓ Filter Active" : "Klik untuk filter Intertest"}</div>
        </div>
      </div>

      {/* Interactive Filter Control Panel */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, padding: "16px 20px", marginBottom: 20, boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", flex: 1 }}>
            
            {/* Filter Program Dropdown */}
            <div style={{ minWidth: 150 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748B", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Program</label>
              <select
                value={selectedProgram}
                onChange={e => setSelectedProgram(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13, background: "#F8FAFC", fontWeight: 600, color: "#0F172A", cursor: "pointer", outline: "none" }}
              >
                <option value="All">Semua Program</option>
                <option value="Lingua">Lingua Only</option>
                <option value="Intertest">Intertest Only</option>
              </select>
            </div>

            {/* Filter Regional Dropdown */}
            <div style={{ minWidth: 180 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748B", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Regional / Kota</label>
              <select
                value={selectedRegional}
                onChange={e => {
                  setSelectedRegional(e.target.value);
                  setSelectedBranchKey(null);
                  setExpandedRegional(e.target.value !== "All" ? e.target.value : null);
                }}
                style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13, background: "#F8FAFC", fontWeight: 600, color: "#0F172A", cursor: "pointer", outline: "none" }}
              >
                <option value="All">Semua Regional ({regionalOptions.length})</option>
                {regionalOptions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Search Input Box with Icon & Quick Clear */}
            <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748B", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Pencarian Tutor / Cabang
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 12, fontSize: 14, color: "#94A3B8" }}>🔍</span>
                <input
                  type="text"
                  placeholder="Ketik nama tutor, nama cabang, atau alamat..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 36px 9px 36px",
                    border: searchQuery ? "1.5px solid #6366F1" : "1.5px solid #E2E8F0",
                    borderRadius: 9,
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                    background: searchQuery ? "#FAF5FF" : "#FFFFFF",
                    transition: "all 0.15s"
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    style={{
                      position: "absolute",
                      right: 10,
                      background: "#E2E8F0",
                      border: "none",
                      borderRadius: "50%",
                      width: 18,
                      height: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      color: "#475569",
                      cursor: "pointer"
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* View Mode Switcher */}
            <div style={{ background: "#F1F5F9", borderRadius: 10, padding: 3, display: "flex", gap: 2 }}>
              <button
                onClick={() => setActiveTab("map")}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: activeTab === "map" ? "#FFFFFF" : "transparent",
                  color: activeTab === "map" ? "#4F46E5" : "#64748B",
                  boxShadow: activeTab === "map" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                }}
              >
                🗺️ Split Map & Cards
              </button>
              <button
                onClick={() => setActiveTab("table")}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: activeTab === "table" ? "#FFFFFF" : "transparent",
                  color: activeTab === "table" ? "#4F46E5" : "#64748B",
                  boxShadow: activeTab === "table" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
                }}
              >
                📊 Tabel Full
              </button>
            </div>

            {(selectedProgram !== "All" || selectedRegional !== "All" || searchQuery !== "" || selectedBranchKey !== null) && (
              <button
                onClick={() => {
                  setSelectedProgram("All");
                  setSelectedRegional("All");
                  setSelectedBranchKey(null);
                  setSearchQuery("");
                  setExpandedRegional(null);
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 9,
                  background: "#FEF2F2",
                  color: "#B91C1C",
                  border: "1px solid #FECACA",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Reset Filter ✖
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips / Badges */}
        {(selectedRegional !== "All" || selectedProgram !== "All" || searchQuery !== "") && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #F1F5F9", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>Filter Aktif:</span>
            {selectedProgram !== "All" && (
              <span style={{ background: "#EEF2FF", color: "#4F46E5", border: "1px solid #C7D2FE", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                Program: {selectedProgram}
              </span>
            )}
            {selectedRegional !== "All" && (
              <span style={{ background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                Regional: {selectedRegional}
              </span>
            )}
            {searchQuery && (
              <span style={{ background: "#F3E8FF", color: "#6B21A8", border: "1px solid #E9D5FF", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                Pencarian: "{searchQuery}"
              </span>
            )}
          </div>
        )}

        {/* Global Search Suggestion Banner when Regional Filter causes 0 results */}
        {showGlobalSearchSuggestion && (
          <div style={{ marginTop: 12, background: "#EFF6FF", border: "1.5px solid #BFDBFE", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontSize: 12, color: "#1E40AF" }}>
              💡 Tidak ditemukan hasil untuk <b>"{searchQuery}"</b> di regional <b>{selectedRegional}</b>. Namun ditemukan <b>{globalSearchMatches.length} tutor/cabang</b> di regional lain!
            </div>
            <button
              onClick={() => setSelectedRegional("All")}
              style={{
                background: "#2563EB",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              Cari di Semua Regional 🔍
            </button>
          </div>
        )}
      </div>

      {/* Main Split-View Content Area */}
      {activeTab === "map" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, alignItems: "stretch" }}>
          
          {/* Left Panel: Leaflet Map View */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #F1F5F9", background: "#FFFFFF" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.05em" }}>Peta Sebaran Cabang</span>
                <span style={{ fontSize: 11, background: "#EEF2FF", color: "#4F46E5", padding: "3px 10px", borderRadius: 12, fontWeight: 700 }}>
                  {branchMapGroups.length} Cabang Tampil
                </span>
              </div>

              <div style={{ display: "flex", gap: 10, fontSize: 11, fontWeight: 600 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4F46E5" }} />
                  <span>Lingua</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#9333EA" }} />
                  <span>Intertest</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#059669" }} />
                  <span>Both</span>
                </div>
              </div>
            </div>

            <div style={{ position: "relative", width: "100%", height: 620, flex: 1 }}>
              {/* Floating Active Route Info Pill Badge (Clean & Non-Intrusive) */}
              {selectedRoute && (
                <div style={{
                  position: "absolute",
                  top: 14,
                  left: 60,
                  zIndex: 1000,
                  background: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(12px)",
                  border: "1.5px solid #3B82F6",
                  borderRadius: 14,
                  padding: "8px 14px",
                  boxShadow: "0 8px 24px rgba(37, 99, 235, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  maxWidth: "calc(100% - 80px)",
                  flexWrap: "wrap"
                }}>
                  {/* Distance & Time Pills */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)", color: "#FFFFFF", padding: "4px 10px", borderRadius: 8, fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)" }}>
                      📏 {selectedRoute.distanceKm} km
                    </div>
                    <div style={{ background: "linear-gradient(135deg, #059669 0%, #047857 100%)", color: "#FFFFFF", padding: "4px 10px", borderRadius: 8, fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)" }}>
                      🛵 ~{selectedRoute.motorMinutes} m
                    </div>
                  </div>

                  {/* Origin & Destination Labels */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#0F172A", flexWrap: "wrap" }}>
                    <span style={{ background: "#EEF2FF", color: "#3730A3", padding: "3px 8px", borderRadius: 6, fontSize: 11 }}>
                      📍 {selectedRoute.origin.uniqueName}
                    </span>
                    <span style={{ color: "#3B82F6", fontWeight: 900 }}>➔</span>
                    <span style={{ background: "#F0FDF4", color: "#166534", padding: "3px 8px", borderRadius: 6, fontSize: 11 }}>
                      🏁 {selectedRoute.target.uniqueName}
                    </span>

                    {selectedRoute.isLoading ? (
                      <span style={{ fontSize: 10, color: "#D97706", fontWeight: 700 }}>⏳ Memuat OSRM...</span>
                    ) : selectedRoute.isOSRM ? (
                      <span style={{ fontSize: 10, background: "#DCFCE7", color: "#15803D", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>✓ Rute Riil OSRM</span>
                    ) : (
                      <span style={{ fontSize: 10, background: "#FEF3C7", color: "#B45309", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>⚡ Estimasi</span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: "auto" }}>
                    <button
                      onClick={() => handleSelectRoute(selectedRoute.target, selectedRoute.origin)}
                      title="Tukar Asal & Tujuan"
                      style={{ background: "#F1F5F9", color: "#334155", border: "1px solid #CBD5E1", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      🔁 Tukar
                    </button>
                    <button
                      onClick={() => setSelectedRoute(null)}
                      title="Tutup Rute"
                      style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {loading ? (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", color: "#64748B", fontSize: 14, fontWeight: 600 }}>
                  ⏳ Memuat peta dan data tutor...
                </div>
              ) : (
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  minZoom={4}
                  maxZoom={16}
                  scrollWheelZoom={true}
                  style={{ width: "100%", height: "100%", background: "#E5E7EB" }}
                >
                  <MapRecenter center={mapCenter} zoom={mapZoom} />
                  
                  {/* Render Polyline and fit bounds when a route is active */}
                  {selectedRoute && (
                    <>
                      <Polyline
                        positions={selectedRoute.routeCoords}
                        color="#2563EB"
                        weight={5}
                        opacity={0.85}
                        dashArray={selectedRoute.isLoading ? "8, 8" : null}
                      />
                      <MapRouteFitter routeCoords={selectedRoute.routeCoords} />
                    </>
                  )}

                  <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  />

                  {/* Render Cluster Pins on City Level or Branch Markers */}
                  {selectedRegional === "All" && searchQuery === "" ? (
                    /* Group pins by Regional City to avoid messy collisions when zoomed out */
                    cityClusterGroups.map((c) => {
                      const isSelected = expandedRegional === c.regional;
                      const radius = Math.min(16 + c.branchCount * 1.8, 28);

                      const markerHtml = `
                        <div style="
                          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
                          width: ${radius * 2}px;
                          height: ${radius * 2}px;
                          border-radius: 50%;
                          border: ${isSelected ? '3.5px solid #FEF08A' : '3px solid #FFFFFF'};
                          box-shadow: ${isSelected ? '0px 0px 0px 6px rgba(124, 58, 237, 0.45), 0px 6px 14px rgba(0,0,0,0.35)' : '0px 4px 10px rgba(0,0,0,0.3)'};
                          display: flex;
                          flex-direction: column;
                          align-items: center;
                          justify-content: center;
                          color: #FFFFFF;
                          font-family: Inter, sans-serif;
                          transition: all 0.2s;
                        ">
                          <span style="font-size: ${c.branchCount > 9 ? '11px' : '12px'}; font-weight: 800; line-height: 1;">${c.branchCount}</span>
                          <span style="font-size: 8px; font-weight: 700; opacity: 0.9; text-transform: uppercase;">Cabang</span>
                        </div>
                      `;

                      const customIcon = L.divIcon({
                        html: markerHtml,
                        className: "custom-city-cluster-marker",
                        iconSize: [radius * 2, radius * 2],
                        iconAnchor: [radius, radius]
                      });

                      return (
                        <Marker
                          key={c.regional}
                          position={[c.lat, c.lng]}
                          icon={customIcon}
                          eventHandlers={{
                            click: () => {
                              setSelectedRegional(c.regional);
                              setExpandedRegional(c.regional);
                            }
                          }}
                        >
                          <Tooltip direction="top" offset={[0, -radius]} opacity={1}>
                            <div style={{ fontWeight: 800, fontSize: 13 }}>📍 {c.regional}</div>
                            <div style={{ fontSize: 11, color: "#475569" }}>{c.branchCount} Cabang · {c.totalTutors} Tutor</div>
                            <div style={{ fontSize: 10, color: "#4F46E5", fontWeight: 700, marginTop: 2 }}>Klik untuk zoom & lihat cabang</div>
                          </Tooltip>
                        </Marker>
                      );
                    })
                  ) : (
                    /* Display Individual Branch Markers with Spiderfy Offset */
                    branchMapGroups.map((b) => {
                      const totalTutorsAtBranch = b.linguaTutors.length + b.intertestTutors.length;
                      const hasLingua = b.linguaTutors.length > 0;
                      const hasIntertest = b.intertestTutors.length > 0;
                      const isSelected = selectedBranchKey === b.key;

                      let markerBg = "#059669"; // both
                      if (hasLingua && !hasIntertest) markerBg = "#4F46E5";
                      if (hasIntertest && !hasLingua) markerBg = "#9333EA";

                      const baseRadius = Math.min(13 + totalTutorsAtBranch * 1.5, 22);
                      const radius = isSelected ? baseRadius + 4 : baseRadius;

                      const markerHtml = `
                        <div style="
                          background-color: ${markerBg};
                          width: ${radius * 2}px;
                          height: ${radius * 2}px;
                          border-radius: 50%;
                          border: ${isSelected ? '3.5px solid #FEF08A' : '2.5px solid #FFFFFF'};
                          box-shadow: ${isSelected ? '0px 0px 0px 6px rgba(79, 70, 229, 0.45), 0px 6px 12px rgba(0,0,0,0.4)' : '0px 3px 8px rgba(0,0,0,0.3)'};
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          color: #FFFFFF;
                          font-family: Inter, sans-serif;
                          font-size: ${isSelected ? '12px' : '11px'};
                          font-weight: 800;
                          transition: all 0.2s;
                          transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
                        ">
                          ${totalTutorsAtBranch}
                        </div>
                      `;

                      const customIcon = L.divIcon({
                        html: markerHtml,
                        className: "custom-branch-marker",
                        iconSize: [radius * 2, radius * 2],
                        iconAnchor: [radius, radius]
                      });

                      return (
                        <Marker
                          key={b.key}
                          position={[b.lat, b.lng]}
                          icon={customIcon}
                          eventHandlers={{
                            click: () => {
                              setSelectedBranchKey(b.key);
                              setExpandedRegional(b.regional);
                            }
                          }}
                        >
                          <Tooltip direction="top" offset={[0, -radius]} opacity={1}>
                            <div style={{ fontWeight: 700, fontSize: 12 }}>{b.uniqueName}</div>
                            <div style={{ fontSize: 11, color: "#475569" }}>{b.regional} · {totalTutorsAtBranch} Tutor</div>
                          </Tooltip>

                          <Popup maxWidth={330}>
                            <div style={{ padding: "4px", fontFamily: "Inter, sans-serif" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>{b.uniqueName}</span>
                                <span style={{ fontSize: 10, background: "#F1F5F9", color: "#475569", borderRadius: 4, padding: "2px 6px", fontWeight: 700 }}>{b.academy}</span>
                              </div>
                              <div style={{ fontSize: 11, color: "#64748B", marginBottom: 8 }}>📍 {b.address || b.branchName}</div>

                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "#F8FAFC", padding: "8px 10px", borderRadius: 8, marginBottom: 10 }}>
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "#4F46E5", textTransform: "uppercase" }}>Lingua</div>
                                  <div style={{ fontSize: 15, fontWeight: 800, color: "#312E81" }}>{b.linguaTutors.length} Tutor</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9333EA", textTransform: "uppercase" }}>Intertest</div>
                                  <div style={{ fontSize: 15, fontWeight: 800, color: "#581C87" }}>{b.intertestTutors.length} Tutor</div>
                                </div>
                              </div>

                              {/* List Lingua Tutors */}
                              {b.linguaTutors.length > 0 && (
                                <div style={{ marginBottom: 8 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "#4F46E5", marginBottom: 4 }}>📘 Tutor Lingua:</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 75, overflowY: "auto" }}>
                                    {b.linguaTutors.map((name, i) => (
                                      <span key={i} style={{ background: "#EEF2FF", color: "#3730A3", borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 600 }}>{name}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* List Intertest Tutors */}
                              {b.intertestTutors.length > 0 && (
                                <div style={{ marginBottom: 10 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9333EA", marginBottom: 4 }}>📕 Tutor Intertest:</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 75, overflowY: "auto" }}>
                                    {b.intertestTutors.map((name, i) => (
                                      <span key={i} style={{ background: "#F3E8FF", color: "#6B21A8", borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 600 }}>{name}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Nearest Branches & Route Finder */}
                              <div style={{ paddingTop: 8, borderTop: "1px dashed #E2E8F0" }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: "#1E293B", marginBottom: 6 }}>
                                  🛵 Cabang Terdekat & Jarak:
                                </div>
                                
                                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 110, overflowY: "auto", marginBottom: 8 }}>
                                  {getNearestBranches(b, 4).map(nb => (
                                    <div
                                      key={nb.key}
                                      onClick={() => handleSelectRoute(b, nb)}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "5px 8px",
                                        background: "#F8FAFC",
                                        border: "1px solid #E2E8F0",
                                        borderRadius: 6,
                                        cursor: "pointer",
                                        fontSize: 11,
                                        transition: "all 0.15s"
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.background = "#EFF6FF"}
                                      onMouseLeave={e => e.currentTarget.style.background = "#F8FAFC"}
                                    >
                                      <span style={{ fontWeight: 700, color: "#1E40AF" }}>{nb.uniqueName}</span>
                                      <span style={{ fontSize: 10, color: "#475569", fontWeight: 600 }}>
                                        {nb.distKm} km · 🛵 ~{nb.motorMinutes} m
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", marginBottom: 3 }}>Pilih cabang tujuan lain:</div>
                                <select
                                  onChange={(e) => {
                                    const target = branchMapGroups.find(x => x.key === e.target.value);
                                    if (target) handleSelectRoute(b, target);
                                  }}
                                  defaultValue=""
                                  style={{ width: "100%", padding: "5px 8px", fontSize: 11, borderRadius: 6, border: "1px solid #CBD5E1", background: "#FFFFFF", cursor: "pointer" }}
                                >
                                  <option value="" disabled>-- Hitung Jarak ke Cabang... --</option>
                                  {branchMapGroups.filter(x => x.key !== b.key).map(x => (
                                    <option key={x.key} value={x.key}>
                                      {x.uniqueName} ({x.regional})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })
                  )}
                </MapContainer>
              )}
            </div>
          </div>

          {/* Right Panel: Interactive Sidebar List with Tabs */}
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", height: 672, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
            
            {/* Sidebar Tab Header */}
            <div style={{ padding: "10px 12px", borderBottom: "1px solid #F1F5F9", background: "#F8FAFC", display: "flex", gap: 6 }}>
              <button
                onClick={() => setSidebarTab("branches")}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  background: sidebarTab === "branches" ? "#FFFFFF" : "transparent",
                  color: sidebarTab === "branches" ? "#4F46E5" : "#64748B",
                  boxShadow: sidebarTab === "branches" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s"
                }}
              >
                📍 Cabang ({regionalSidebarGroups.length})
              </button>
              <button
                onClick={() => setSidebarTab("multiTutors")}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  background: sidebarTab === "multiTutors" ? "#FFFFFF" : "transparent",
                  color: sidebarTab === "multiTutors" ? "#9333EA" : "#64748B",
                  boxShadow: sidebarTab === "multiTutors" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s"
                }}
              >
                🔁 Multi-Cabang ({multiBranchTutors.length})
              </button>
            </div>

            {/* Tab Content 1: Branches grouped by region */}
            {sidebarTab === "branches" ? (
              <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                {regionalSidebarGroups.map(regGroup => {
                  const isExpanded = expandedRegional === regGroup.regional || selectedRegional === regGroup.regional || searchQuery.trim() !== "";

                  return (
                    <div
                      key={regGroup.regional}
                      style={{
                        flexShrink: 0,
                        border: "1.5px solid #E2E8F0",
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "#FFFFFF",
                        boxShadow: isExpanded ? "0 4px 12px rgba(99, 102, 241, 0.08)" : "0 1px 3px rgba(0,0,0,0.02)",
                        transition: "all 0.2s"
                      }}
                    >
                      {/* Collapsible Regional Card Header */}
                      <div
                        onClick={() => {
                          if (expandedRegional === regGroup.regional) {
                            setExpandedRegional(null);
                          } else {
                            setExpandedRegional(regGroup.regional);
                            setSelectedRegional(regGroup.regional);
                          }
                        }}
                        style={{
                          padding: "12px 14px",
                          background: isExpanded ? "#EEF2FF" : "#F8FAFC",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderBottom: isExpanded ? "1px solid #E0E7FF" : "none",
                          transition: "background 0.15s"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, color: "#6366F1" }}>{isExpanded ? "▼" : "▶"}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>📍 {regGroup.regional}</div>
                            <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{regGroup.branches.length} Cabang</div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {regGroup.totalLingua > 0 && (
                            <span style={{ fontSize: 10, background: "#EEF2FF", color: "#4F46E5", fontWeight: 700, padding: "2px 7px", borderRadius: 6 }}>
                              {regGroup.totalLingua} L
                            </span>
                          )}
                          {regGroup.totalIntertest > 0 && (
                            <span style={{ fontSize: 10, background: "#F3E8FF", color: "#9333EA", fontWeight: 700, padding: "2px 7px", borderRadius: 6 }}>
                              {regGroup.totalIntertest} I
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expandable Branch Cards */}
                      {isExpanded && (
                        <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6, background: "#FAFBFF" }}>
                          {regGroup.branches.map(b => {
                            const isSelected = selectedBranchKey === b.key;
                            const tot = b.linguaTutors.length + b.intertestTutors.length;
                            return (
                              <div
                                key={b.key}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBranchKey(b.key);
                                  setSelectedRegional(b.regional);
                                }}
                                style={{
                                  padding: "10px 12px",
                                  borderRadius: 8,
                                  border: `1.5px solid ${isSelected ? "#6366F1" : "#E2E8F0"}`,
                                  background: isSelected ? "#F5F3FF" : "#FFFFFF",
                                  cursor: "pointer",
                                  transition: "all 0.15s",
                                  boxShadow: isSelected ? "0 2px 8px rgba(99, 102, 241, 0.18)" : "0 1px 2px rgba(0,0,0,0.02)"
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                  <div style={{ fontWeight: 700, fontSize: 12, color: "#0F172A" }}>{b.uniqueName}</div>
                                  <span style={{ fontSize: 10, fontWeight: 800, background: isSelected ? "#6366F1" : "#E2E8F0", color: isSelected ? "#FFFFFF" : "#475569", padding: "2px 7px", borderRadius: 99 }}>
                                    {tot} Tutor
                                  </span>
                                </div>

                                {/* List of Tutors badges */}
                                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                                  {b.linguaTutors.map((t, idx) => (
                                    <span key={`l-${idx}`} style={{ fontSize: 10, background: "#EEF2FF", color: "#3730A3", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                                      📘 {t}
                                    </span>
                                  ))}
                                  {b.intertestTutors.map((t, idx) => (
                                    <span key={`i-${idx}`} style={{ fontSize: 10, background: "#F3E8FF", color: "#6B21A8", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                                      📕 {t}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {regionalSidebarGroups.length === 0 && (
                  <div style={{ padding: "32px 16px", textAlign: "center", color: "#94A3B8" }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Tidak ada cabang ditemukan</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>Coba ubah kriteria pencarian atau klik Reset Filter</div>
                    {(selectedRegional !== "All" || searchQuery !== "") && (
                      <button
                        onClick={() => { setSelectedRegional("All"); setSearchQuery(""); setExpandedRegional(null); }}
                        style={{ marginTop: 12, background: "#4F46E5", color: "#FFF", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      >
                        Reset Filter Pencarian
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Tab Content 2: Multi-Branch Tutors */
              <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                {multiBranchTutors.map((mt, idx) => {
                  const sel = tutorSelections[mt.tutorName] || {
                    originKey: mt.branches[0]?.key,
                    targetKey: mt.branches[1]?.key || mt.branches[0]?.key
                  };

                  const curOrigin = mt.branches.find(b => b.key === sel.originKey) || mt.branches[0];
                  const curTarget = mt.branches.find(b => b.key === sel.targetKey) || mt.branches[1] || mt.branches[0];

                  const curEst = calculateHaversineEstimate(
                    curOrigin.origLat, curOrigin.origLng,
                    curTarget.origLat, curTarget.origLng
                  );

                  return (
                    <div
                      key={idx}
                      style={{
                        flexShrink: 0,
                        border: "1.5px solid #E0E7FF",
                        borderRadius: 12,
                        padding: 12,
                        background: "#FFFFFF",
                        boxShadow: "0 2px 6px rgba(99, 102, 241, 0.06)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 13, color: "#1E1B4B" }}>🧑‍🏫 {mt.tutorName}</span>
                        <span style={{ fontSize: 10, fontWeight: 800, background: "#EEF2FF", color: "#4F46E5", padding: "2px 8px", borderRadius: 99 }}>
                          {mt.branchCount} Cabang
                        </span>
                      </div>

                      {/* Interactive Branch List */}
                      <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "8px 10px", marginBottom: 8, fontSize: 11, border: "1px solid #F1F5F9" }}>
                        <div style={{ fontWeight: 700, color: "#475569", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span>Daftar Cabang ({mt.branches.length}):</span>
                          <span style={{ fontSize: 10, color: "#6366F1" }}>Pilih Asal & Tujuan</span>
                        </div>

                        {mt.branches.map((b, bIdx) => {
                          const isAsal = b.key === curOrigin.key;
                          const isTujuan = b.key === curTarget.key;

                          return (
                            <div
                              key={bIdx}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "4px 8px",
                                borderRadius: 6,
                                marginBottom: 4,
                                background: isAsal ? "#EEF2FF" : isTujuan ? "#F0FDF4" : "#FFFFFF",
                                border: `1px solid ${isAsal ? "#C7D2FE" : isTujuan ? "#BBF7D0" : "#E2E8F0"}`
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {isAsal && <span style={{ fontSize: 9, background: "#4F46E5", color: "#FFF", borderRadius: 4, padding: "1px 5px", fontWeight: 800 }}>ASAL</span>}
                                {isTujuan && <span style={{ fontSize: 9, background: "#166534", color: "#FFF", borderRadius: 4, padding: "1px 5px", fontWeight: 800 }}>TUJUAN</span>}
                                <span style={{ color: "#0F172A", fontWeight: 600, fontSize: 11 }}>{b.uniqueName}</span>
                              </div>

                              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                {!isAsal && (
                                  <button
                                    onClick={() => setTutorSelections(prev => ({ ...prev, [mt.tutorName]: { originKey: b.key, targetKey: curTarget.key } }))}
                                    style={{ background: "#E0E7FF", color: "#3730A3", border: "none", borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                                  >
                                    Set Asal
                                  </button>
                                )}
                                {!isTujuan && (
                                  <button
                                    onClick={() => setTutorSelections(prev => ({ ...prev, [mt.tutorName]: { originKey: curOrigin.key, targetKey: b.key } }))}
                                    style={{ background: "#DCFCE7", color: "#166534", border: "none", borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                                  >
                                    Set Tujuan
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Interactive Dropdowns */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px dashed #CBD5E1" }}>
                          <div>
                            <label style={{ fontSize: 9, fontWeight: 800, color: "#4F46E5", textTransform: "uppercase", display: "block", marginBottom: 2 }}>📍 Dari (Asal):</label>
                            <select
                              value={curOrigin.key}
                              onChange={(e) => setTutorSelections(prev => ({ ...prev, [mt.tutorName]: { originKey: e.target.value, targetKey: curTarget.key } }))}
                              style={{ width: "100%", padding: "4px 6px", fontSize: 11, borderRadius: 6, border: "1px solid #CBD5E1", background: "#FFFFFF", fontWeight: 600, cursor: "pointer" }}
                            >
                              {mt.branches.map(b => (
                                <option key={b.key} value={b.key}>{b.uniqueName}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: 9, fontWeight: 800, color: "#166534", textTransform: "uppercase", display: "block", marginBottom: 2 }}>🏁 Ke (Tujuan):</label>
                            <select
                              value={curTarget.key}
                              onChange={(e) => setTutorSelections(prev => ({ ...prev, [mt.tutorName]: { originKey: curOrigin.key, targetKey: e.target.value } }))}
                              style={{ width: "100%", padding: "4px 6px", fontSize: 11, borderRadius: 6, border: "1px solid #CBD5E1", background: "#FFFFFF", fontWeight: 600, cursor: "pointer" }}
                            >
                              {mt.branches.map(b => (
                                <option key={b.key} value={b.key}>{b.uniqueName}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Route distance & action button */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6, borderTop: "1px dashed #E2E8F0" }}>
                        <div style={{ fontSize: 11, color: "#64748B" }}>
                          📏 <b>{curEst.distanceKm} km</b> · 🛵 <b>~{curEst.motorMinutes} m</b>
                        </div>
                        <button
                          onClick={() => {
                            const b1 = branchMapGroups.find(x => x.key === curOrigin.key) || curOrigin;
                            const b2 = branchMapGroups.find(x => x.key === curTarget.key) || curTarget;
                            handleSelectRoute(b1, b2);
                          }}
                          disabled={curOrigin.key === curTarget.key}
                          style={{
                            background: curOrigin.key === curTarget.key ? "#CBD5E1" : "linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: 6,
                            padding: "6px 12px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: curOrigin.key === curTarget.key ? "not-allowed" : "pointer"
                          }}
                        >
                          🗺️ Lihat Rute
                        </button>
                      </div>
                    </div>
                  );
                })}

                {multiBranchTutors.length === 0 && (
                  <div style={{ padding: "32px 16px", textAlign: "center", color: "#94A3B8" }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>👥</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Tidak ada tutor di multi-cabang</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>Semua tutor saat ini terdaftar di 1 cabang saja</div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Table View */
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #F1F5F9" }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0F172A" }}>Tabel Detail Tutor Offline</h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748B" }}>Menampilkan {filteredTutors.length} data tutor yang aktif mengajar di cabang</p>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>#</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>Nama Tutor</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>Program</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>Cabang BAC / EAC</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>Regional</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>Akademi</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>Alamat</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "#64748B", textTransform: "uppercase" }}>Koordinat</th>
                </tr>
              </thead>
              <tbody>
                {filteredTutors.map((item, index) => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#FAFBFF"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "14px 16px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 12 }}>{index + 1}</td>
                    <td style={{ padding: "14px 16px", fontWeight: 700, color: "#0F172A" }}>{item.tutorName}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          background: item.program === "Lingua" ? "#EEF2FF" : "#F3E8FF",
                          color: item.program === "Lingua" ? "#3730A3" : "#6B21A8",
                          border: `1px solid ${item.program === "Lingua" ? "#C7D2FE" : "#E9D5FF"}`,
                          borderRadius: 6,
                          padding: "3px 9px",
                          fontSize: 11,
                          fontWeight: 700
                        }}
                      >
                        {item.program}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 600, color: "#334155" }}>
                      {item.uniqueName}
                      {item.branchName && item.branchName !== item.uniqueName && (
                        <span style={{ display: "block", fontSize: 11, color: "#94A3B8", fontWeight: 400 }}>{item.branchName}</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", color: "#475569", fontWeight: 500 }}>{item.regional || "—"}</td>
                    <td style={{ padding: "14px 16px", color: "#64748B", fontSize: 12 }}>{item.academy}</td>
                    <td style={{ padding: "14px 16px", color: "#64748B", fontSize: 12, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.address}>
                      {item.address || "—"}
                    </td>
                    <td style={{ padding: "14px 16px", color: "#94A3B8", fontSize: 11, fontFamily: "monospace" }}>
                      {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                    </td>
                  </tr>
                ))}

                {filteredTutors.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "#94A3B8", fontSize: 13, fontWeight: 500 }}>
                      Tidak ada data tutor yang sesuai dengan kriteria filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

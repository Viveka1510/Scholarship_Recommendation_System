import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const API = "http://localhost:5000";

function Result() {
  const nav = useNavigate();

  const [matched,   setMatched]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [noProfile, setNoProfile] = useState(false);
  const [expanded,  setExpanded]  = useState({});

  // Detect guest mode once at render time
  const isGuest = localStorage.getItem("guestMode") === "true";

  useEffect(() => {
    const raw       = localStorage.getItem("studentData");
    const userId    = localStorage.getItem("userId");
    const profileId = localStorage.getItem("profileId");

    const isGuestMode = localStorage.getItem("guestMode") === "true";

    // ── No academic profile filled ────────────────────────────────
    if (!raw) {
      // Guest with no profile: load ALL scholarships unfiltered for browsing
      if (isGuestMode) {
        axios.get(`${API}/api/scholarships`)
          .then(res => {
            const all = (res.data.data || []).map(s => ({
              scholarship:     s,
              matchPercentage: null,
              grade:           null,
            }));
            setMatched(all);
            setLoading(false);
          })
          .catch(() => { setMatched([]); setLoading(false); });
        return;
      }
      setNoProfile(true);
      setLoading(false);
      return;
    }

    const studentData = JSON.parse(raw);
    if (!studentData.education || !studentData.marks || !studentData.community || !studentData.income) {
      setNoProfile(true);
      setLoading(false);
      return;
    }

    // ── CASE 1: Logged-in user → use Naive Bayes via backend ─────
    if (userId && profileId) {
      axios.get(`${API}/api/scholarships/recommendations`, {
        headers: { "x-user-id": userId },   // ← authMiddleware reads this
      })
      .then(res => {
        if (res.data.status) {
          const data = res.data.data || [];
          setMatched(data);
          localStorage.setItem("viewed", String(data.length));
        } else {
          setMatched([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("NB recommendations failed:", err);
        // ── Fallback: client-side eligibility filter ──────────────
        fallbackFilter(studentData);
      });

    } else {
      // ── CASE 2: Guest → always show ALL scholarships (no filter) ───────────
      axios.get(`${API}/api/scholarships`)
        .then(res => {
          const all = (res.data.data || []).map(s => ({
            scholarship:     s,
            matchPercentage: null,
            grade:           null,
          }));
          setMatched(all);
          localStorage.setItem("viewed", String(all.length));
          setLoading(false);
        })
        .catch(() => { setMatched([]); setLoading(false); });
    }

    function fallbackFilter(sd) {
      axios.get(`${API}/api/scholarships`)
        .then(res => {
          const all = res.data.data || [];
          const edu = sd.education?.toLowerCase();
          const marks  = Number(sd.marks);
          const income = Number(sd.income);
          const comm   = sd.community?.toLowerCase();

          const filtered = all.filter(s =>
            s.education?.toLowerCase() === edu &&
            marks  >= (s.minMarks  || 0) &&
            income <= (s.maxIncome || Infinity) &&
            (s.community === "all" || s.community?.toLowerCase() === comm)
          );

          const withPct = filtered.map(s => {
            let score = 0;
            if (s.education?.toLowerCase() === edu) score++;
            if (marks  >= s.minMarks)   score++;
            if (income <= (s.maxIncome || Infinity)) score++;
            if (s.community === "all" || s.community?.toLowerCase() === comm) score++;
            const pct = Math.round((score / 4) * 100);
            return {
              scholarship:     s,
              matchPercentage: pct,
              grade: pct >= 90 ? "Excellent" : pct >= 75 ? "Good" : "Fair",
            };
          });

          withPct.sort((a, b) => b.matchPercentage - a.matchPercentage);
          setMatched(withPct);
          localStorage.setItem("viewed", String(withPct.length));
          setLoading(false);
        })
        .catch(() => {
          setMatched([]);
          setLoading(false);
        });
    }
  }, []);

  // ── Apply handler ─────────────────────────────────────────────
  const handleApply = async (name) => {
    const isGuest   = localStorage.getItem("guestMode") === "true";
    const profileId = localStorage.getItem("profileId");

    // ── Guest: prompt login ──────────────────────────────────────
    if (isGuest || !profileId) {
      toast.info("Please login to apply for scholarships.");
      setTimeout(() => nav("/login"), 1500);
      return;
    }

    // ── Logged-in: save application to backend ───────────────────
    const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    try {
      const res = await axios.post(`${API}/auth/applications/${profileId}`, { name, date, status: "Applied" }, {
        headers: { "x-user-id": localStorage.getItem("userId") },
      });
      if (res.data.status) {
        localStorage.setItem("applications", JSON.stringify(res.data.applications));
        toast.success(`✅ Applied for "${name}"! Check Profile → Applications tab.`);
      } else if (res.data.message === "Already applied") {
        toast.info(`You already applied for "${name}"`);
      } else {
        toast.error("Failed to save. Please try again.");
      }
    } catch (err) {
      if (err.response?.status === 401) {
        toast.info("Please login to apply for scholarships.");
        setTimeout(() => nav("/login"), 1500);
      } else {
        toast.error("Could not connect to server.");
      }
    }
  };

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // ── Loading ───────────────────────────────────────────────────
  if (loading) return (
    <div style={{ ...pageStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "white" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h2>Finding best scholarships for you...</h2>
        <p style={{ color: "#ccc" }}>Running Naive Bayes algorithm...</p>
      </div>
    </div>
  );

  // ── No profile ────────────────────────────────────────────────
  if (noProfile) return (
    <div style={pageStyle}>
      <div style={overlayStyle}>
        <div style={centreBox}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>📋</div>
          <h2 style={{ margin: "0 0 8px", color: "#1a1240" }}>Profile Not Filled</h2>
          <p style={{ color: "#555", margin: "0 0 20px" }}>
            Please fill your student profile first to get scholarship recommendations.
          </p>
          <button style={fillBtn} onClick={() => nav("/form")}>Fill Student Profile →</button>
        </div>
      </div>
    </div>
  );

  // ── Student summary (from localStorage) ──────────────────────
  const s = JSON.parse(localStorage.getItem("studentData") || "{}");

  return (
    <div style={pageStyle}>
      <div style={overlayStyle}>
        <h1 style={{ color: "white", marginBottom: 4 }}>Scholarship Opportunities</h1>

        {/* Guest mode banner */}
        {isGuest && (
          <div style={guestBanner}>
            <span>👤 You're browsing as a <b>Guest</b>. Login to apply for scholarships and save your progress.</span>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button style={bannerLoginBtn} onClick={() => nav("/login")}>Login</button>
              <button style={bannerRegBtn}   onClick={() => nav("/register")}>Register</button>
            </div>
          </div>
        )}
        {/* Summary bar — only shown when student profile is filled */}
        {s.education && (
        <div style={summaryBar}>
          <span>🎓 {s.education}</span>
          <span>📊 {s.marks}% marks</span>
          <span>💰 ₹{Number(s.income).toLocaleString()}</span>
          <span>👥 {s.community}</span>
          <button style={editProfileBtn} onClick={() => nav("/form")}>✏️ Edit</button>
        </div>
        )}

        {matched.length > 0 ? (
          <>
            <h2 style={{ color: "white", marginTop: 24 }}>
              {isGuest
                ? `📋 ${matched.length} Available Scholarship${matched.length > 1 ? "s" : ""} (Login to Apply)`
                : `✅ ${matched.length} Scholarship${matched.length > 1 ? "s" : ""} Match Your Profile`
              }
            </h2>
            <div style={cardContainer}>
              {matched.map((item, idx) => {
                // ── Support NB response (item.scholarship), fallback, and raw-browse ──
                const sch   = item.scholarship || item;
                const pct   = item.matchPercentage;          // may be null for raw guest browse
                const grade = item.grade || (pct != null ? (pct >= 85 ? "Excellent" : pct >= 70 ? "Good" : "Fair") : null);
                const bd    = item.breakdown;
                const id    = sch._id || idx;
                const open  = expanded[id];

                return (
                  <div key={id} style={cardStyle}>
                    {pct != null
                      ? <div style={badgeStyle(pct)}>{pct}% — {grade}</div>
                      : <div style={browseBadge}>Browse</div>
                    }

                    <h3 style={{ margin: "8px 0 4px", fontSize: 15, color: "#1a1240" }}>{sch.name}</h3>

                    {pct != null && <div style={barBg}><div style={barFill(pct)} /></div>}

                    <p style={rowTxt}><b>Education:</b> {sch.education}</p>
                    <p style={rowTxt}><b>Min Marks:</b> {sch.minMarks}%</p>

                    {open && (
                      <>
                        <p style={rowTxt}><b>Income Limit:</b> ₹{sch.maxIncome?.toLocaleString()}</p>
                        <p style={rowTxt}><b>Community:</b> {sch.community}</p>
                        {bd && (
                          <div style={breakdownBox}>
                            <b style={{ fontSize: 12 }}>Match Breakdown:</b><br />
                            {Object.values(bd).map((v, i) => <span key={i} style={{ fontSize: 12 }}>{v}<br /></span>)}
                          </div>
                        )}
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                          {isGuest ? (
                            <button
                              style={{ ...applyBtn, background: "#36084e" }}
                              onClick={() => handleApply(sch.name)}
                            >
                              🔑 Login to Apply
                            </button>
                          ) : (
                            <button style={applyBtn} onClick={() => handleApply(sch.name)}>
                              Apply for Scholarship
                            </button>
                          )}
                          {sch.link && (
                            isGuest ? (
                              <button
                                style={{ ...applyBtn, background: "#607d8b", width: "100%" }}
                                onClick={() => {
                                  toast.info("Please login to view the official link.");
                                  setTimeout(() => nav("/login"), 1500);
                                }}
                              >
                                🔒 Login to View Official Link
                              </button>
                            ) : (
                              <a href={sch.link} target="_blank" rel="noreferrer">
                                <button style={{ ...applyBtn, background: "#1976d2", width: "100%" }}>
                                  Official Link ↗
                                </button>
                              </a>
                            )
                          )}
                        </div>
                      </>
                    )}

                    <button style={toggleBtn} onClick={() => toggle(id)}>
                      {open ? "▲ Show Less" : "▼ View Details"}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={noMatchBox}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
            <h2 style={{ margin: "0 0 8px", color: "#333" }}>No Scholarships Match Your Profile</h2>
            <p style={{ color: "#666", margin: "0 0 16px", lineHeight: 1.6 }}>
              Your current profile doesn't meet any scholarship criteria in our database.
              Try updating your profile — even small changes can unlock new results.
            </p>
            <button style={fillBtn} onClick={() => nav("/form")}>Update Profile →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const pageStyle     = { minHeight: "90vh", backgroundImage: "url('https://images.pexels.com/photos/256541/pexels-photo-256541.jpeg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed", padding: "40px" };
const overlayStyle  = { background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", minHeight: "80vh", padding: "40px", borderRadius: "15px", textAlign: "center" };
const cardContainer = { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "25px", marginTop: "20px" };
const cardStyle     = { background: "white", width: "300px", padding: "20px", borderRadius: "15px", boxShadow: "0px 5px 20px rgba(0,0,0,0.5)", textAlign: "left", display: "flex", flexDirection: "column" };
const rowTxt        = { margin: "5px 0", fontSize: 14 };
const applyBtn      = { width: "100%", padding: "10px", background: "#ff2e63", color: "white", border: "none", borderRadius: "20px", cursor: "pointer", fontWeight: 600 };
const toggleBtn     = { marginTop: "auto", paddingTop: 10, background: "none", border: "none", color: "#1976d2", cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "center" };
const centreBox     = { background: "white", maxWidth: 440, margin: "60px auto", padding: "40px", borderRadius: "20px", boxShadow: "0px 8px 24px rgba(0,0,0,0.6)", textAlign: "center" };
const noMatchBox    = { background: "white", maxWidth: 500, margin: "40px auto", padding: "36px", borderRadius: "20px", boxShadow: "0px 8px 24px rgba(0,0,0,0.6)", textAlign: "center" };
const fillBtn       = { padding: "12px 32px", background: "#ff2e63", color: "white", border: "none", borderRadius: "24px", cursor: "pointer", fontWeight: 700, fontSize: 15 };
const summaryBar    = { display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap", margin: "16px 0 4px", padding: "10px 20px", background: "rgba(255,255,255,0.12)", borderRadius: 10, color: "#fff", fontSize: 14 };
const editProfileBtn = { padding: "4px 14px", background: "rgba(255,46,99,0.8)", border: "none", borderRadius: 12, color: "white", cursor: "pointer", fontSize: 12, fontWeight: 600 };
const badgeStyle    = (pct) => ({ display: "inline-block", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", background: pct >= 85 ? "#e8f5e9" : pct >= 70 ? "#fff8e1" : "#e3f2fd", color: pct >= 85 ? "#2e7d32" : pct >= 70 ? "#f57f17" : "#1565c0" });
const barBg         = { background: "#eee", borderRadius: "10px", height: "6px", margin: "8px 0 12px" };
const barFill       = (pct) => ({ width: `${pct}%`, height: "6px", borderRadius: "10px", background: pct >= 85 ? "#43a047" : pct >= 70 ? "#ffa726" : "#42a5f5", transition: "width 0.5s ease" });
const breakdownBox  = { background: "#f9f9f9", borderRadius: "8px", padding: "8px 10px", marginTop: "8px", lineHeight: "1.9" };
const guestBanner   = { display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap", margin: "10px 0 4px", padding: "12px 20px", background: "rgba(255,200,0,0.15)", border: "1px solid rgba(255,200,0,0.4)", borderRadius: 10, color: "#fff", fontSize: 14 };
const bannerLoginBtn = { padding: "6px 18px", background: "#36084e", color: "white", border: "none", borderRadius: 16, cursor: "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" };
const bannerRegBtn  = { padding: "6px 18px", background: "#ff2e63", color: "white", border: "none", borderRadius: 16, cursor: "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" };
const browseBadge   = { display: "inline-block", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", background: "#e8eaf6", color: "#3949ab" };

export default Result;
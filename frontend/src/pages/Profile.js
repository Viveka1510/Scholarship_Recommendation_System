import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { FiEdit2, FiCamera, FiLogOut, FiAward, FiBook, FiUsers, FiCheck, FiX } from "react-icons/fi";

const API = "http://localhost:5000";

function Profile() {
  const nav      = useNavigate();
  const fileRef  = useRef(null);
  const userId   = localStorage.getItem("userId");
  const profileId = localStorage.getItem("profileId");
  const isGuest  = localStorage.getItem("guestMode") === "true";

  const emptyUser = { name: "", email: "", phone: "", bio: "", avatar: "" };

  const [user, setUser] = useState(() => {
    if (isGuest) return emptyUser;
    const stored = localStorage.getItem("profileData");
    return stored ? JSON.parse(stored) : emptyUser;
  });

  const [student, setStudent] = useState(() => {
    if (isGuest) return null;
    const stored = localStorage.getItem("studentData");
    return stored ? JSON.parse(stored) : null;
  });

  const [editing,      setEditing]      = useState(false);
  const [editData,     setEditData]     = useState(() => {
    // Pre-fill from localStorage so modal is never blank on first open
    const stored = localStorage.getItem("profileData");
    return stored ? JSON.parse(stored) : { ...emptyUser };
  });
  const [activeTab,    setActiveTab]    = useState("profile");
  const [loading,      setLoading]      = useState(false);
  const [applications, setApplications] = useState([]);
  const [viewedCount,  setViewedCount]  = useState(0);

  // ── Fetch fresh profile + academic data from DB on mount ──
  useEffect(() => {
    if (!userId || !profileId || isGuest) return;

    axios.get(`${API}/auth/profile/${profileId}`)
      .then(res => {
        if (!res.data.status) return;
        const u = res.data.user;

        const profileData = {
          name:   u.name   || "",
          email:  u.email  || "",
          phone:  u.phone  || "",
          bio:    u.bio    || "",
          avatar: u.avatar || "",
        };
        setUser(profileData);
        setEditData(profileData);
        localStorage.setItem("profileData", JSON.stringify(profileData));

        if (u.education) {
          const academic = {
            age:       u.age,
            dob:       u.dob,
            gender:    u.gender,
            education: u.education,
            marks:     u.marks,
            community: u.community,
            income:    u.income,
          };
          setStudent(academic);
          localStorage.setItem("studentData", JSON.stringify(academic));
        }
      })
      .catch(() => toast.error("Could not load profile from server"));

    // Fetch applications
    axios.get(`${API}/auth/applications/${profileId}`)
      .then(res => {
        if (res.data.status) {
          const apps = res.data.applications || [];
          setApplications(apps);
          localStorage.setItem("applications", JSON.stringify(apps));
          localStorage.setItem("viewed", String(apps.length));
        }
      })
      .catch(() => {
        const apps = localStorage.getItem("applications");
        setApplications(apps ? JSON.parse(apps) : []);
      });

    const viewed = parseInt(localStorage.getItem("viewed") || "0", 10);
    setViewedCount(viewed);
  }, [userId, profileId, isGuest]);

  // ── Avatar upload ──
  const handleAvatarChange = (e) => {
    if (isGuest) { nav("/login"); return; }
    const file = e.target.files[0];
    if (!file) return;

    const img       = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX    = 300;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else       { w = Math.round(w * MAX / h); h = MAX; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      const avatar = canvas.toDataURL("image/jpeg", 0.7);
      URL.revokeObjectURL(objectUrl);

      const updated = { ...user, avatar };
      setUser(updated);
      setEditData(updated);
      localStorage.setItem("profileData", JSON.stringify(updated));

      if (profileId) {
        const pid = localStorage.getItem("profileId");
        axios.put(`${API}/auth/profile/${pid}`, updated)
          .then(() => toast.success("Photo saved!"))
          .catch(() => toast.error("Photo save to server failed — saved locally"));
      }
    };
    img.src = objectUrl;
  };

  // ── Save profile (name, phone, bio, avatar) to DB ──
  const saveProfile = () => {
    if (isGuest)             { nav("/login"); return; }
    if (!editData.name.trim()) { toast.error("Name cannot be empty"); return; }
    // Always read fresh from localStorage — avoids stale closure
    const pid = localStorage.getItem("profileId");
    if (!pid) { toast.error("Not logged in — profileId missing"); return; }

    setLoading(true);
    axios.put(`${API}/auth/profile/${pid}`, editData)
      .then(res => {
        if (res.data.status) {
          setUser({ ...editData });
          localStorage.setItem("profileData", JSON.stringify(editData));
          setEditing(false);
          toast.success("Profile saved to database!");
        } else {
          toast.error(res.data.message || "Save failed");
        }
      })
      .catch(err => {
        const msg = err.response?.data?.message || "Save failed";
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  };

  const handleEditClick  = () => {
    if (isGuest) { nav("/login"); return; }
    // Always sync editData from latest user state before opening modal
    setEditData({ ...user });
    setEditing(true);
  };
  const handleFormClick  = () => { if (isGuest) { nav("/login"); return; } nav("/form"); };

  const logout = () => {
    ["user","userId","profileId","guestMode","profileData","studentData","applications","viewed"]
      .forEach(k => localStorage.removeItem(k));
    toast.info("Logged out");
    nav("/login");
  };

  const completion = (() => {
    if (isGuest) return 0;
    const fields = [user.name, user.email, user.phone, user.bio, user.avatar];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  })();

  const stats = [
    { label: "Applications",        value: isGuest ? "—" : applications.length, icon: <FiAward /> },
    { label: "Scholarships Viewed", value: isGuest ? "—" : viewedCount,          icon: <FiBook  /> },
    { label: "Profile Strength",    value: isGuest ? "—" : `${completion}%`,     icon: <FiUsers /> },
  ];

  const communityColors = { OC: "#e74c3c", BC: "#3498db", MBC: "#9b59b6", SC: "#e67e22", ST: "#27ae60", BCM: "#1abc9c" };

  // ── Guest landing ──
  if (isGuest) {
    return (
      <div style={pageStyle}>
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,8,30,0.72)", pointerEvents: "none", zIndex: 0 }} />
        <div style={blob1} /><div style={blob2} />
        <div style={container}>
          <button style={backBtn} onClick={() => nav("/form")}>← Back to Home</button>
          <div style={guestCard}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>👤</div>
            <h2 style={{ color: "#fff", margin: "0 0 8px", fontSize: 26 }}>You're browsing as Guest</h2>
            <p style={{ color: "#aaa", margin: "0 0 28px", lineHeight: 1.6, fontSize: 15 }}>
              Your profile is not saved in Guest mode.<br />
              Please Login or Register to fill and save your profile.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button style={bigLoginBtn}    onClick={() => nav("/login")}>🔑 Login</button>
              <button style={bigRegisterBtn} onClick={() => nav("/register")}>📝 Register</button>
            </div>
            <button style={{ ...logoutBtn, marginTop: 24, justifyContent: "center" }} onClick={logout}>
              <FiLogOut size={14} style={{ marginRight: 6 }} /> Exit Guest Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Logged-in profile ──
  return (
    <div style={pageStyle}>
      <div style={{ position: "fixed", inset: 0, background: "rgba(10,8,30,0.72)", pointerEvents: "none", zIndex: 0 }} />
      <div style={blob1} /><div style={blob2} />

      <div style={container}>
        <button style={backBtn} onClick={() => nav("/form")}>← Back to Home</button>

        {/* TOP CARD */}
        <div style={topCard}>
          <div style={coverStrip} />
          <div style={avatarWrap}>
            <div style={avatarRing}>
              {user.avatar
                ? <img src={user.avatar} alt="avatar" style={avatarImg} />
                : <div style={avatarFallback}>{user.name?.charAt(0).toUpperCase() || "S"}</div>
              }
            </div>
            <button style={camBtn} onClick={() => fileRef.current.click()}><FiCamera size={14} /></button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
          </div>

          <div style={nameBlock}>
            <h2 style={nameStyle}>{user.name || "Your Name"}</h2>
            <p style={emailStyle}>{user.email}</p>
            {user.bio && <p style={bioStyle}>{user.bio}</p>}
          </div>

          <div style={actionRow}>
            <button style={editBtn} onClick={handleEditClick}>
              <FiEdit2 size={14} style={{ marginRight: 6 }} /> Edit Profile
            </button>
            <button style={logoutBtn} onClick={logout}>
              <FiLogOut size={14} style={{ marginRight: 6 }} /> Logout
            </button>
          </div>

          <div style={completionWrap}>
            <div style={completionLabel}>
              <span>Profile Completion</span>
              <span style={{ color: completion === 100 ? "#4ade80" : "#ff2e63" }}>{completion}%</span>
            </div>
            <div style={completionTrack}><div style={{ ...completionFill, width: `${completion}%` }} /></div>
          </div>

          <div style={statsRow}>
            {stats.map((s, i) => (
              <div key={i} style={{ ...statBox, borderRight: i < stats.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                <div style={statIcon}>{s.icon}</div>
                <div style={statVal}>{s.value}</div>
                <div style={statLbl}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* TABS */}
        <div style={tabBar}>
          {["profile", "academic", "applications"].map(tab => (
            <button key={tab} style={{ ...tabBtn, ...(activeTab === tab ? tabActive : {}) }} onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div style={infoCard}>
            <h3 style={sectionTitle}>Personal Information</h3>
            <div style={infoGrid}>
              <InfoRow label="Full Name" value={user.name  || "—"} />
              <InfoRow label="Email"     value={user.email || "—"} />
              <InfoRow label="Phone"     value={user.phone || "Not provided"} />
              <InfoRow label="Bio"       value={user.bio   || "Not provided"} />
            </div>
            <div style={syncNote}>
              <span style={{ color: "#4ade80" }}>✔ Synced with MongoDB database</span>
            </div>
          </div>
        )}

        {/* ACADEMIC TAB */}
        {activeTab === "academic" && (
          <div style={infoCard}>
            <h3 style={sectionTitle}>Academic Profile</h3>
            {student ? (
              <>
                <div style={infoGrid}>
                  <InfoRow label="Education"     value={student.education} />
                  <InfoRow label="Marks / %"     value={`${student.marks}%`} />
                  <InfoRow label="Date of Birth" value={student.dob} />
                  <InfoRow label="Age"           value={student.age} />
                  <InfoRow label="Gender"        value={student.gender} />
                  <InfoRow label="Annual Income" value={`₹${Number(student.income).toLocaleString()}`} />
                </div>
                <div style={{ marginTop: 24 }}>
                  <p style={fieldLabel}>Community</p>
                  <span style={{ ...communityBadge, background: (communityColors[student.community] || "#ff2e63") + "22", color: communityColors[student.community] || "#ff2e63", border: `1px solid ${(communityColors[student.community] || "#ff2e63")}44` }}>
                    {student.community}
                  </span>
                </div>
                <div style={{ marginTop: 24 }}>
                  <p style={fieldLabel}>Academic Score</p>
                  <div style={marksTrack}>
                    <div style={{ ...marksFill, width: `${student.marks}%`, background: student.marks >= 75 ? "linear-gradient(90deg,#4ade80,#22c55e)" : student.marks >= 50 ? "linear-gradient(90deg,#facc15,#f59e0b)" : "linear-gradient(90deg,#f87171,#ef4444)" }} />
                  </div>
                  <p style={{ color: "#aaa", fontSize: 12, marginTop: 4 }}>
                    {student.marks >= 75 ? "🏆 Excellent — eligible for merit scholarships" : student.marks >= 50 ? "📚 Good — eligible for several scholarships" : "📄 Fair — limited scholarship options"}
                  </p>
                </div>
                <button style={updateAcademicBtn} onClick={handleFormClick}>Update Academic Info</button>
              </>
            ) : (
              <div style={emptyState}>
                <FiBook size={40} style={{ color: "#ff2e63", marginBottom: 12 }} />
                <p style={{ color: "#aaa" }}>No academic data found.</p>
                <button style={updateAcademicBtn} onClick={handleFormClick}>Fill Student Profile</button>
              </div>
            )}
          </div>
        )}

        {/* APPLICATIONS TAB */}
        {activeTab === "applications" && (
          <div style={infoCard}>
            <h3 style={sectionTitle}>Scholarship Activity</h3>
            {applications.length > 0 ? applications.map((app, i) => (
              <div key={i} style={appRow}>
                <FiAward style={{ color: "#ff2e63", marginRight: 10, flexShrink: 0 }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: "#fff" }}>{app.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#aaa" }}>{app.date}</p>
                </div>
                <span style={appBadge}>{app.status || "Applied"}</span>
              </div>
            )) : (
              <div style={emptyState}>
                <FiAward size={40} style={{ color: "#ff2e63", marginBottom: 12 }} />
                <p style={{ color: "#aaa" }}>No applications yet.</p>
                <button style={updateAcademicBtn} onClick={() => nav("/result")}>Browse Scholarships</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editing && (
        <div style={modalOverlay}>
          <div style={modal}>
            <div style={modalHeader}>
              <h3 style={{ margin: 0, color: "#fff" }}>Edit Profile</h3>
              <button style={closeBtn} onClick={() => setEditing(false)}><FiX size={18} /></button>
            </div>
            <label style={mLabel}>Full Name</label>
            <input style={mInput} value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />

            <label style={mLabel}>Phone</label>
            <input style={mInput} value={editData.phone} placeholder="10-digit phone"
              onChange={e => setEditData({ ...editData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} />

            <label style={mLabel}>Bio</label>
            <textarea style={{ ...mInput, height: 80, resize: "none" }} value={editData.bio}
              onChange={e => setEditData({ ...editData, bio: e.target.value })} />

            <button style={saveBtn} onClick={saveProfile} disabled={loading}>
              {loading ? "Saving…" : <><FiCheck size={16} style={{ marginRight: 6 }} />Save to Server</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p style={fieldLabel}>{label}</p>
      <p style={fieldValue}>{value}</p>
    </div>
  );
}

const pageStyle        = { minHeight: "100vh", backgroundImage: "url('https://images.unsplash.com/photo-1497864149936-d3163f0c0f4b?w=1600&q=80')", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed", padding: "40px 20px 80px", position: "relative", overflow: "hidden", fontFamily: "'Segoe UI',sans-serif" };
const blob1            = { position: "fixed", top: "-150px", right: "-150px", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,#ff2e6322,transparent 70%)", pointerEvents: "none", zIndex: 0 };
const blob2            = { position: "fixed", bottom: "-100px", left: "-100px", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle,#36084e44,transparent 70%)", pointerEvents: "none", zIndex: 0 };
const container        = { maxWidth: 640, margin: "0 auto", position: "relative", zIndex: 1 };
const backBtn          = { display: "inline-flex", alignItems: "center", marginBottom: 16, padding: "8px 20px", borderRadius: 20, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#ccc", cursor: "pointer", fontSize: 14, fontWeight: 500 };
const guestCard        = { background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 24, padding: "48px 32px", textAlign: "center", marginTop: 40 };
const bigLoginBtn      = { padding: "12px 36px", borderRadius: 24, background: "linear-gradient(135deg,#ff2e63,#ff6b35)", border: "none", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" };
const bigRegisterBtn   = { padding: "12px 36px", borderRadius: 24, background: "rgba(255,46,99,0.15)", border: "1px solid #ff2e63", color: "#ff2e63", fontWeight: 700, fontSize: 16, cursor: "pointer" };
const topCard          = { background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, overflow: "hidden", marginBottom: 16 };
const coverStrip       = { height: 100, background: "linear-gradient(135deg,#36084e,#ff2e63 80%,#ff6b35)" };
const avatarWrap       = { position: "relative", width: 90, margin: "-45px auto 0" };
const avatarRing       = { width: 90, height: 90, borderRadius: "50%", border: "3px solid #ff2e63", overflow: "hidden", background: "#1a1240", display: "flex", alignItems: "center", justifyContent: "center" };
const avatarImg        = { width: "100%", height: "100%", objectFit: "cover" };
const avatarFallback   = { fontSize: 36, fontWeight: 700, color: "#ff2e63" };
const camBtn           = { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: "50%", background: "#ff2e63", border: "2px solid #0c0f2c", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
const nameBlock        = { textAlign: "center", padding: "12px 24px 0" };
const nameStyle        = { color: "#fff", margin: "0 0 4px", fontSize: 22, fontWeight: 700 };
const emailStyle       = { color: "#aaa", margin: "0 0 6px", fontSize: 14 };
const bioStyle         = { color: "#ccc", fontSize: 13, margin: "0 auto", maxWidth: 360, lineHeight: 1.5 };
const actionRow        = { display: "flex", gap: 10, justifyContent: "center", padding: "16px 24px 0" };
const editBtn          = { display: "flex", alignItems: "center", padding: "8px 20px", borderRadius: 20, background: "rgba(255,46,99,0.15)", border: "1px solid #ff2e63", color: "#ff2e63", cursor: "pointer", fontSize: 13, fontWeight: 600 };
const logoutBtn        = { display: "flex", alignItems: "center", padding: "8px 20px", borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.2)", color: "#aaa", cursor: "pointer", fontSize: 13 };
const completionWrap   = { padding: "20px 24px 0" };
const completionLabel  = { display: "flex", justifyContent: "space-between", color: "#ccc", fontSize: 13, marginBottom: 6 };
const completionTrack  = { height: 6, borderRadius: 10, background: "rgba(255,255,255,0.1)" };
const completionFill   = { height: "100%", borderRadius: 10, background: "linear-gradient(90deg,#ff2e63,#ff6b35)", transition: "width 0.6s ease" };
const statsRow         = { display: "flex", padding: "20px 24px 24px", borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: 20 };
const statBox          = { flex: 1, textAlign: "center" };
const statIcon         = { color: "#ff2e63", fontSize: 18, marginBottom: 4 };
const statVal          = { color: "#fff", fontWeight: 700, fontSize: 18 };
const statLbl          = { color: "#888", fontSize: 11 };
const tabBar           = { display: "flex", gap: 8, marginBottom: 16 };
const tabBtn           = { flex: 1, padding: "10px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#888", cursor: "pointer", fontSize: 14, fontWeight: 600 };
const tabActive        = { background: "rgba(255,46,99,0.15)", border: "1px solid #ff2e63", color: "#ff2e63" };
const infoCard         = { background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "28px" };
const sectionTitle     = { color: "#fff", margin: "0 0 20px", fontSize: 16, fontWeight: 700, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" };
const infoGrid         = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" };
const fieldLabel       = { color: "#888", fontSize: 11, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: 1 };
const fieldValue       = { color: "#fff", fontSize: 15, margin: 0, fontWeight: 500 };
const communityBadge   = { display: "inline-block", padding: "4px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700 };
const marksTrack       = { height: 10, borderRadius: 10, background: "rgba(255,255,255,0.1)", overflow: "hidden" };
const marksFill        = { height: "100%", borderRadius: 10, transition: "width 0.8s ease" };
const updateAcademicBtn = { marginTop: 20, padding: "10px 28px", background: "linear-gradient(135deg,#ff2e63,#ff6b35)", border: "none", borderRadius: 20, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14 };
const emptyState       = { display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 0" };
const appRow           = { display: "flex", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.07)" };
const appBadge         = { marginLeft: "auto", padding: "3px 12px", borderRadius: 20, background: "rgba(74,222,128,0.15)", color: "#4ade80", fontSize: 12, fontWeight: 600 };
const syncNote         = { marginTop: 20, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", fontSize: 13 };
const modalOverlay     = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const modal            = { width: 440, background: "#1a1240", border: "1px solid rgba(255,46,99,0.3)", borderRadius: 20, padding: 28 };
const modalHeader      = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 };
const closeBtn         = { background: "transparent", border: "none", color: "#aaa", cursor: "pointer" };
const mLabel           = { display: "block", color: "#aaa", fontSize: 12, marginBottom: 4, marginTop: 16, textTransform: "uppercase", letterSpacing: 1 };
const mInput           = { width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" };
const saveBtn          = { marginTop: 24, width: "100%", padding: "12px", borderRadius: 20, background: "linear-gradient(135deg,#ff2e63,#ff6b35)", border: "none", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" };

export default Profile;

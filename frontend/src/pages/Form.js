import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";

const API = "http://localhost:5000";

function Form() {
  const nav     = useNavigate();
  const [data, setData] = useState({});
  const formRef = useRef(null);

  // ── Guest Mode ──
  const isGuest = localStorage.getItem("guestMode") === "true";
  if (isGuest) {
    return (
      <div style={guestPageBg}>
        <div style={guestHero}>
          <h1>Scholarship Recommendation Portal</h1>
          <p style={{ width: "600px", maxWidth: "90vw" }}>
            Discover scholarships that match your academic profile and eligibility.
            Complete your profile to find the best opportunities.
          </p>
        </div>
        <div style={guestCardWrap}>
          <div style={guestCard}>
            <div style={{ fontSize: 60, marginBottom: 12 }}>🔒</div>
            <h2 style={{ margin: "0 0 8px", color: "#1a1240" }}>Login to Fill Your Profile</h2>
            <p style={{ color: "#555", margin: "0 0 24px", lineHeight: 1.7 }}>
              You're browsing as a <b>Guest</b>. To fill your student profile and get
              personalised scholarship recommendations, please log in or create an account.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button style={guestLoginBtn} onClick={() => nav("/login")}>🔑 Login</button>
              <button style={guestRegBtn}   onClick={() => nav("/register")}>📝 Create Account</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const scrollToForm = () => formRef.current.scrollIntoView({ behavior: "smooth" });

  const submit = async () => {
    // ── Validation ──
    if (
      !data.age || !data.dob || !data.gender || !data.education ||
      !data.marks || !data.community || !data.income
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    const age = Number(data.age);
    if (age < 10 || age > 99) { toast.error("Age must be between 10 and 99"); return; }

    const today = new Date();
    const dob   = new Date(data.dob);
    if (dob >= today) { toast.error("DOB must be a past date"); return; }

    const marks = Number(data.marks);
    if (marks < 0 || marks > 100) { toast.error("Marks must be between 0 and 100"); return; }

    const academicPayload = {
      age:       data.age,
      dob:       data.dob,
      gender:    data.gender,
      education: data.education,
      marks:     Number(data.marks),
      community: data.community,
      income:    Number(data.income),
    };

    // ── Always save to localStorage first (offline fallback) ──
    localStorage.setItem("studentData", JSON.stringify(academicPayload));

    // ── Save to MongoDB if logged in ──
    const profileId = localStorage.getItem("profileId");
    if (profileId) {
      try {
        const res = await axios.put(`${API}/auth/academic/${profileId}`, academicPayload);
        if (res.data.status) {
          toast.success("Academic info saved to database!");
        } else {
          toast.warning("Saved locally, but server update failed: " + res.data.message);
        }
      } catch (err) {
        console.error("Academic save error:", err);
        toast.warning("Saved locally. Could not reach server.");
        // Don't block navigation — still proceed to result
      }
    } else {
      toast.info("Not logged in — data saved locally only.");
    }

    nav("/result");
  };

  return (
    <div>

      {/* HERO */}
      <div style={heroStyle}>
        <h1>Scholarship Recommendation Portal</h1>
        <p style={{ width: "600px" }}>
          Discover scholarships that match your academic profile and eligibility.
          Complete your profile to find the best opportunities.
        </p>
        <br />
        <button onClick={scrollToForm} style={heroBtn}>Complete Profile</button>
      </div>

      {/* FORM */}
      <div ref={formRef} style={pageBg}>
        <div style={formCard}>

          <h2 style={{ color: "white" }}>Student Profile Registration</h2>
          <p style={{ color: "#ddd" }}>Fill your details to get scholarship recommendations</p>
          <br />

          <label style={labelStyle}>Age</label>
          <input type="number" min="10" max="99" style={inputStyle}
            onChange={e => setData({ ...data, age: e.target.value })} />

          <label style={labelStyle}>Date of Birth</label>
          <input type="date" max={new Date().toISOString().split("T")[0]} style={inputStyle}
            onChange={e => setData({ ...data, dob: e.target.value })} />

          <label style={labelStyle}>Gender</label>
          <select style={selectStyle} onChange={e => setData({ ...data, gender: e.target.value })}>
            <option value="">Select Gender</option>
            <option>Male</option><option>Female</option><option>Other</option>
          </select>

          <label style={labelStyle}>Academic Qualification</label>
          <select style={selectStyle} onChange={e => setData({ ...data, education: e.target.value })}>
            <option value="">Select Education</option>
            <option>School</option><option>Diploma</option><option>UG</option>
            <option>PG</option><option>PhD</option><option>ITI</option>
          </select>

          <label style={labelStyle}>Marks / Percentage</label>
          <input type="number" min="0" max="100" style={inputStyle}
            onChange={e => setData({ ...data, marks: e.target.value })} />

          <label style={labelStyle}>Community</label>
          <select style={selectStyle} onChange={e => setData({ ...data, community: e.target.value })}>
            <option value="">Select Community</option>
            <option>OC</option><option>BC</option><option>MBC</option>
            <option>SC</option><option>ST</option><option>BCM</option>
          </select>

          <label style={labelStyle}>Annual Family Income (₹)</label>
          <input type="number" min="0" style={inputStyle}
            onChange={e => setData({ ...data, income: e.target.value })} />

          <br /><br />
          <button onClick={submit} style={submitBtn}>Find Scholarships</button>

        </div>
      </div>
    </div>
  );
}

const heroStyle    = { backgroundImage: "url('https://images.unsplash.com/photo-1523240795612-9a054b0db644')", height: "93vh", backgroundSize: "cover", backgroundPosition: "center", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "white", textAlign: "center" };
const heroBtn      = { padding: "12px 30px", backgroundColor: "#ff2e63", color: "white", border: "none", borderRadius: "25px", fontSize: "16px", cursor: "pointer" };
const pageBg       = { background: "linear-gradient(to right,#1a1240,#0c0f2c)", padding: "80px 0" };
const formCard     = { width: "550px", margin: "auto", padding: "40px", borderRadius: "20px", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)" };
const labelStyle   = { color: "white", display: "block", marginTop: "15px" };
const inputStyle   = { width: "100%", padding: "10px", background: "transparent", border: "none", borderBottom: "1px solid white", color: "white", outline: "none", marginTop: "5px" };
const submitBtn    = { marginTop: "30px", background: "#ff2e63", color: "white", padding: "12px 35px", border: "none", borderRadius: "25px", cursor: "pointer", fontSize: "16px" };
const selectStyle  = { width: "100%", padding: "10px", background: "#1a1240", border: "1px solid white", color: "white", outline: "none", marginTop: "5px", borderRadius: "5px", cursor: "pointer" };

const guestPageBg  = { background: "linear-gradient(to right,#1a1240,#0c0f2c)", minHeight: "100vh" };
const guestHero    = { backgroundImage: "url('https://images.unsplash.com/photo-1523240795612-9a054b0db644')", height: "50vh", backgroundSize: "cover", backgroundPosition: "center", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "white", textAlign: "center", padding: "0 20px" };
const guestCardWrap = { display: "flex", justifyContent: "center", alignItems: "center", padding: "60px 20px" };
const guestCard    = { background: "white", borderRadius: "24px", padding: "48px 40px", maxWidth: "480px", width: "100%", textAlign: "center", boxShadow: "0 12px 40px rgba(0,0,0,0.4)" };
const guestLoginBtn = { padding: "12px 32px", background: "#36084e", color: "white", border: "none", borderRadius: "24px", cursor: "pointer", fontWeight: 700, fontSize: 15 };
const guestRegBtn  = { padding: "12px 32px", background: "#ff2e63", color: "white", border: "none", borderRadius: "24px", cursor: "pointer", fontWeight: 700, fontSize: 15 };

export default Form;

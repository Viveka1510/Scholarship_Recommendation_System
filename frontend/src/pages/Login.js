import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "react-toastify";
import { FcGoogle } from "react-icons/fc";

const API = "http://localhost:5000";

function Login() {
  const nav = useNavigate();
  const [data, setData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!data.email.trim() || !data.password.trim()) {
      toast.error("Enter Email and Password");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, {
        email:    data.email.trim(),
        password: data.password.trim(),
      });

      if (res.data.status) {
        const u = res.data.user;

        // ── Clear previous session ──
        localStorage.removeItem("guestMode");

        // ── Store session keys ──
        localStorage.setItem("user",      "true");
        localStorage.setItem("userId",    u.id);
        localStorage.setItem("profileId", u.profileId);   // ← used for all further API calls

        // ── Store profile data from DB ──
        localStorage.setItem("profileData", JSON.stringify({
          name:   u.name   || "",
          email:  u.email  || "",
          phone:  u.phone  || "",
          bio:    u.bio    || "",
          avatar: u.avatar || "",
        }));

        // ── Store academic data from DB (if already filled) ──
        if (u.education) {
          localStorage.setItem("studentData", JSON.stringify({
            age:       u.age,
            dob:       u.dob,
            gender:    u.gender,
            education: u.education,
            marks:     u.marks,
            community: u.community,
            income:    u.income,
          }));
        } else {
          localStorage.removeItem("studentData");
        }

        // ── Fetch this user's applications from DB ──
        try {
          const appRes = await axios.get(`${API}/auth/applications/${u.profileId}`);
          if (appRes.data.status) {
            const apps = appRes.data.applications || [];
            localStorage.setItem("applications", JSON.stringify(apps));
            localStorage.setItem("viewed", String(apps.length));
          }
        } catch {
          localStorage.removeItem("applications");
        }

        toast.success("Login Successful");
        nav("/form");

      } else {
        toast.error(res.data.message || "Invalid Email or Password");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Server Error";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Guest mode — no userId / profileId stored
  const guestLogin = () => {
    localStorage.setItem("user",      "true");
    localStorage.setItem("guestMode", "true");
    localStorage.removeItem("userId");
    localStorage.removeItem("profileId");
    toast.info("Opened as Guest. Login to save your profile.");
    nav("/result");
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        {/* LEFT */}
        <div style={leftPanel}>
          <h1 style={{ color: "white" }}>Hello Friend!</h1>
          <p style={leftText}>
            Register your details and start discovering scholarships that match your profile.
          </p>
          <button onClick={() => nav("/register")} style={signUpBtn}>SIGN UP</button>
        </div>

        {/* RIGHT */}
        <div style={rightPanel}>
          <h2>Sign In</h2><br />

          <input
            placeholder="Email"
            value={data.email}
            style={inputStyle}
            onChange={e => setData({ ...data, email: e.target.value })}
          />
          <br /><br />

          <input
            type="password"
            placeholder="Password"
            value={data.password}
            style={inputStyle}
            onChange={e => setData({ ...data, password: e.target.value })}
          />
          <br /><br />

          <button onClick={login} style={loginBtn} disabled={loading}>
            {loading ? "SIGNING IN..." : "SIGN IN"}
          </button>
          <br />

          <div style={dividerStyle}>OR</div><br />

          <button onClick={guestLogin} style={googleBtn}>
            <FcGoogle size={22} />
            <span style={{ marginLeft: "10px" }}>Continue as Guest</span>
          </button>
        </div>

      </div>
    </div>
  );
}

const pageStyle    = { height: "92vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#dfe3f0" };
const cardStyle    = { width: "750px", height: "430px", display: "flex", borderRadius: "25px", overflow: "hidden", boxShadow: "0px 5px 20px gray", backgroundColor: "white" };
const leftPanel    = { flex: 1, background: "#36084e", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "40px", borderTopRightRadius: "150px", borderBottomRightRadius: "150px" };
const rightPanel   = { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "40px" };
const leftText     = { color: "white", width: "80%", marginBottom: "20px" };
const inputStyle   = { width: "80%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc" };
const loginBtn     = { backgroundColor: "#36084e", color: "white", border: "none", padding: "10px 40px", borderRadius: "20px", cursor: "pointer" };
const signUpBtn    = { backgroundColor: "transparent", border: "1px solid white", color: "white", padding: "8px 30px", borderRadius: "20px", cursor: "pointer" };
const googleBtn    = { width: "80%", padding: "10px", backgroundColor: "white", border: "1px solid #ddd", borderRadius: "20px", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0px 2px 5px gray" };
const dividerStyle = { color: "gray", fontSize: "14px", textAlign: "center" };

export default Login;

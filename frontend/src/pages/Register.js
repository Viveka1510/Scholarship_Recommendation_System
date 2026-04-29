import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const API = "http://localhost:5000";

function Register() {
  const nav = useNavigate();
  const [data, setData] = useState({ name: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const register = async () => {
    if (!data.name.trim() || !data.email.trim() || !data.password.trim()) {
      toast.error("Please fill all fields");
      return;
    }
    if (data.password !== data.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (data.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register`, {
        name:     data.name.trim(),
        email:    data.email.trim(),
        password: data.password,
      });

      if (res.data.status) {
        toast.success(res.data.message || "Registered Successfully!");
        nav("/login");
      } else {
        toast.error(res.data.message || "Registration failed");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Server Error";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        {/* LEFT */}
        <div style={leftPanel}>
          <h1 style={{ color: "white" }}>Welcome Back!</h1>
          <p style={leftText}>
            Already have an account? Sign in to continue your scholarship journey.
          </p>
          <button onClick={() => nav("/login")} style={signInBtn}>
            SIGN IN
          </button>
        </div>

        {/* RIGHT */}
        <div style={rightPanel}>
          <h2>Create Account</h2>
          <br />

          <input
            placeholder="Full Name"
            value={data.name}
            style={inputStyle}
            onChange={e => setData({ ...data, name: e.target.value })}
          />
          <br /><br />

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

          <input
            type="password"
            placeholder="Confirm Password"
            value={data.confirm}
            style={inputStyle}
            onChange={e => setData({ ...data, confirm: e.target.value })}
          />
          <br /><br />

          <button onClick={register} style={registerBtn} disabled={loading}>
            {loading ? "SIGNING UP..." : "SIGN UP"}
          </button>
        </div>

      </div>
    </div>
  );
}

const pageStyle       = { height: "92vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#dfe3f0" };
const cardStyle       = { width: "750px", height: "460px", display: "flex", borderRadius: "25px", overflow: "hidden", boxShadow: "0px 5px 20px gray", backgroundColor: "white" };
const leftPanel       = { flex: 1, background: "#36084e", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "40px", borderTopRightRadius: "150px", borderBottomRightRadius: "150px" };
const rightPanel      = { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "40px" };
const leftText        = { color: "white", width: "80%", marginBottom: "20px" };
const inputStyle      = { width: "80%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc" };
const registerBtn     = { backgroundColor: "#ff2e63", color: "white", border: "none", padding: "10px 40px", borderRadius: "20px", cursor: "pointer" };
const signInBtn       = { backgroundColor: "transparent", border: "1px solid white", color: "white", padding: "8px 30px", borderRadius: "20px", cursor: "pointer" };

export default Register;

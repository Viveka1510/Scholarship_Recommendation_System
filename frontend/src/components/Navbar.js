import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

function Navbar(){

const nav      = useNavigate();
const location = useLocation(); // re-render on every route change

const user    = localStorage.getItem("user");
const isGuest = localStorage.getItem("guestMode") === "true";

const [profileData, setProfileData] = useState(null);

// Re-read localStorage on every page navigation so name/photo stays fresh
useEffect(() => {
  if (isGuest) { setProfileData(null); return; }
  const stored = localStorage.getItem("profileData");
  if (stored) {
    try { setProfileData(JSON.parse(stored)); } catch(e) {}
  }
}, [location.pathname, isGuest]); // ← re-runs on every page change

const logout = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("userId");
  localStorage.removeItem("guestMode");
  localStorage.removeItem("profileData");
  nav("/login");
};

const linkStyle = {
  color:"white", marginRight:"20px",
  textDecoration:"none", fontSize:"16px", fontWeight:"500"
};
const hoverStyle = (e) => { e.target.style.color = "#4da6ff"; };
const leaveStyle = (e) => { e.target.style.color = "white"; };

// First letter of name, fallback to "U"
const nameInitial = profileData?.name?.trim()?.charAt(0)?.toUpperCase() || "U";

return(
<div style={{
  backgroundColor:"#36084e", padding:"10px 40px",
  display:"flex", alignItems:"center", justifyContent:"space-between"
}}>

  <h3 style={{color:"white", margin:"0"}}>Scholarship System</h3>

  <div style={{display:"flex", alignItems:"center"}}>

    {!user && (
      <>
        <Link to="/login"    style={linkStyle} onMouseEnter={hoverStyle} onMouseLeave={leaveStyle}>Login</Link>
        <Link to="/register" style={linkStyle} onMouseEnter={hoverStyle} onMouseLeave={leaveStyle}>Register</Link>
      </>
    )}

    {user && (
      <>
        <Link to="/form"   style={linkStyle} onMouseEnter={hoverStyle} onMouseLeave={leaveStyle}>Home</Link>
        <Link to="/result" style={linkStyle} onMouseEnter={hoverStyle} onMouseLeave={leaveStyle}>Scholarships</Link>

        {/* Profile avatar icon */}
        <Link to="/profile" style={{ marginRight:"16px", textDecoration:"none", display:"flex", alignItems:"center", gap:8 }}>
          <div style={{
            width:38, height:38, borderRadius:"50%",
            border: isGuest ? "2px solid #888" : "2px solid #ff2e63",
            overflow:"hidden", background:"#1a1240",
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", flexShrink:0
          }}>
            {isGuest ? (
              <span style={{fontSize:20}}>👤</span>
            ) : profileData?.avatar ? (
              <img
                src={profileData.avatar}
                alt="avatar"
                style={{width:"100%", height:"100%", objectFit:"cover"}}
              />
            ) : (
              <span style={{color:"#ff2e63", fontWeight:700, fontSize:17}}>
                {nameInitial}
              </span>
            )}
          </div>
          {/* Show name next to icon when logged in */}
          {!isGuest && profileData?.name && (
            <span style={{color:"#fff", fontSize:14, fontWeight:500, maxWidth:100, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
              {profileData.name.split(" ")[0]}
            </span>
          )}
        </Link>

        <button onClick={logout} style={{
          backgroundColor:"#1e90ff", border:"none", color:"white",
          padding:"8px 18px", borderRadius:"5px", cursor:"pointer"
        }}>
          Logout
        </button>
      </>
    )}

  </div>
</div>
);
}

export default Navbar;

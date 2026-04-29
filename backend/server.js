const express    = require("express");
const cors       = require("cors");
const connectDB  = require("./db");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "5mb" }));      // allow base64 avatar uploads
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/auth",              require("./routes/authRoutes"));
app.use("/api/scholarships",  require("./routes/scholarshipRoutes"));

// Health check
app.get("/", (req, res) => res.json({ status: true, message: "Scholarship API running" }));

// Start server after DB connects
connectDB()
  .then(() => {
    app.listen(5000, () => console.log("✅ Server running on http://localhost:5000"));
  })
  .catch((err) => {
    console.error("❌ DB connection failed:", err);
    process.exit(1);
  });

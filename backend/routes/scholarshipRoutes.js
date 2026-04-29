const express = require("express");
const router  = express.Router();
const { protect, optionalProtect } = require("../middleware/authMiddleware");

const {
  getRecommendations,
  getAllScholarships,
  getScholarshipById,
  createScholarship,
  updateScholarship,
  deleteScholarship,
} = require("../controllers/scholarshipController");

// ── Public routes (guests can access) ──────────────────────────────
// GET /api/scholarships — list all scholarships, no auth required
// optionalProtect attaches req.user if logged in, but never blocks guests
router.get("/", optionalProtect, getAllScholarships);
router.get("/:id", optionalProtect, getScholarshipById);

// ── Protected routes (login required) ──────────────────────────────
// GET /api/scholarships/recommendations — Naive Bayes, needs real userId
router.get("/recommendations", protect, getRecommendations);

// Write operations — always require login
router.post("/",    protect, createScholarship);
router.put("/:id",  protect, updateScholarship);
router.delete("/:id", protect, deleteScholarship);

module.exports = router;
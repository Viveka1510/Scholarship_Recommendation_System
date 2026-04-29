const Scholarship = require("../models/Scholarship");
const Profile     = require("../models/Profile");
const { trainModel, scoreScholarships } = require("../naiveBayes");

let _cachedModel = null, _modelBuiltAt = null;
const MODEL_TTL_MS = 5 * 60 * 1000;

async function getOrBuildModel(scholarships) {
  const now = Date.now();
  if (_cachedModel && _modelBuiltAt && now - _modelBuiltAt < MODEL_TTL_MS) return _cachedModel;
  _cachedModel = trainModel(scholarships);
  _modelBuiltAt = now;
  return _cachedModel;
}

function isEligible(s, u) {
  const comm = s.community?.toLowerCase();
  return (
    s.education?.toLowerCase() === u.education?.toLowerCase() &&
    u.marks  >= (s.minMarks  || 0) &&
    u.income <= (s.maxIncome || Infinity) &&
    (!comm || comm === "all" || comm === u.community?.toLowerCase())
  );
}

function hardMatchPct(s, u) {
  let score = 0;
  if (s.education?.toLowerCase() === u.education?.toLowerCase()) score += 25;
  if (u.marks  >= (s.minMarks  || 0))                           score += 25;
  if (u.income <= (s.maxIncome || Infinity))                    score += 25;
  const comm = s.community?.toLowerCase();
  if (!comm || comm === "all" || comm === u.community?.toLowerCase()) score += 25;
  return score;
}

// Convert NB log-scores to 40-95% range
function nbScoresToPct(scored) {
  if (!scored.length) return [];
  const scores = scored.map(s => s._score);
  const max = Math.max(...scores), min = Math.min(...scores);
  const range = max - min || 1;
  return scored.map(s => ({ ...s, _pct: Math.round(40 + ((s._score - min) / range) * 55) }));
}

function gradeLabel(pct) {
  if (pct >= 90) return "Excellent";
  if (pct >= 75) return "Good";
  if (pct >= 55) return "Fair";
  return "Possible";
}

const getRecommendations = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ status: false, message: "Unauthorized" });

    const profile = await Profile.findOne({ userId }).lean();
    if (!profile) return res.status(404).json({ status: false, message: "Profile not found. Please fill the form first." });
    if (!profile.education || !profile.marks || !profile.community || !profile.income)
      return res.status(400).json({ status: false, message: "Please complete your academic profile first." });

    const userProfile = {
      education: profile.education,
      marks:     Number(profile.marks),
      income:    Number(profile.income),
      community: profile.community?.toLowerCase(),
      gender:    profile.gender || null,
    };

    const allScholarships = await Scholarship.find({}).lean();
    if (!allScholarships.length) return res.json({ status: true, count: 0, data: [] });

    // Section A: hard eligible
    const eligible    = allScholarships.filter(s => isEligible(s, userProfile));
    const eligibleIds = new Set(eligible.map(s => String(s._id)));

    const sectionA = eligible.map(s => ({
      scholarship: s, matchPercentage: hardMatchPct(s, userProfile),
      grade: gradeLabel(hardMatchPct(s, userProfile)), type: "exact",
    })).sort((a, b) => b.matchPercentage - a.matchPercentage);

    // Section B: Naive Bayes on ineligible scholarships
    const ineligible = allScholarships.filter(s => !eligibleIds.has(String(s._id)));
    let sectionB = [];
    if (ineligible.length > 0) {
      const model   = await getOrBuildModel(allScholarships);
      const ranked  = scoreScholarships(userProfile, ineligible, model);
      const withPct = nbScoresToPct(ranked);
      sectionB = withPct.filter(s => s._pct >= 50).slice(0, 5).map(s => ({
        scholarship: s, matchPercentage: s._pct,
        grade: gradeLabel(s._pct), type: "nb_suggested",
      }));
    }

    const combined = [...sectionA, ...sectionB];
    return res.json({ status: true, count: combined.length, exactCount: sectionA.length, nbCount: sectionB.length, data: combined });

  } catch (error) {
    console.error("[getRecommendations] Error:", error);
    return res.status(500).json({ status: false, message: "Failed to generate recommendations" });
  }
};

const getAllScholarships = async (req, res) => {
  try { const list = await Scholarship.find({}).lean(); return res.json({ status: true, count: list.length, data: list }); }
  catch (e) { return res.status(500).json({ status: false, message: "Server error" }); }
};
const getScholarshipById = async (req, res) => {
  try { const s = await Scholarship.findById(req.params.id).lean(); if (!s) return res.status(404).json({ status: false, message: "Not found" }); return res.json({ status: true, data: s }); }
  catch (e) { return res.status(500).json({ status: false, message: "Server error" }); }
};
const createScholarship = async (req, res) => {
  try { const s = await Scholarship.create(req.body); _cachedModel = null; return res.status(201).json({ status: true, data: s }); }
  catch (e) { return res.status(400).json({ status: false, message: e.message }); }
};
const updateScholarship = async (req, res) => {
  try { const s = await Scholarship.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean(); if (!s) return res.status(404).json({ status: false, message: "Not found" }); _cachedModel = null; return res.json({ status: true, data: s }); }
  catch (e) { return res.status(400).json({ status: false, message: e.message }); }
};
const deleteScholarship = async (req, res) => {
  try { const s = await Scholarship.findByIdAndDelete(req.params.id); if (!s) return res.status(404).json({ status: false, message: "Not found" }); _cachedModel = null; return res.json({ status: true, message: "Deleted" }); }
  catch (e) { return res.status(500).json({ status: false, message: e.message }); }
};

module.exports = { getRecommendations, getAllScholarships, getScholarshipById, createScholarship, updateScholarship, deleteScholarship };

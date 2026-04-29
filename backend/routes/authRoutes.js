const express  = require("express");
const router   = express.Router();
const bcrypt   = require("bcryptjs");
const { protect } = require("../middleware/authMiddleware");

const User    = require("../models/User");
const Profile = require("../models/Profile");


// ─────────────────────────────────────────────
// POST /auth/register
// Creates User + linked Profile
// ─────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ status: false, message: "All fields are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ status: false, message: "Password must be at least 6 characters" });
    }

    // Check duplicate email
    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ status: false, message: "This email is already registered. Please login." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User
    const newUser = await User.create({
      name:     name.trim(),
      email:    email.trim().toLowerCase(),
      password: hashedPassword,
    });

    // Create linked Profile
    await Profile.create({
      userId: newUser._id,
      name:   newUser.name,
      email:  newUser.email,
    });

    res.status(201).json({ status: true, message: "Registered Successfully" });

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ status: false, message: error.message });
  }
});


// ─────────────────────────────────────────────
// POST /auth/login
// Returns user + profileId
// ─────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ status: false, message: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ status: false, message: "Invalid Email or Password" });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ status: false, message: "Invalid Email or Password" });
    }

    // Find or create linked profile
    let profile = await Profile.findOne({ userId: user._id });
    if (!profile) {
      profile = await Profile.create({
        userId: user._id,
        name:   user.name,
        email:  user.email,
      });
    }

    res.json({
      status: true,
      message: "Login Success",
      user: {
        id:        user._id,
        profileId: profile._id,
        name:      profile.name  || user.name  || "",
        email:     profile.email || user.email || "",
        phone:     profile.phone  || "",
        bio:       profile.bio    || "",
        avatar:    profile.avatar || "",
        // Academic fields (populated if form was already filled)
        age:       profile.age       || "",
        dob:       profile.dob       || "",
        gender:    profile.gender    || "",
        education: profile.education || "",
        marks:     profile.marks     ?? null,
        community: profile.community || "",
        income:    profile.income    ?? null,
      },
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ status: false, message: error.message });
  }
});


// ─────────────────────────────────────────────
// GET /auth/profile/:profileId
// Fetch full profile for logged-in user
// ─────────────────────────────────────────────
router.get("/profile/:profileId", async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.profileId);
    if (!profile) {
      return res.status(404).json({ status: false, message: "Profile not found" });
    }

    res.json({ status: true, user: profile });

  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    res.status(500).json({ status: false, message: error.message });
  }
});


// ─────────────────────────────────────────────
// PUT /auth/profile/:profileId
// Update name, phone, bio, avatar
// ─────────────────────────────────────────────
router.put("/profile/:profileId", async (req, res) => {
  try {
    const { name, phone, bio, avatar } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ status: false, message: "Name cannot be empty" });
    }

    const updated = await Profile.findByIdAndUpdate(
      req.params.profileId,
      { $set: { name: name.trim(), phone: phone || "", bio: bio || "", avatar: avatar || "" } },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ status: false, message: "Profile not found" });
    }

    res.json({ status: true, message: "Profile updated successfully", user: updated });

  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);
    res.status(500).json({ status: false, message: error.message });
  }
});


// ─────────────────────────────────────────────
// PUT /auth/academic/:profileId
// Update academic / form data
// ─────────────────────────────────────────────
router.put("/academic/:profileId", async (req, res) => {
  try {
    const { age, dob, gender, education, marks, community, income } = req.body;

    // Basic validation
    if (!age || !dob || !gender || !education || marks === undefined || !community || income === undefined) {
      return res.status(400).json({ status: false, message: "All academic fields are required" });
    }

    const updated = await Profile.findByIdAndUpdate(
      req.params.profileId,
      {
        $set: {
          age:       String(age),
          dob:       String(dob),
          gender:    String(gender),
          education: String(education),
          marks:     Number(marks),
          community: String(community),
          income:    Number(income),
        },
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ status: false, message: "Profile not found" });
    }

    res.json({ status: true, message: "Academic info updated successfully", profile: updated });

  } catch (error) {
    console.error("UPDATE ACADEMIC ERROR:", error);
    res.status(500).json({ status: false, message: error.message });
  }
});


// ─────────────────────────────────────────────
// GET /auth/applications/:profileId
// Fetch scholarship applications for a user
// ─────────────────────────────────────────────
router.get("/applications/:profileId", async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.profileId).select("applications");
    if (!profile) {
      return res.status(404).json({ status: false, message: "Profile not found" });
    }

    res.json({ status: true, applications: profile.applications || [] });

  } catch (error) {
    console.error("GET APPLICATIONS ERROR:", error);
    res.status(500).json({ status: false, message: error.message });
  }
});


// ─────────────────────────────────────────────
// POST /auth/applications/:profileId
// Add a scholarship application for a user
// 🔒 Protected — guests receive 401
// ─────────────────────────────────────────────
router.post("/applications/:profileId", protect, async (req, res) => {
  try {
    const { name, date, status } = req.body;

    if (!name) {
      return res.status(400).json({ status: false, message: "Scholarship name is required" });
    }

    const profile = await Profile.findById(req.params.profileId);
    if (!profile) {
      return res.status(404).json({ status: false, message: "Profile not found" });
    }

    // Prevent duplicate applications
    const alreadyApplied = profile.applications.some(a => a.name === name);
    if (alreadyApplied) {
      return res.json({ status: false, message: "Already applied", applications: profile.applications });
    }

    profile.applications.push({ name, date: date || new Date().toLocaleDateString("en-IN"), status: status || "Applied" });
    await profile.save();

    res.json({ status: true, message: "Application saved", applications: profile.applications });

  } catch (error) {
    console.error("ADD APPLICATION ERROR:", error);
    res.status(500).json({ status: false, message: error.message });
  }
});


module.exports = router;
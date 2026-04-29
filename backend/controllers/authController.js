const User = require("../models/User");
const bcrypt = require("bcryptjs");

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log("Incoming Data:", req.body); // DEBUG

    // ✅ Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        status: false,
        message: "All fields are required"
      });
    }

    // ✅ Check if user already exists
    const existingUser = await User.findOne({ email: email.trim() });
    if (existingUser) {
      return res.status(400).json({
        status: false,
        message: "User already exists"
      });
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Create user
    const user = await User.create({
      name: name.trim(),
      email: email.trim(),
      password: hashedPassword,
    });

    console.log("User created:", user);

    // ✅ Send response (important for your frontend)
    res.status(201).json({
      status: true,
      message: "User Registered Successfully",
      user
    });

  } catch (error) {
    console.error("🔥 REGISTER ERROR:", error);

    res.status(500).json({
      status: false,
      message: error.message
    });
  }
};

module.exports = { registerUser };
const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name:      { type: String, default: "" },
    email:     { type: String, default: "" },
    phone:     { type: String, default: "" },
    bio:       { type: String, default: "" },
    avatar:    { type: String, default: "" },

    // Academic fields
    age:       { type: String, default: "" },
    dob:       { type: String, default: "" },
    gender:    { type: String, default: "" },
    education: { type: String, default: "" },
    marks:     { type: Number, default: null },
    community: { type: String, default: "" },
    income:    { type: Number, default: null },

    // Scholarship applications
    applications: [
      {
        name:   { type: String },
        date:   { type: String },
        status: { type: String, default: "Applied" },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Profile", profileSchema);

const mongoose = require("mongoose");
const Scholarship = require("./models/Scholarship");

const connectDB = async () => {
    await mongoose.connect("mongodb://127.0.0.1:27017/scholarshipDB");
    console.log("MongoDB Connected to scholarshipDB");

    const count = await Scholarship.countDocuments();
    if (count === 0) {
        await Scholarship.insertMany([

          // ── SCHOOL ──────────────────────────────────────────────────────
          { name: "Pre Matric Scholarship BC",          education: "School",  minMarks: 50, maxIncome: 500000, community: "BC",  link: "https://scholarships.gov.in/" },
          { name: "Pre Matric Scholarship MBC",         education: "School",  minMarks: 45, maxIncome: 500000, community: "MBC", link: "https://scholarships.gov.in/" },
          { name: "Pre Matric Scholarship SC",          education: "School",  minMarks: 50, maxIncome: 500000, community: "SC",  link: "https://socialjustice.gov.in/" },
          { name: "Pre Matric Scholarship ST",          education: "School",  minMarks: 50, maxIncome: 500000, community: "ST",  link: "https://scholarships.gov.in/" },
          { name: "Minority School Scholarship",        education: "School",  minMarks: 55, maxIncome: 500000, community: "BCM", link: "https://scholarships.gov.in/" },
          { name: "School Scholarship OC",              education: "School",  minMarks: 60, maxIncome: 600000, community: "OC",  link: "https://www.acescholarships.org/" },
          { name: "National Means Merit Scholarship",   education: "School",  minMarks: 55, maxIncome: 350000, community: "OC",  link: "https://dsel.education.gov.in/" },
          { name: "Chief Minister School Scholarship",  education: "School",  minMarks: 60, maxIncome: 600000, community: "all", link: "https://www.tn.gov.in/" },

          // ── DIPLOMA ─────────────────────────────────────────────────────
          { name: "Diploma Technical Scholarship BC",   education: "Diploma", minMarks: 60, maxIncome: 600000, community: "BC",  link: "https://scholarships.gov.in/" },
          { name: "Polytechnic Merit Scholarship OC",   education: "Diploma", minMarks: 65, maxIncome: 500000, community: "OC",  link: "https://scholarships.gov.in/" },
          { name: "SC Diploma Scholarship",             education: "Diploma", minMarks: 50, maxIncome: 500000, community: "SC",  link: "https://scholarships.gov.in/" },
          { name: "Diploma Scholarship MBC",            education: "Diploma", minMarks: 55, maxIncome: 500000, community: "MBC", link: "https://scholarships.gov.in/" },
          { name: "ITI/Diploma BCM Scholarship",        education: "Diploma", minMarks: 50, maxIncome: 500000, community: "BCM", link: "https://scholarships.gov.in/" },

          // ── UG ──────────────────────────────────────────────────────────
          { name: "Central Scholarship BC",             education: "UG",      minMarks: 70, maxIncome: 600000, community: "BC",  link: "https://central-scholarship.org/" },
          { name: "Post Matric Scholarship BC",         education: "UG",      minMarks: 60, maxIncome: 600000, community: "BC",  link: "https://scholarships.gov.in/" },
          { name: "Post Matric Scholarship SC",         education: "UG",      minMarks: 50, maxIncome: 600000, community: "SC",  link: "https://scholarships.gov.in/" },
          { name: "Central Sector Scholarship OC",      education: "UG",      minMarks: 80, maxIncome: 800000, community: "OC",  link: "https://www.buddy4study.com/" },
          { name: "AICTE Pragati Scholarship",          education: "UG",      minMarks: 65, maxIncome: 800000, community: "OC",  link: "https://www.aicte-india.org/" },
          { name: "AICTE Saksham Scholarship",          education: "UG",      minMarks: 60, maxIncome: 800000, community: "OC",  link: "https://www.buddy4study.com/" },
          { name: "Merit Cum Means Scholarship BCM",    education: "UG",      minMarks: 70, maxIncome: 600000, community: "BCM", link: "https://www.buddy4study.com/" },
          { name: "Top Class Education SC",             education: "UG",      minMarks: 75, maxIncome: 600000, community: "SC",  link: "https://www.buddy4study.com/" },
          { name: "UG Scholarship MBC",                 education: "UG",      minMarks: 60, maxIncome: 600000, community: "MBC", link: "https://scholarships.gov.in/" },
          { name: "ST UG Scholarship",                  education: "UG",      minMarks: 55, maxIncome: 600000, community: "ST",  link: "https://scholarships.gov.in/" },
          { name: "Chief Minister UG Scholarship",      education: "UG",      minMarks: 65, maxIncome: 800000, community: "all", link: "https://www.tn.gov.in/" },

          // ── PG ──────────────────────────────────────────────────────────
          { name: "UGC PG Scholarship OC",              education: "PG",      minMarks: 70, maxIncome: 800000, community: "OC",  link: "https://govtschemeapply.com/" },
          { name: "PG Scholarship BC",                  education: "PG",      minMarks: 65, maxIncome: 800000, community: "BC",  link: "https://scholarships.gov.in/" },
          { name: "PG Scholarship SC",                  education: "PG",      minMarks: 60, maxIncome: 800000, community: "SC",  link: "https://scholarships.gov.in/" },
          { name: "PG Scholarship MBC",                 education: "PG",      minMarks: 60, maxIncome: 800000, community: "MBC", link: "https://scholarships.gov.in/" },
          { name: "PG Scholarship BCM",                 education: "PG",      minMarks: 60, maxIncome: 800000, community: "BCM", link: "https://scholarships.gov.in/" },
          { name: "Chief Minister PG Scholarship",      education: "PG",      minMarks: 70, maxIncome: 900000, community: "all", link: "https://www.tn.gov.in/" },

          // ── PhD ─────────────────────────────────────────────────────────
          { name: "PhD Fellowship OC",                  education: "PhD",     minMarks: 75, maxIncome: 800000, community: "OC",  link: "https://www.tn.gov.in/" },
          { name: "PhD Fellowship BC",                  education: "PhD",     minMarks: 70, maxIncome: 800000, community: "BC",  link: "https://scholarships.gov.in/" },
          { name: "PhD Fellowship SC/ST",               education: "PhD",     minMarks: 65, maxIncome: 800000, community: "SC",  link: "https://scholarships.gov.in/" },

          // ── ITI ─────────────────────────────────────────────────────────
          { name: "ITI Scholarship BC",                 education: "ITI",     minMarks: 50, maxIncome: 500000, community: "BC",  link: "https://scholarships.gov.in/" },
          { name: "ITI Scholarship SC",                 education: "ITI",     minMarks: 45, maxIncome: 500000, community: "SC",  link: "https://scholarships.gov.in/" },
          { name: "ITI Scholarship OC",                 education: "ITI",     minMarks: 55, maxIncome: 500000, community: "OC",  link: "https://scholarships.gov.in/" },

        ]);
        console.log("36 Scholarships inserted!");
    }
};

module.exports = connectDB;

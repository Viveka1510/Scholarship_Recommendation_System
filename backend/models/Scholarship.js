const mongoose = require("mongoose");

const scholarshipSchema = new mongoose.Schema({

name:String,
education:String,
minMarks:Number,
maxIncome:Number,
community:String,
link:String

});

module.exports =
mongoose.model("Scholarship",scholarshipSchema);
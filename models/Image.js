const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
  },
  keyword: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  imageBinary: {
    type: Buffer,
    required: true,
  },
  host: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Image", imageSchema);

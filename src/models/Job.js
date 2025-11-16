const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const JobSchema = new Schema({
  title: String,

  link: { type: String, unique: true, index: true },
  pubDate: Date,
  guid: String,

  createdAt: Date,
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Job', JobSchema);

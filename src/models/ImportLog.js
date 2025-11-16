const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ImportLogSchema = new Schema({
  fileName: String,
  importDateTime: { type: Date, default: Date.now },
  totalFetched: Number,
  totalImported: Number,
  newJobs: Number,
  updatedJobs: Number,
  failedJobs: [Schema.Types.Mixed]
});

module.exports = mongoose.model('ImportLog', ImportLogSchema);

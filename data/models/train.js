const mongoose = require('mongoose');
const TrainSchema = require('../schemas/train');
const Train = mongoose.model('Train', TrainSchema);
module.exports = Train;
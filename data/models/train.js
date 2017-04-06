var mongoose = require('mongoose');
var TrainSchema = require('../schemas/train');
var Train = mongoose.model('Train', TrainSchema);
module.exports = Train;
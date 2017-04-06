var mongoose = require('mongoose');
var BusSchema = require('../schemas/bus');
var Bus = mongoose.model('Bus', BusSchema);
module.exports = Bus;
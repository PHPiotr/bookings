const mongoose = require('mongoose');
const BusSchema = require('../schemas/bus');
const Bus = mongoose.model('Bus', BusSchema);
module.exports = Bus;
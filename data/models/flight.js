const mongoose = require('mongoose');
const FlightSchema = require('../schemas/flight');
const Flight = mongoose.model('Flight', FlightSchema);
module.exports = Flight;
var mongoose = require('mongoose');
var HostelSchema = require('../schemas/hostel');
var Hostel = mongoose.model('Hostel', HostelSchema);
module.exports = Hostel;
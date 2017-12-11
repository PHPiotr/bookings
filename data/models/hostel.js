const mongoose = require('mongoose');
const HostelSchema = require('../schemas/hostel');
const Hostel = mongoose.model('Hostel', HostelSchema);
module.exports = Hostel;
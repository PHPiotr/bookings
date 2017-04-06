var Hostel = require('../../data/models/hostel');
function loadHostel(req, res, next) {
    Hostel.findOne({booking_number: req.params.booking_number})
        .populate('created_by')
        .exec(function (err, hostel) {
            if (err) {
                return next(err);
            }
            if (!hostel) {
                return res.status(404).send('Not found');
            }
            req.flight = hostel;
            next();
        });
}
module.exports = loadHostel;
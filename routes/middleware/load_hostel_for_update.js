const Hostel = require('../../data/models/hostel');
function loadHostel(req, res, next) {
    Hostel.findOne({booking_number: req.params.id})
        .exec(function (err, hostel) {
            if (err) {
                return next(err);
            }
            if (!hostel) {
                return res.status(404).send('Not found');
            }
            if (req.user._id != hostel.created_by.toString()) {
                return res.status(403).send(JSON.stringify(['Forbidden']));
            }
            req.hostel = hostel;
            next();
        });
}
module.exports = loadHostel;
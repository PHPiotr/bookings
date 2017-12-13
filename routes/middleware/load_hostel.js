const Hostel = require('../../data/models/hostel');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports = (req, res, next) => {
    Hostel.findOne({_id: new ObjectId(req.params.id)})
        .exec((err, hostel) => {
            if (err) {
                return next(err);
            }
            if (!hostel) {
                return res.status(404).json({
                    success: false,
                    message: 'Booking not found',
                });
            }
            if (req.user._id != hostel.created_by.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Not your booking',
                });
            }
            res.hostel = hostel;
            next();
        });
};
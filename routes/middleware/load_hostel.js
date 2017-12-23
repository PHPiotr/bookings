const Hostel = require('../../data/models/hostel');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports = (req, res, next) => {
    let id;
    try {
        id = new ObjectId(req.params.id);
    } catch (e) {
        res.statusMessage = 'Booking not found';
        return res.status(404).json({error: 'Booking not found'});
    }
    Hostel.findOne({_id: id})
        .exec((err, hostel) => {
            if (err) {
                return next(err);
            }
            if (!hostel) {
                res.statusMessage = 'Booking not found';
                return res.status(404).json({
                    success: false,
                    message: 'Booking not found',
                });
            }
            if (res.user._id != hostel.created_by.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Not your booking',
                });
            }
            res.hostel = hostel;
            next();
        });
};
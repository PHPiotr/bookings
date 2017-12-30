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
            if (!hostel) {
                return res.handleError('Booking not found', 404, next);
            }
            if (res.user._id != hostel.created_by.toString()) {
                return res.handleError('Not your booking', 403, next);
            }
            res.hostel = hostel;
            next(err);
        });
};
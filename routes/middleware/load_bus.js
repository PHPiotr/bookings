const Bus = require('../../data/models/bus');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports = (req, res, next) => {
    let id;
    try {
        id = new ObjectId(req.params.id);
    } catch (e) {
        res.statusMessage = 'Booking not found';
        return res.status(404).json({error: 'Booking not found'});
    }
    Bus.findOne({_id: id})
        .exec((err, bus) => {
            if (!bus) {
                return res.handleError('Booking not found', 404, next);
            }
            if (res.user._id != bus.created_by.toString()) {
                return res.handleError('Not your booking', 403, next);
            }
            res.bus = bus;
            next(err);
        });
};
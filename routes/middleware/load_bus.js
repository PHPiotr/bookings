const Bus = require('../../data/models/bus');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports = (req, res, next) => {
    Bus.findOne({_id: new ObjectId(req.params.id)})
        .exec((err, bus) => {
            if (err) {
                return next(err);
            }
            if (!bus) {
                return res.status(404).json({error: 'Booking not found'});
            }
            if (req.user._id != bus.created_by.toString()) {
                return res.status(403).json({error: 'Not your booking'});
            }
            res.bus = bus;
            next();
        });
};
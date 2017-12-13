const Plane = require('../../data/models/flight');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports = (req, res, next) => {
    Plane.findOne({_id: new ObjectId(req.params.id)})
        .exec((err, plane) => {
            if (err) {
                return next(err);
            }
            if (!plane) {
                return res.status(404).json({error: 'Booking not found'});
            }
            if (req.user._id != plane.created_by.toString()) {
                return res.status(403).json({error: 'Not your booking'});
            }
            res.plane = plane;
            next();
        });
};
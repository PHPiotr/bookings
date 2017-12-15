const Train = require('../../data/models/train');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports = (req, res, next) => {
    let id;
    try {
        id = new ObjectId(req.params.id);
    } catch (e) {
        return res.status(404).json({error: 'Booking not found'});
    }
    Train.findOne({_id: id})
        .exec((err, train) => {
            if (err) {
                return next(err);
            }
            if (!train) {
                return res.status(404).send({error: 'Booking not found'});
            }
            if (res.user._id != train.created_by.toString()) {
                return res.status(403).json({error: 'Not your booking'});
            }
            res.train = train;
            next();
        });
};
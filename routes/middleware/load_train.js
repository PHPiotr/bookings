const Train = require('../../data/models/train');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports = (req, res, next) => {
    Train.findOne({_id: new ObjectId(req.params.id)})
        .exec((err, train) => {
            if (err) {
                return next(err);
            }
            if (!train) {
                return res.status(404).send('Not found');
            }
            if (req.user._id != train.created_by.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Not your booking',
                });
            }
            req.train = train;
            next();
        });
}
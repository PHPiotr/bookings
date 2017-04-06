var Train = require('../../data/models/train');

function loadTrain(req, res, next) {
    Train.findOne({booking_number: req.params.booking_number})
        .populate('created_by')
        .exec(function (err, train) {
            if (err) {
                return next(err);
            }
            if (!train) {
                return res.status(404).send('Not found');
            }
            req.train = train;
            next();
        });
}

module.exports = loadTrain
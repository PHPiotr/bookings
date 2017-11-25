const Train = require('../../data/models/train');
const ObjectId = require('mongoose').Types.ObjectId;

function loadTrain(req, res, next) {
    Train.findOne({_id: new ObjectId(req.params.id)})
        .exec(function (err, train) {
            if (err) {
                return next(err);
            }
            if (!train) {
                return res.status(404).send('Not found');
            }
            if (req.user._id != train.created_by.toString()) {
                return res.status(403).send(JSON.stringify(['Forbidden']));
            }
            req.train = train;
            next();
        });
}

module.exports = loadTrain
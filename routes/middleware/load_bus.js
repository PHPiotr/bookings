const Bus = require('../../data/models/bus');
const ObjectId = require('mongoose').Types.ObjectId;

function loadBus(req, res, next) {
    Bus.findOne({_id: new ObjectId(req.params.id)})
        .exec(function (err, bus) {
            if (err) {
                return next(err);
            }
            if (!bus) {
                return res.status(404).send('Not found');
            }
            if (req.user._id != bus.created_by.toString()) {
                return res.status(403).send(JSON.stringify(['Forbidden']));
            }
            req.bus = bus;
            next();
        });
}

module.exports = loadBus;
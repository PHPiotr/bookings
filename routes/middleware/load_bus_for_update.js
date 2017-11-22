const Bus = require('../../data/models/bus');

function loadBus(req, res, next) {
    Bus.findOne({booking_number: req.params.id})
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
var Bus = require('../../data/models/bus');

function loadBus(req, res, next) {
    Bus.findOne({booking_number: req.params.booking_number})
        .populate('created_by')
        .exec(function (err, bus) {
            if (err) {
                return next(err);
            }
            if (!bus) {
                return res.status(404).send('Not found');
            }
            req.bus = bus;
            next();
        });
}

module.exports = loadBus
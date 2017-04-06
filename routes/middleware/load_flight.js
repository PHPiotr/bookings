var Flight = require('../../data/models/flight');
function loadFlight(req, res, next) {
    Flight.findOne({confirmation_code: req.params.confirmation_code})
        .populate('created_by')
        .exec(function (err, flight) {
            if (err) {
                return next(err);
            }
            if (!flight) {
                return res.status(404).send('Not found');
            }
            req.flight = flight;
            next();
        });
}
module.exports = loadFlight;
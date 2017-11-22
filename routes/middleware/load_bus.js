const Bus = require('../../data/models/bus');
const async = require('async');

function loadBus(req, res, next) {

    const match = {booking_number: req.params.id, created_by: req.user._id};

    req.active = 'buses';

    async.parallel(
        [
            (next) => {
                Bus.aggregate(
                    [
                        {$match: match},
                        {$limit: 1},
                        {
                            $project: {
                                _id: 1,
                                booking_number: 1,
                                from: 1,
                                to: 1,
                                departure_date: {
                                    $dateToString: {
                                        format: "%Y-%m-%d",
                                        date: "$departure_date"
                                    }
                                },
                                departure_time: 1,
                                arrival_time: 1,
                                return_departure_date: {
                                    $cond: ["$is_return", {
                                        $dateToString: {
                                            format: "%Y-%m-%d",
                                            date: "$return_departure_date"
                                        }
                                    }, null]
                                },
                                return_departure_time: 1,
                                return_arrival_time: 1,
                                price: {
                                    $divide: ["$price", 100]
                                },
                                created_by: 1,
                                currency: 1,
                                is_return: 1,
                            }
                        }
                    ],
                    (err, results) => {
                        if (err) {
                            return next(err);
                        }
                        if (!results && !results[0]) {
                            return next();
                        }
                        next(err, results[0]);
                    }
                );
            }
        ],
        (err, results) => {
            if (err || !results[0]) {
                return next(err);
            }
            req.bus = results[0];
            next();
        }
    );
}

module.exports = loadBus
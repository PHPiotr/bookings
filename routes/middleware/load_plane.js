const Plane = require('../../data/models/flight');
const async = require('async');

function loadPlane(req, res, next) {

    const match = {confirmation_code: req.params.id, created_by: req.user._id};
    async.parallel(
        [
            (next) => {
                Plane.aggregate(
                    [
                        {$match: match},
                        {$limit: 1},
                        {
                            $project: {
                                _id: 1,
                                confirmation_code: 1,
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
                                price: 1,
                                created_by: 1,
                                currency: 1,
                                is_return: 1,
                                seat: 1,
                                return_seat: 1,
                                checked_in: 1,
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
            if (err) {
                return next(err);
            }
            if (!results[0]) {
                return res.status(404).send('Not found');
            }
            req.plane = results[0];
            next();
        }
    );
}

module.exports = loadPlane;
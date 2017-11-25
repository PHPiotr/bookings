const Train = require('../../data/models/train');
const async = require('async');

function loadTrain(req, res, next) {

    const match = {_id: new ObjectId(req.params.id)};
    async.parallel(
        [
            (next) => {
                Train.aggregate(
                    [
                        {$match: match},
                        {$limit: 1},
                        {
                            $project: {
                                _id: 1,
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
            req.train = results[0];
            next();
        }
    );
}

module.exports = loadTrain;
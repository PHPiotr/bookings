const Hostel = require('../../data/models/hostel');
const async = require('async');

function loadHostel(req, res, next) {

    const match = {booking_number: req.params.id, created_by: req.user._id};

    req.active = 'hostels';

    async.parallel(
        [
            (next) => {
                Hostel.aggregate(
                    [
                        {$match: match},
                        {$limit: 1},
                        {
                            $project: {
                                _id: 1,
                                booking_number: 1,
                                from: 1,
                                to: 1,
                                checkin_date: {
                                    $dateToString: {
                                        format: "%Y-%m-%d",
                                        date: "$checkin_date"
                                    }
                                },
                                checkout_date: {
                                    $dateToString: {
                                        format: "%Y-%m-%d",
                                        date: "$checkout_date"
                                    }
                                },
                                price: 1,
                                hostel_name: 1,
                                hostel_address: 1,
                                created_by: 1,
                                currency: 1,
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

module.exports = loadHostel;
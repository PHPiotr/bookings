var async = require('async');
var mongoose = require('mongoose');
var loggedIn = require('./middleware/logged_in');
var validateDates = require('./middleware/validate_dates');

var Bus = require('../data/models/bus');
var Plane = require('../data/models/flight');
var Train = require('../data/models/train');
var Hostel = require('../data/models/hostel');

var express = require('express');
var router = express.Router();

router.get('/', loggedIn, validateDates, function (req, res) {

    var from, to, default_results, user_id, sort_type, criteria, journey_criteria, hostel_criteria;

    from = req.query.from;
    to = req.query.to;
    default_results = {cost: 0, avg_cost: 0, singles_quantity: '0'};
    user_id = req.user._id;
    if (from && to) {
        sort_type = {$gte: new Date(from), $lte: new Date(to)};
    } else {
        if (from) {
            sort_type = {$gte: new Date(from)};
        }
        if (to) {
            sort_type = {$lte: new Date(to)};
        }
    }

    criteria = {
        'created_by': user_id
    };
    criteria['created_by'] = user_id;
    if (sort_type) {
        journey_criteria = Object.assign({}, criteria, {'departure_date': sort_type});
        hostel_criteria = Object.assign({}, criteria, {'checkin_date': sort_type});
    } else {
        journey_criteria = criteria;
        hostel_criteria = criteria;
    }

    async.parallel(
        [
            function (next) {
                Bus.find(journey_criteria).sort('departure_date').exec(next);
            },
            function (next) {
                Plane.find(journey_criteria).sort('departure_date').exec(next);
            },
            function (next) {
                Train.find(journey_criteria).sort('departure_date').exec(next);
            },
            function (next) {
                Hostel.find(hostel_criteria).sort('checkin_date').exec(next);
            },
            function (next) {
                Bus.aggregate(
                    [
                        {
                            $match: journey_criteria
                        },
                        {
                            $project: {
                                singles_quantity: {
                                    $cond: ["$is_return", 2, 1]
                                },
                                price: 1
                            }
                        },
                        {
                            $group: {
                                _id: "$created_by",
                                cost: {$sum: "$price"},
                                avg_cost: {$avg: {$divide: ["$price", "$singles_quantity"]}},
                                singles_quantity: {$sum: "$singles_quantity"}
                            }
                        }
                    ],
                    function (err, results) {
                        if (err) {
                            return next(err);
                        }
                        if (!results) {
                            return next(err, default_results);
                        }
                        if (undefined === results[0]) {
                            return next(err, default_results);
                        }
                        next(err, results[0]);
                    }
                );
            },
            function (next) {
                Plane.aggregate(
                    [
                        {
                            $match: journey_criteria
                        },
                        {
                            $project: {
                                singles_quantity: {
                                    $cond: ["$is_return", 2, 1]
                                },
                                price: 1
                            }
                        },
                        {
                            $group: {
                                _id: "$created_by",
                                cost: {$sum: "$price"},
                                avg_cost: {$avg: {$divide: ["$price", "$singles_quantity"]}},
                                singles_quantity: {$sum: "$singles_quantity"}
                            }
                        }
                    ],
                    function (err, results) {
                        if (err) {
                            return next(err);
                        }
                        if (!results) {
                            return next(err, default_results);
                        }
                        if (undefined === results[0]) {
                            return next(err, default_results);
                        }
                        next(err, results[0]);
                    }
                );
            },
            function (next) {
                Train.aggregate(
                    [
                        {
                            $match: journey_criteria
                        },
                        {
                            $project: {
                                singles_quantity: {
                                    $cond: ["$is_return", 2, 1]
                                },
                                price: 1
                            }
                        },
                        {
                            $group: {
                                _id: "$created_by",
                                cost: {$sum: "$price"},
                                avg_cost: {$avg: {$divide: ["$price", "$singles_quantity"]}},
                                singles_quantity: {$sum: "$singles_quantity"}
                            }
                        }
                    ],
                    function (err, results) {
                        if (err) {
                            return next(err);
                        }
                        if (!results) {
                            return next(err, default_results);
                        }
                        if (undefined === results[0]) {
                            return next(err, default_results);
                        }
                        next(err, results[0]);
                    }
                );
            },
            function (next) {
                Hostel.aggregate(
                    [
                        {
                            $match: hostel_criteria
                        },
                        {
                            $group: {
                                _id: "$created_by",
                                cost: {$sum: "$price"},
                                avg_cost: {$avg: "$price"}
                            }
                        }
                    ],
                    function (err, results) {
                        if (err) {
                            return next(err);
                        }
                        if (!results) {
                            return next(err, default_results);
                        }
                        if (undefined === results[0]) {
                            return next(err, default_results);
                        }
                        next(err, results[0]);
                    }
                );
            }
        ],
        function (error, data) {
            var buses = data[0];
            var planes = data[1];
            var trains = data[2];
            var hostels = data[3];
            var buses_cost = data[4].cost;
            var buses_avg = data[4].avg_cost;
            var buses_singles_quantity = data[4].singles_quantity;
            var planes_cost = data[5].cost;
            var planes_avg = data[5].avg_cost;
            var planes_singles_quantity = data[5].singles_quantity;
            var trains_cost = data[6].cost;
            var trains_avg = data[6].avg_cost;
            var trains_singles_quantity = data[6].singles_quantity;
            var hostels_cost = data[7].cost;
            var hostels_avg = data[7].avg_cost;
            res.status(200).json(
                {
                    buses: buses,
                    planes: planes,
                    trains: trains,
                    hostels: hostels,
                    buses_cost: buses_cost.toFixed(2),
                    buses_avg: buses_avg.toFixed(2),
                    planes_cost: planes_cost.toFixed(2),
                    planes_avg: planes_avg.toFixed(2),
                    trains_cost: trains_cost.toFixed(2),
                    trains_avg: trains_avg.toFixed(2),
                    hostels_cost: hostels_cost.toFixed(2),
                    hostels_avg: hostels_avg.toFixed(2),
                    total_cost: (buses_cost + planes_cost + trains_cost + hostels_cost).toFixed(2),

                    buses_singles_quantity: buses_singles_quantity,
                    planes_singles_quantity: planes_singles_quantity,
                    trains_singles_quantity: trains_singles_quantity
                }
            );
        }
    );
});

module.exports = router;
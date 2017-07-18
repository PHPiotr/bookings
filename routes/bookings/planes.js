var async = require('async');
var Plane = require('../../data/models/flight');
var loggedIn = require('../middleware/logged_in');
var loadPlane = require('../middleware/load_plane');
var max_per_page = 10;

var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

router.get('/', loggedIn, function (req, res, next) {

    var current_page = req.query.page && parseInt(req.query.page, 10) || 1;
    var user_id = req.user._id;
    var param_type = req.query.type || '';
    var sort = {'departure_date': 1};
    var type = 'Current';
    var type_lower = param_type.toLowerCase() || type.toLowerCase();
    var newDate = new Date();
    newDate.setHours(0, 0, 0, 0);
    var match = {
        $or: [
            {"departure_date": {$gte: newDate}},
            {"return_departure_date": {$gte: newDate}}
        ],
        "created_by": user_id,
    };
    if ('past' === type_lower) {
        sort = {'departure_date': -1};
        type = 'Past';
        match = {
            $and: [
                {"departure_date": {$lt: newDate}},
                {
                    $or: [
                        {"return_departure_date": {$lt: newDate}},
                        {"return_departure_date": {$eq: null}},
                        {"return_departure_date": {$eq: ""}}
                    ]
                }
            ],
            "created_by": user_id,
        };
    }
    req.active = 'planes';

    async.parallel(
        [
            function (next) {
                Plane.aggregate(
                    [
                        {$match: match},
                        {"$sort": sort},
                        {"$skip": ((current_page - 1) * max_per_page)},
                        {"$limit": max_per_page},
                        {
                            $project: {
                                "_id": 1,
                                "confirmation_code": 1,
                                "from": 1,
                                "to": 1,
                                "departure_date": {
                                    "$dateToString": {
                                        "format": "%d/%m/%Y",
                                        "date": "$departure_date"
                                    }
                                },
                                "departure_time": {
                                    "$concat": [
                                        {"$substr": ["$departure_time", 0, 2]},
                                        ":",
                                        {"$substr": ["$departure_time", 2, 4]}
                                    ]
                                },
                                "arrival_time": {
                                    "$concat": [
                                        {"$substr": ["$arrival_time", 0, 2]},
                                        ":",
                                        {"$substr": ["$arrival_time", 2, 4]}
                                    ]
                                },
                                "return_departure_date": {
                                    $cond: ["$is_return", {
                                        "$dateToString": {
                                            "format": "%d/%m/%Y",
                                            "date": "$return_departure_date"
                                        }
                                    }, null]
                                },
                                "return_departure_time": {
                                    $cond: ["$is_return", {
                                        "$concat": [
                                            {"$substr": ["$return_departure_time", 0, 2]},
                                            ":",
                                            {"$substr": ["$return_departure_time", 2, 4]}
                                        ]
                                    }, null]
                                },
                                "return_arrival_time": {
                                    $cond: ["$is_return", {
                                        "$concat": [
                                            {"$substr": ["$return_arrival_time", 0, 2]},
                                            ":",
                                            {"$substr": ["$return_arrival_time", 2, 4]}
                                        ]
                                    }, null]
                                },
                                "price": {
                                    "$divide": ["$price", 100]
                                },
                                "created_by": 1,
                                "seat": 1,
                                "return_seat": {
                                    "$cond": ["$is_return", "$return_seat", null]
                                },
                                "checked_in": 1,
                                "currency": 1,
                                "is_return": 1
                            }
                        }
                    ],
                    function (err, results) {
                        if (err) {
                            return next(err);
                        }
                        if (!results) {
                            return next();
                        }
                        next(err, results);
                    }
                );
            },
            function (next) {
                Plane.aggregate(
                    [
                        {$match: match},
                        {
                            $project: {
                                is_return_flight: {
                                    $cond: ["$is_return", 1, 0]
                                },
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
                                flights_length: {$sum: 1},
                                return_flights_length: {$sum: "$is_return_flight"},
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
                            return next();
                        }
                        next(err, results[0]);
                    }
                );
            }
        ],
        function (err, results) {
            if (err) {
                return next(err);
            }
            var flights = results[0];
            var cost = 0, average_cost = 0, flights_length = 0, return_flights_length = 0;
            if (results[1]) {
                var aggregated = results[1];
                cost = aggregated.cost;
                average_cost = aggregated.avg_cost;
                flights_length = aggregated.flights_length;
                return_flights_length = aggregated.return_flights_length;
            }

            res.send(JSON.stringify({
                title: type + ' flights',
                flights: flights,
                current_page: current_page,
                is_first_page: current_page === 1,
                is_last_page: current_page * max_per_page >= flights_length,
                pages_count: flights_length <= max_per_page ? 1 : Math.ceil(flights_length / max_per_page),
                max_per_page: max_per_page,
                total_cost: flights_length ? (cost / 100).toFixed(2) : '0.00',
                average_cost: flights_length ? (average_cost / 100).toFixed(2) : '0.00',
                flights_length: flights_length,
                return_flights_length: return_flights_length,
                active: type_lower,
                selected: 'planes'
            }));
        }
    );
});

router.get('/:id', loggedIn, loadPlane, function (req, res) {
    res.send(JSON.stringify(req.plane));
});

router.put('/:id', loggedIn, loadPlane, function(req, res) {
    const plane = req.body;
    Plane.update(plane, function (err) {
        if (err) {
            throw new Error(err);
        }
        res.io.emit('update_plane', plane);
        res.status(204).send();
    });
});

router.post('/', loggedIn, function (req, res, next) {

    var plane = req.body;
    plane.created_by = req.user._id;
    Plane.create(plane, function (err) {
        if (err) {
            if (err.code === 11000) {
                res.status(409).send(JSON.stringify({ok: false, err: err}));
            } else {
                if (err.name === 'ValidationError') {
                    return res.status(200).send(JSON.stringify({err: err}));
                } else {
                    next(err);
                }
            }

            return;
        }
        res.io.emit('insert_plane', plane);
        res.status(200).send(JSON.stringify({ok: true, plane: plane}));
    });
});

module.exports = router;
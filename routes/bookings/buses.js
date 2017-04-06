var async = require('async');
var Bus = require('../../data/models/bus');
var loggedIn = require('../middleware/logged_in');
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
    req.active = 'buses';

    async.parallel(
        [
            function (next) {
                Bus.aggregate(
                    [
                        {$match: match},
                        {"$sort": sort},
                        {"$skip": ((current_page - 1) * max_per_page)},
                        {"$limit": max_per_page},
                        {
                            $project: {
                                "_id": 1,
                                "booking_number": 1,
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
                Bus.aggregate(
                    [
                        {$match: match},
                        {
                            $project: {
                                is_return_journey: {
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
                                journeys_length: {$sum: 1},
                                return_journeys_length: {$sum: "$is_return_journey"},
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
            var journeys = results[0];
            var journeysExist = undefined !== results[1];
            var cost = journeysExist ? results[1].cost : 0;
            var average_cost = journeysExist ? results[1].avg_cost : 0;
            var journeys_length = journeysExist ? results[1].journeys_length : 0;
            var return_journeys_length = journeysExist ? results[1].return_journeys_length : 0;

            res.send(JSON.stringify({
                title: type + ' buses',
                journeys: journeys,
                current_page: current_page,
                is_first_page: current_page === 1,
                is_last_page: current_page * max_per_page >= journeys_length,
                pages_count: journeys_length <= max_per_page ? 1 : Math.ceil(journeys_length / max_per_page),
                max_per_page: max_per_page,
                total_cost: journeys_length ? (cost / 100).toFixed(2) : '0.00',
                average_cost: journeys_length ? (average_cost / 100).toFixed(2) : '0.00',
                journeys_length: journeys_length,
                return_journeys_length: return_journeys_length,
                active: type_lower,
                selected: 'buses'
            }));
        }
    );
});
router.get('/new', loggedIn, function (req, res) {
    res.render('buses/new', {
        title: "New bus",
        currencies: Bus.schema.path('currency').enumValues,
        selected: 'buses',
        active: 'new'
    });
});

router.post('/', loggedIn, function (req, res, next) {

    var bus = req.body;
    bus.created_by = req.user._id;
    Bus.create(bus, function (err) {
        if (err) {
            if (err.code === 11000) {
                res.status(409).json({ok: false, err: err});
            } else {
                if (err.name === 'ValidationError') {
                    return res.status(200).json({err: err});
                } else {
                    next(err);
                }
            }

            return;
        }
        res.io.emit('insert_bus', bus);
        res.status(200).json({ok: true, bus: bus});
    });
});

module.exports = router;
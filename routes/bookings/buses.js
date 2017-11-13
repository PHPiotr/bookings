const async = require('async');
const Bus = require('../../data/models/bus');
const loggedIn = require('../middleware/logged_in');
const loadBus = require('../middleware/load_bus');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/', loggedIn, (req, res, next) => {

    const currentUser = req.user._id;
    const currentPage = (req.query.page && parseInt(req.query.page, 10)) || 1;
    const currentType = (req.query.type || '').toLowerCase();
    const currentLimit = (req.query.limit && parseInt(req.query.limit, 10)) || 10;
    const newDate = new Date();
    newDate.setHours(0, 0, 0, 0);

    let type;
    let sort;
    let match;

    switch (currentType) {
        case 'current':
            sort = {'departure_date': 1};
            type = 'Current';
            match = {
                $or: [
                    {"departure_date": {$gte: newDate}},
                    {"return_departure_date": {$gte: newDate}}
                ],
                "created_by": currentUser,
            };

            break;

        case 'past':
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
                "created_by": currentUser,
            };

            break;

        default:
            sort = {'departure_date': -1};
            type = 'All';
            match = {created_by: currentUser};

            break;
    }

    req.active = 'buses';

    async.parallel(
        [
            (next) => {
                Bus.aggregate(
                    [
                        {$match: match},
                        {"$sort": sort},
                        {"$skip": ((currentPage - 1) * currentLimit)},
                        {"$limit": currentLimit},
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
            (next) => {
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
        (err, results) => {
            if (err) {
                return next(err);
            }
            const journeys = results[0];
            const journeysExist = undefined !== results[1];
            const cost = journeysExist ? results[1].cost : 0;
            const averageCost = journeysExist ? results[1].avg_cost : 0;
            const journeysLength = journeysExist ? results[1].journeys_length : 0;
            const returnJourneysLength = journeysExist ? results[1].return_journeys_length : 0;

            res.send(JSON.stringify({
                title: type + ' buses',
                journeys: journeys,
                current_page: currentPage,
                is_first_page: currentPage === 1,
                is_last_page: currentPage * currentLimit >= journeysLength,
                pages_count: journeysLength <= currentLimit ? 1 : Math.ceil(journeysLength / currentLimit),
                max_per_page: currentLimit,
                total_cost: journeysLength ? (cost / 100).toFixed(2) : '0.00',
                average_cost: journeysLength ? (averageCost / 100).toFixed(2) : '0.00',
                journeys_length: journeysLength,
                return_journeys_length: returnJourneysLength,
                active: currentType,
                selected: 'buses'
            }));
        }
    );
});

router.get('/:id', loggedIn, loadBus, (req, res) => {
    res.send(JSON.stringify(req.bus));
});

router.put('/:id', loggedIn, loadBus, (req, res) => {
    const bus = req.body;
    Bus.update(bus, (err) => {
        if (err) {
            throw new Error(err);
        }
        res.io.emit('update_bus', bus);
        res.status(204).send();
    });
});

router.post('/', loggedIn, (req, res, next) => {

    var bus = req.body;
    bus.created_by = req.user._id;
    Bus.create(bus, (err) => {
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
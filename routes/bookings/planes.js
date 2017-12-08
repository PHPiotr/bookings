const async = require('async');
const Plane = require('../../data/models/flight');
const loggedIn = require('../middleware/logged_in');
const loadPlane = require('../middleware/load_plane');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;

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

    req.active = 'planes';

    async.parallel(
        [
            (next) => {
                Plane.aggregate(
                    [
                        {$match: match},
                        {"$sort": sort},
                        {"$skip": ((currentPage - 1) * currentLimit)},
                        {"$limit": currentLimit},
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
                                "price": 1,
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
            (next) => {
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
                    (err, results) => {
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
            const journeysLength = journeysExist ? results[1].flights_length : 0;
            const returnJourneysLength = journeysExist ? results[1].return_flights_length : 0;

            res.send(JSON.stringify({
                bookings: journeys,
                currentPage: currentPage,
                isFirstPage: currentPage === 1,
                isLastPage: currentPage * currentLimit >= journeysLength,
                pagesCount: journeysLength <= currentLimit ? 1 : Math.ceil(journeysLength / currentLimit),
                maxPerPage: currentLimit,
                totalCost: journeysLength ? cost.toFixed(2) : '0.00',
                averageCost: journeysLength ? averageCost.toFixed(2) : '0.00',
                bookingsLength: journeysLength,
                returnBookingsLength: returnJourneysLength,
                active: currentType,
            }));
        }
    );
});

router.get('/:id', loggedIn, loadPlane, (req, res) => {
    res.send(JSON.stringify(req.plane));
});

router.put('/:id', loggedIn, loadPlane, (req, res) => {
    const query = {_id: new ObjectId(req.plane.id)};
    const update = {$set: req.body};
    Plane.update(query, update, (err) => {
        if (err) {
            console.error(err);
            throw new Error(err);
        }
        res.io.emit('update_plane');
        res.status(204).send();
    });
});

router.delete('/:id', loggedIn, loadPlane, (req, res) => {
    Plane.remove({_id: new ObjectId(req.plane.id)}, (err) => {
        if (err) {
            throw Error(err);
        }
        res.status(204).send();
    });
});

router.post('/', loggedIn, (req, res, next) => {

    var plane = req.body;
    plane.created_by = req.user._id;
    Plane.create(plane, (err) => {
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
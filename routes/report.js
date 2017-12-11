const async = require('async');
const mongoose = require('mongoose');
const loggedIn = require('./middleware/logged_in');
const validateDates = require('./middleware/validate_dates');

const Bus = require('../data/models/bus');
const Plane = require('../data/models/flight');
const Train = require('../data/models/train');
const Hostel = require('../data/models/hostel');

const express = require('express');
const router = express.Router();

router.get('/', loggedIn, validateDates, (req, res) => {

    const {from, to} = req.query;
    const defaultResults = {cost: 0, avg_cost: 0, singles_quantity: '0'};
    const userId = req.user._id;
    const criteria = {'created_by': userId};
    let sortType, journeyCriteria, hostelCriteria;

    if (from && to) {
        sortType = {$gte: new Date(from), $lte: new Date(to)};
    } else {
        if (from) {
            sortType = {$gte: new Date(from)};
        }
        if (to) {
            sortType = {$lte: new Date(to)};
        }
    }

    if (sortType) {
        journeyCriteria = Object.assign({}, criteria, {'departure_date': sortType});
        hostelCriteria = Object.assign({}, criteria, {'checkin_date': sortType});
    } else {
        journeyCriteria = criteria;
        hostelCriteria = criteria;
    }

    async.parallel(
        [
            (next) => {
                Bus.find(journeyCriteria).sort('departure_date').exec(next);
            },
            (next) => {
                Plane.find(journeyCriteria).sort('departure_date').exec(next);
            },
            (next) => {
                Train.find(journeyCriteria).sort('departure_date').exec(next);
            },
            (next) => {
                Hostel.find(hostelCriteria).sort('checkin_date').exec(next);
            },
            (next) => {
                Bus.aggregate(
                    [
                        {
                            $match: journeyCriteria,
                        },
                        {
                            $project: {
                                singles_quantity: {
                                    $cond: ['$is_return', 2, 1],
                                },
                                price: 1,
                            },
                        },
                        {
                            $group: {
                                _id: '$created_by',
                                cost: {$sum: '$price'},
                                avg_cost: {$avg: {$divide: ['$price', '$singles_quantity']}},
                                singles_quantity: {$sum: '$singles_quantity'},
                            },
                        },
                    ],
                    (err, results) => {
                        if (err) {
                            return next(err);
                        }
                        if (!results) {
                            return next(err, defaultResults);
                        }
                        if (undefined === results[0]) {
                            return next(err, defaultResults);
                        }
                        next(err, results[0]);
                    }
                );
            },
            (next) => {
                Plane.aggregate(
                    [
                        {
                            $match: journeyCriteria,
                        },
                        {
                            $project: {
                                singles_quantity: {
                                    $cond: ['$is_return', 2, 1],
                                },
                                price: 1,
                            },
                        },
                        {
                            $group: {
                                _id: '$created_by',
                                cost: {$sum: '$price'},
                                avg_cost: {$avg: {$divide: ['$price', '$singles_quantity']}},
                                singles_quantity: {$sum: '$singles_quantity'},
                            },
                        },
                    ],
                    (err, results) => {
                        if (err) {
                            return next(err);
                        }
                        if (!results) {
                            return next(err, defaultResults);
                        }
                        if (undefined === results[0]) {
                            return next(err, defaultResults);
                        }
                        next(err, results[0]);
                    }
                );
            },
            (next) => {
                Train.aggregate(
                    [
                        {
                            $match: journeyCriteria,
                        },
                        {
                            $project: {
                                singles_quantity: {
                                    $cond: ['$is_return', 2, 1],
                                },
                                price: 1,
                            },
                        },
                        {
                            $group: {
                                _id: '$created_by',
                                cost: {$sum: '$price'},
                                avg_cost: {$avg: {$divide: ['$price', '$singles_quantity']}},
                                singles_quantity: {$sum: '$singles_quantity'},
                            },
                        },
                    ],
                    (err, results) => {
                        if (err) {
                            return next(err);
                        }
                        if (!results) {
                            return next(err, defaultResults);
                        }
                        if (undefined === results[0]) {
                            return next(err, defaultResults);
                        }
                        next(err, results[0]);
                    }
                );
            },
            (next) => {
                Hostel.aggregate(
                    [
                        {
                            $match: hostelCriteria,
                        },
                        {
                            $group: {
                                _id: '$created_by',
                                cost: {$sum: '$price'},
                                avg_cost: {$avg: '$price'},
                            },
                        },
                    ],
                    (err, results) => {
                        if (err) {
                            return next(err);
                        }
                        if (!results) {
                            return next(err, defaultResults);
                        }
                        if (undefined === results[0]) {
                            return next(err, defaultResults);
                        }
                        next(err, results[0]);
                    }
                );
            },
        ],
        (error, data) => {
            res.status(200).json(
                {
                    buses: data[0],
                    planes: data[1],
                    trains: data[2],
                    hostels: data[3],
                    busesCost: (data[4].cost).toFixed(2),
                    busesAvg: (data[4].avg_cost).toFixed(2),
                    planesCost: (data[5].cost).toFixed(2),
                    planesAvg: (data[5].avg_cost).toFixed(2),
                    trainsCost: (data[6].cost).toFixed(2),
                    trainsAvg: (data[6].avg_cost).toFixed(2),
                    hostelsCost: (data[7].cost).toFixed(2),
                    hostelsAvg: (data[7].avg_cost).toFixed(2),
                    totalCost: ((data[4].cost) + (data[5].cost) + (data[6].cost) + (data[7].cost)).toFixed(2),
                    busesSinglesQuantity: data[4].singles_quantity,
                    planesSinglesQuantity: data[5].singles_quantity,
                    trainsSinglesQuantity: data[6].singles_quantity,
                    hostelsSinglesQuantity: null,
                }
            );
        }
    );
});

module.exports = router;
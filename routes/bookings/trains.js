const async = require('async');
const Train = require('../../data/models/train');
const loggedIn = require('../middleware/logged_in');
const loadTrain = require('../middleware/load_train');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

router.get('/', loggedIn, (req, res, next) => {

    const currentUser = req.user._id;
    const currentPage = (req.query.page && parseInt(req.query.page, 10)) || 1;
    const currentType = (req.query.type || '').toLowerCase();
    const currentLimit = (req.query.limit && parseInt(req.query.limit, 10)) || 10;
    const newDate = new Date();
    newDate.setHours(0, 0, 0, 0);

    let sort;
    let match;

    switch (currentType) {
        case 'current':
            sort = {'departure_date': 1};
            match = {
                $or: [
                    {'departure_date': {$gte: newDate}},
                    {'return_departure_date': {$gte: newDate}},
                ],
                'created_by': currentUser,
            };

            break;

        case 'past':
            sort = {'departure_date': -1};
            match = {
                $and: [
                    {'departure_date': {$lt: newDate}},
                    {
                        $or: [
                            {'return_departure_date': {$lt: newDate}},
                            {'return_departure_date': {$eq: null}},
                            {'return_departure_date': {$eq: ''}},
                        ],
                    },
                ],
                'created_by': currentUser,
            };

            break;

        default:
            sort = {'departure_date': -1};
            match = {created_by: currentUser};

            break;
    }

    req.active = 'trains';

    async.parallel(
        [
            (next) => {
                Train.aggregate(
                    [
                        {$match: match},
                        {'$sort': sort},
                        {'$skip': ((currentPage - 1) * currentLimit)},
                        {'$limit': currentLimit},
                        {
                            $project: {
                                '_id': 1,
                                'from': 1,
                                'to': 1,
                                'departure_date': {
                                    '$dateToString': {
                                        'format': '%Y-%m-%d',
                                        'date': '$departure_date',
                                    },
                                },
                                'return_departure_date': {
                                    $cond: ['$is_return', {
                                        '$dateToString': {
                                            'format': '%Y-%m-%d',
                                            'date': '$return_departure_date',
                                        },
                                    }, null],
                                },
                                'price': 1,
                                'created_by': 1,
                                'currency': 1,
                                'is_return': 1,
                            },
                        },
                    ],
                    (err, results) => {
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
                Train.aggregate(
                    [
                        {$match: match},
                        {
                            $project: {
                                is_return_journey: {
                                    $cond: ['$is_return', 1, 0],
                                },
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
                                journeys_length: {$sum: 1},
                                return_journeys_length: {$sum: '$is_return_journey'},
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
                            return next();
                        }
                        next(err, results[0]);
                    }
                );
            },
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

router.get('/:id', loggedIn, loadTrain, (req, res) => {
    res.send(JSON.stringify(req.train));
});

router.put('/:id', loggedIn, loadTrain, (req, res) => {
    const query = {_id: new ObjectId(req.train._id)};
    const update = {$set: req.body};
    Train.update(query, update, (err) => {
        if (err) {
            throw Error(err);
        }
        res.io.emit('update_train');
        res.status(204).send();
    });
});

router.delete('/:id', loggedIn, loadTrain, (req, res) => {
    Train.remove({_id: new ObjectId(req.train._id)}, (err) => {
        if (err) {
            throw Error(err);
        }
        res.status(204).send();
    });
});

router.post('/', loggedIn, (req, res, next) => {
    var train = req.body;
    train.created_by = req.user._id;
    Train.create(train, function (err) {
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
        res.io.emit('insert_train', train);
        res.status(200).send(JSON.stringify({ok: true, train: train}));
    });
});

module.exports = router;
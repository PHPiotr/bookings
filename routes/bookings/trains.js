const async = require('async');
const Train = require('../../data/models/train');
const loggedIn = require('../middleware/logged_in');
const loadTrain = require('../middleware/load_train');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

router.get('/', loggedIn, (req, res) => {

    const currentUser = res.user._id;
    const currentPage = (req.query.page && parseInt(req.query.page, 10)) || 1;
    const currentType = (req.query.type || '').trim().toLowerCase();
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
            if (currentType) {
                const error = 'Unsupported booking type';
                res.statusMessage = error;

                return res.status(400).json({error});
            }
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
                    (err, results) => next(err, results)
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
                    (err, results) => next(err, results[0])
                );
            },
        ],
        (err, results) => {
            const journeys = results[0];
            const journeysExist = undefined !== results[1];
            const cost = journeysExist ? results[1].cost : 0;
            const averageCost = journeysExist ? results[1].avg_cost : 0;
            const journeysLength = journeysExist ? results[1].journeys_length : 0;
            const returnJourneysLength = journeysExist ? results[1].return_journeys_length : 0;
            res.json({
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
            });
        }
    );
});

router.get('/:id', loggedIn, loadTrain, (req, res) => {
    res.json(res.train);
});

router.put('/:id', loggedIn, loadTrain, (req, res, next) => {
    res.train.set(req.body);
    res.train.save(function (err) {
        if (err) {
            if (err.name === 'ValidationError') {
                err.message = err._message;
            }
            return res.handleError(err, 403, next);
        }
        res.status(204).send();
    });
});

router.delete('/:id', loggedIn, loadTrain, (req, res) => Train.remove({_id: new ObjectId(res.train._id)}, () => res.status(204).send()));

router.post('/', loggedIn, (req, res) => {
    const train = req.body;
    train.created_by = res.user._id;
    Train.create(train, (err, created) => {
        if (err && err.name === 'ValidationError') {
            return res.status(403).json({error: 'Booking validation failed', errors: err.errors});
        }
        res.setHeader('Location', `${req.protocol}://${req.get('host')}${process.env.API_PREFIX}/bookings/trains/${created._id}`);

        return res.status(201).send();
    });
});

module.exports = router;
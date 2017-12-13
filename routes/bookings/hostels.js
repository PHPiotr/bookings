const async = require('async');
const Hostel = require('../../data/models/hostel');
const loggedIn = require('../middleware/logged_in');
const loadHostel = require('../middleware/load_hostel');
const express = require('express');
const router = express.Router();
const ObjectId = require('mongoose').Types.ObjectId;

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
            sort = {'checkin_date': 1};
            match = {
                $or: [
                    {'checkin_date': {$gte: newDate}},
                    {'checkout_date': {$gte: newDate}},
                ],
                'created_by': currentUser,
            };

            break;

        case 'past':
            sort = {'checkin_date': -1};
            match = {
                $and: [
                    {'checkin_date': {$lt: newDate}},
                    {'checkout_date': {$lt: newDate}},
                ],
                'created_by': currentUser,
            };

            break;

        default:
            sort = {'checkin_date': -1};
            match = {created_by: currentUser};

            break;
    }

    req.active = 'hostels';

    async.parallel(
        [
            (next) => {
                Hostel.aggregate(
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
                                'booking_number': 1,
                                'checkin_date': {
                                    '$dateToString': {
                                        'format': '%d/%m/%Y',
                                        'date': '$checkin_date',
                                    },
                                },
                                'checkout_date': {
                                    '$dateToString': {
                                        'format': '%d/%m/%Y',
                                        'date': '$checkout_date',
                                    },
                                },
                                'price': 1,
                                'hostel_name': 1,
                                'hostel_address': 1,
                                'created_by': 1,
                                'currency': 1,
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
                Hostel.aggregate(
                    [
                        {$match: match},
                        {
                            $project: {
                                price: 1,
                            },
                        },
                        {
                            $group: {
                                _id: '$created_by',
                                cost: {$sum: '$price'},
                            },
                        },
                    ],
                    (err, results) => {
                        var cost;
                        if (err) {
                            return next(err);
                        }
                        if (!results) {
                            return next();
                        }
                        cost = (results[0] && results[0].cost) || '0';
                        next(err, cost);
                    }
                );
            },
        ],
        (err, results) => {
            if (err) {
                return next(err);
            }
            const bookings = results[0];
            const cost = results[1];
            const bookingsLength = bookings.length;

            res.json({
                bookings: bookings,
                currentPage: currentPage,
                isFirstPage: currentPage === 1,
                isLastPage: currentPage * currentLimit >= bookingsLength,
                pagesCount: currentLimit <= currentLimit ? 1 : Math.ceil(bookingsLength / currentLimit),
                maxPerPage: currentLimit,
                totalCost: bookingsLength ? cost.toFixed(2) : '0.00',
                averageCost: bookingsLength > 0 ? (cost / bookingsLength).toFixed(2) : '0.00',
                bookingsLength: bookingsLength,
                returnBookingsLength: null,
                active: currentType,
            });
        }
    );
});

router.get('/:id', loggedIn, loadHostel, (req, res) => {
    res.json(res.hostel);
});

router.put('/:id', loggedIn, loadHostel, (req, res) => {
    const query = {_id: new ObjectId(res.hostel.id)};
    const update = {$set: req.body};
    Hostel.update(query, update, (err) => {
        if (err) {
            throw Error(err);
        }
        res.status(204).send();
    });
});

router.delete('/:id', loggedIn, loadHostel, (req, res) => {
    Hostel.remove({_id: new ObjectId(res.hostel.id)}, (err) => {
        if (err) {
            throw Error(err);
        }
        res.status(204).send();
    });
});

router.post('/', loggedIn, (req, res, next) => {

    var hostel = req.body;
    hostel.created_by = req.user._id;
    Hostel.create(hostel, (err, created) => {
        if (err) {
            if (err.code === 11000) {
                return res.status(409).json({error: 'Booking already exists'});
            }
            if (err.name === 'ValidationError') {
                return res.status(403).json({error: 'Booking validation failed'});
            }
            return next(err);
        }
        res.setHeader('Location', `${req.protocol}://${req.get('host')}${process.env.API_PREFIX}/bookings/hostels/${created._id}`);

        return res.status(201).send();
    });
});

module.exports = router;
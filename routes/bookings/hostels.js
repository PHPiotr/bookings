var async = require('async');
var Hostel = require('../../data/models/hostel');
var loggedIn = require('../middleware/logged_in');
var loadHostel = require('../middleware/load_hostel');
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
            {"checkin_date": {$gte: newDate}},
            {"checkout_date": {$gte: newDate}}
        ],
        "created_by": user_id,
    };
    if ('past' === type_lower) {
        sort = {'checkin_date': -1};
        type = 'Past';
        match = {
            $and: [
                {"checkin_date": {$lt: newDate}},
                {"checkout_date": {$lt: newDate}}
            ],
            "created_by": user_id,
        };
    }
    req.active = 'hostels';

    async.parallel(
        [
            function (next) {
                Hostel.aggregate(
                    [
                        {$match: match},
                        {"$sort": sort},
                        {"$skip": ((current_page - 1) * max_per_page)},
                        {"$limit": max_per_page},
                        {
                            $project: {
                                "_id": 1,
                                "from": 1,
                                "to": 1,
                                "booking_number": 1,
                                "checkin_date": {
                                    "$dateToString": {
                                        "format": "%d/%m/%Y",
                                        "date": "$checkin_date"
                                    }
                                },
                                "checkout_date": {
                                    "$dateToString": {
                                        "format": "%d/%m/%Y",
                                        "date": "$checkout_date"
                                    }
                                },
                                "price": {
                                    "$divide": ["$price", 100]
                                },
                                "hostel_name": 1,
                                "hostel_address": 1,
                                "created_by": 1,
                                "currency": 1
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
                Hostel.aggregate(
                    [
                        {$match: match},
                        {
                            $project: {
                                price: 1
                            }
                        },
                        {
                            $group: {
                                _id: "$created_by",
                                cost: {$sum: "$price"},
                            }
                        }
                    ],
                    function (err, results) {
                        var cost;
                        if (err) {
                            return next(err);
                        }
                        if (!results) {
                            return next();
                        }
                        cost = undefined !== results[0] ? results[0].cost : '0';
                        next(err, cost);
                    }
                );
            }
        ],
        function (err, results) {
            if (err) {
                return next(err);
            }
            var bookings = results[0];
            var cost = results[1];
            var bookings_length = bookings.length;

            res.send(JSON.stringify({
                title: type + ' hostels',
                bookings: bookings,
                current_page: current_page,
                is_first_page: current_page === 1,
                is_last_page: current_page * max_per_page >= bookings_length,
                pages_count: bookings_length <= max_per_page ? 1 : Math.ceil(bookings_length / max_per_page),
                max_per_page: max_per_page,
                total_cost: bookings_length ? (cost / 100).toFixed(2) : '0.00',
                average_cost: bookings_length > 0 ? ((cost / bookings_length) / 100).toFixed(2) : '0.00',
                bookings_length: bookings_length,
                active: type_lower,
                selected: 'hostels'
            }));
        }
    );
});
router.get('/new', loggedIn, function (req, res) {
    res.render('hostels/new', {
        title: "New hostel",
        currencies: Hostel.schema.path('currency').enumValues,
        selected: 'hostels',
        active: 'new'
    });
});

router.get('/:id', loggedIn, loadHostel, function (req, res) {
    res.send(JSON.stringify(req.hostel));
});

router.put('/:id', loggedIn, loadHostel, function(req, res) {
    const hostel = req.body;
    Hostel.update(hostel, function (err) {
        if (err) {
            throw new Error(err);
        }
        res.io.emit('update_hostel', hostel);
        res.status(204).send();
    });
});

router.post('/', loggedIn, function (req, res, next) {

    var hostel = req.body;
    hostel.created_by = req.user._id;
    Hostel.create(hostel, function (err) {
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
        res.io.emit('insert_hostel', hostel);
        res.status(200).send(JSON.stringify({ok: true, hostel: hostel}));
    });
});

module.exports = router;
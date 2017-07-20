var User = require('../data/models/user');
var loggedIn = require('./middleware/logged_in');
var loggedInOrActivating = require('./middleware/logged_in_or_activating');
var loadUser = require('./middleware/load_user');
var express = require('express');
var router = express.Router();
var ObjectId = require('mongoose').Types.ObjectId;
var jwt = require('jsonwebtoken');

router.post('/', (req, res, next) => {
    let user = req.body;
    user.active = false;
    if (user.password !== user.repeatPassword) {
        return res.status(400).json({err: {message: 'Password not confirmed properly'}});
    }
    User.create(user, function (err, created) {
        if (!err) {
            res.io.emit('create_user', created);
            var token = jwt.sign({sub: created._id, purpose: 'activation'}, process.env.AUTH_SECRET, {algorithm: 'HS256'});
            return res.status(201).json({
                hash: token,
                user: created
            });
        }

        if (err.name === 'ValidationError') {
            return res.status(400).json({err: {message: err.message}});
        }
        if (err.code == 11000) {
            res.status(400).json({err: {message: "Such user already exists"}});
        }
    });
});

router.put('/:id', loggedInOrActivating, (req, res) => {
    try {
        if (req.decoded.sub != req.params.id) {
            throw new Error('Invalid token');
        }
        if (req.user.active && req.decoded.purpose === 'activation') {
            throw new Error('User already active');
        }
        if (!req.user.active && req.decoded.purpose === 'login') {
            throw new Error('User not active');
        }
        User.update({_id: new ObjectId(req.params.id)}, {$set: req.decoded.purpose === 'login' ? req.body : {active: true}}, (err) => {
            if (err) {
                throw new Error(err);
            }
            res.status(204).send();
        });
    } catch (e) {
        res.status(400).json({err: {message: e.message}});
    }
});

router.get('/:id', loggedIn, loadUser, (req, res, next) => {
    User.findOne({_id: new ObjectId(req.params.id)}, (err, user) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.status(200).json(user);
    });
});

module.exports = router;
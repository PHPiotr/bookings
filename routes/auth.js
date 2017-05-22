var async = require('async');
var User = require('../data/models/user');
var loggedIn = require('./middleware/logged_in');
var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');

router.post('/login', function (req, res) {

    var username = req.body.username || '';
    var password = req.body.password || '';
    var errors = {};
    if (!username) {
        errors['username'] = {message: 'Username is required'};
    }
    if (!password) {
        errors['password'] = {message: 'Password is required'};
    }

    User.findOne({
        username: username
    }, function (err, user) {
        if (err) {
            throw err;
        }
        if (!user) {
            if (username) {
                errors['username'] = {message: 'Wrong username'};
            }
            return res.json({
                ok: false,
                message: 'Validation failed',
                errors: errors,
            })
        }
        user.comparePassword(req.body.password, function (err, isMatch) {
            if (err) {
                return next(err);
            }
            if (!isMatch) {
                if (password) {
                    errors['password'] = {message: 'Wrong password'};
                }
                return res.json({
                    ok: false,
                    message: 'Validation failed',
                    errors: errors
                });
            }
            var token = jwt.sign({
                sub: user._id
            }, process.env.AUTH_SECRET, {
                expiresIn: 2880
            });
            res.io.emit(process.env.EVENT_TOKEN_RECEIVED, token);
            res.json({
                ok: true,
                token: token
            });
        });
    });
});

router.get('/verify', loggedIn, function (req, res) {
    return res.status(200).json({
        success: true,
        message: 'Token verified'
    });
});

module.exports = router;
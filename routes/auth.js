var async = require('async');
var User = require('../data/models/user');
var loggedIn = require('./middleware/logged_in');
var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');

function fail(res, msg, code) {
    res.set('WWW-Authenticate', 'Basic realm="Access to bookings"');
    res.status(code).json({msg: msg});
}

router.get('/login', (req, res, next) => {

    var b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    var [username, password] = new Buffer(b64auth, 'base64').toString().split(':');

    if (!username || !password) {
        return fail(res, 'Username/password combination does not match', 401);
    }

    User.findOne({
        username: username
    }, function (err, user) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return fail(res, 'Username/password combination does not match', 403);
        }
        user.comparePassword(password, (err, isMatch) => {
            if (err) {
                return next(err);
            }
            if (!isMatch) {
                return fail(res, 'Username/password combination does not match', 403);
            }
            if (!user.active) {
                return fail(res, 'Inactive user', 403);
            }
            var expiresIn = process.env.EXPIRES_IN;
            var token = jwt.sign({sub: user._id}, process.env.AUTH_SECRET, {expiresIn: expiresIn});
            var body = {token: token, expiresIn: expiresIn};

            res.io.emit(process.env.ON_TOKEN_RECEIVED, body);
            res.json(body);
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
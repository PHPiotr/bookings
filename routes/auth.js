const User = require('../data/models/user');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const fail = (res, msg, code) => {
    res.set('WWW-Authenticate', 'Basic realm="Access to bookings"');
    res.status(code).json({msg: msg});
};

router.get('/login', (req, res, next) => {

    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [username, password] = new Buffer(b64auth, 'base64').toString().split(':');

    if (!username || !password) {
        return fail(res, 'Username/password combination does not match', 401);
    }

    User.findOne({
        username: username,
    }, (err, user) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return fail(res, 'Username/password combination does not match', 401);
        }
        user.comparePassword(password, user.password, (err, isMatch) => {
            if (err) {
                return next(err);
            }
            if (!isMatch) {
                return fail(res, 'Username/password combination does not match', 401);
            }
            if (!user.active) {
                return fail(res, 'Inactive user', 401);
            }
            const expiresIn = process.env.EXPIRES_IN;
            const token = jwt.sign({sub: user._id, purpose: 'login'}, process.env.AUTH_SECRET, {
                expiresIn: expiresIn,
                algorithm: 'HS256',
            });
            const body = {token: token, expiresIn: expiresIn};

            res.json(body);
        });
    });
});

module.exports = router;
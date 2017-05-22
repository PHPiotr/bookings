var jwt = require('jsonwebtoken');
var User = require('../../data/models/user');

function loggedIn(req, res, next) {

    var token = req.headers['authorization'];

    if (token) {

        token = token.replace('Bearer ', '');

        return jwt.verify(token, process.env.AUTH_SECRET, function (err, decoded) {
            if (err) {
                res.io.emit(process.env.EVENT_AUTH_FAILED);
                return res.status(403).json({
                    success: false,
                    message: 'Failed to authenticate token.',
                    err: err,
                });
            }
            User.findOne({_id: decoded.sub}, function (err, user) {
                if (err) {
                    res.io.emit(process.env.EVENT_AUTH_FAILED);
                    return next(err);
                }
                if (!user) {
                    res.io.emit(process.env.EVENT_AUTH_FAILED);
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }
                res.io.emit(process.env.EVENT_AUTH_SUCCESS);
                req.decoded = decoded;
                req.user = user;
                return next();
            });
        });

    }

    res.io.emit(process.env.EVENT_AUTH_FAILED);
    res.status(403).json({
        success: false,
        message: 'No token provided.'
    });

}

module.exports = loggedIn;
var jwt = require('jsonwebtoken');
var User = require('../../data/models/user');

function loggedInOrActivating(req, res, next) {

    var token, header = req.headers['Authorization'] || req.headers['authorization'];
    if (header) {
        token = (header.match(/^Bearer\s+(\S+)$/) || [])[1];
    } else {
        token = req.params['Authorization'] || req.params['authorization'];
    }

    if (token) {

        return jwt.verify(token, process.env.AUTH_SECRET, {algorithms: 'HS256'}, function (err, decoded) {
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

module.exports = loggedInOrActivating;
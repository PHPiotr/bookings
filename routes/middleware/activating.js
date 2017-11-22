var jwt = require('jsonwebtoken');
var User = require('../../data/models/user');

function activating(req, res, next) {

    var token, header = req.headers['Authorization'] || req.headers['authorization'];
    if (header) {
        token = (header.match(/^Bearer\s+(\S+)$/) || [])[1];
    } else {
        token = req.param('Authorization') || req.param('authorization');
    }

    if (token) {

        return jwt.verify(token, process.env.AUTH_SECRET, {algorithms: 'HS256'}, function (err, decoded) {
            try {
                if (err) {
                    throw err;
                }
                if (decoded.purpose !== 'activation') {
                    throw new Error("Invalid purpose");
                }
                if (decoded.sub !== req.param('id')) {
                    throw new Error('Invalid activation code');
                }
                User.findOne({_id: decoded.sub}, function (err, user) {
                    if (err) {
                        throw err;
                    }
                    if (!user) {
                        return res.status(404).json({
                            success: false,
                            message: 'User not found'
                        });
                    }
                    if (user.active) {
                        throw new Error('User already active');
                    }
                    req.decoded = decoded;
                    req.user = user;
                    return next();
                });
            } catch (e) {
                return res.status(403).json({
                    success: false,
                    message: 'Failed to authenticate token.',
                    err: e,
                });
            }
        });

    }

    res.io.emit(process.env.EVENT_AUTH_FAILED);
    res.status(403).json({
        success: false,
        message: 'No token provided.'
    });

}

module.exports = activating;
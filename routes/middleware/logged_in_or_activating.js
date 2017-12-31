const jwt = require('jsonwebtoken');
const User = require('../../data/models/user');

module.exports = (req, res, next) => {

    const header = req.headers['Authorization'] || req.headers['authorization'];
    const token = header
        ? ((header.match(/^Bearer\s+(\S+)$/) || [])[1])
        : (req.params['Authorization'] || req.params['authorization']);

    if (!token) {
        return res.handleError('No token provided', 403, next);
    }

    return jwt.verify(token, process.env.AUTH_SECRET, {algorithms: 'HS256'}, (err, decoded) => {
        if (err) {
            return res.handleError('Failed to authenticate token', 403, next);
        }
        if (decoded.sub !== req.params.id) {
            return res.handleError('Someone else\'s token', 403, next);
        }
        User.findOne({_id: req.params.id}, (err, user) => {
            if (decoded.purpose === 'activation') {
                if (user.active) {
                    return res.handleError('User already activated', 400, next);
                }
            }
            if (!user) {
                return res.handleError('Token of user who does not exist', 403, next);
            }
            if (decoded.purpose === 'login' && !user.active) {
                return res.handleError('User not active', 403, next);
            }
            res.decoded = decoded;
            res.user = user;

            return next();
        });
    });
};
const jwt = require('jsonwebtoken');
const User = require('../../data/models/user');

module.exports = (req, res, next) => {

    const header = req.headers['Authorization'] || req.headers['authorization'];
    const token = header
        ? (header.match(/^Bearer\s+(\S+)$/) || [])[1]
        : req.params['Authorization'] || req.params['authorization'];

    if (!token) {
        return res.status(403).json({error: 'No token provided'});
    }

    return jwt.verify(token, process.env.AUTH_SECRET, {algorithms: 'HS256'}, (err, decoded) => {
        if (err) {
            return res.handleError('Failed to authenticate token', 403, next);
        }
        if (decoded.purpose !== 'login') {
            return res.status(403).json({error: 'Failed to authenticate token'});
        }
        User.findOne({_id: decoded.sub}, (err, user) => {
            if (!user) {
                return res.handleError('Token of user who does not exist', 403, next);
            }
            res.decoded = decoded;
            res.user = user;

            return next();
        });
    });
};
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
        if (err || decoded.purpose !== 'login') {
            return res.status(403).json({error: 'Failed to authenticate token'});
        }
        if (decoded.iat + process.env.EXPIRES_IN > decoded.exp) {
            return res.status(403).json({error: 'Token expired'});
        }
        User.findOne({_id: decoded.sub}, (err, user) => {
            if (err) {
                return next(err);
            }
            if (!user) {
                return res.status(404).json({error: 'User not found'});
            }
            res.decoded = decoded;
            res.user = user;

            return next();
        });
    });
};
const jwt = require('jsonwebtoken');
const User = require('../../data/models/user');

module.exports = (req, res, next) => {

    const header = req.headers['Authorization'] || req.headers['authorization'];
    const token = header
        ? ((header.match(/^Bearer\s+(\S+)$/) || [])[1])
        : (req.params['Authorization'] || req.params['authorization']);

    if (!token) {
        return res.status(403).json({error: 'No token provided'});
    }

    return jwt.verify(token, process.env.AUTH_SECRET, {algorithms: 'HS256'}, (err, decoded) => {
        if (err) {
            return res.status(403).json({error: 'Failed to authenticate token.'});
        }
        if (Math.floor(Date.now() / 1000) > decoded.exp) {
            return res.status(403).json({error: 'Token expired'});
        }
        User.findOne({_id: decoded.sub}, (err, user) => {
            if (err) {
                return next(err);
            }
            if (decoded.purpose === 'activation') {
                if (user.active) {
                    return res.status(400).json({error: 'User already activated'});
                }
                if (decoded.sub !== req.params.id) {
                    return res.status(403).json({error: 'Invalid activation code'});
                }
            }
            if (decoded.purpose === 'login' && !user.active) {
                return res.status(403).json({error: 'User not active'});
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
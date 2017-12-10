const jwt = require('jsonwebtoken');
const User = require('../../data/models/user');

module.exports = (req, res, next) => {

    let token;
    const header = req.headers['Authorization'] || req.headers['authorization'];
    if (header) {
        token = (header.match(/^Bearer\s+(\S+)$/) || [])[1];
    } else {
        token = req.params['Authorization'] || req.params['authorization'];
    }

    if (!token) {
        return res.status(403).json({success: false, message: 'No token provided'});
    }

    return jwt.verify(token, process.env.AUTH_SECRET, {algorithms: 'HS256'}, (err, decoded) => {
        if (err || decoded.purpose !== 'login') {
            return res.status(403).json({success: false, message: 'Failed to authenticate token'});
        }
        User.findOne({_id: decoded.sub}, (err, user) => {
            if (err) {
                return next(err);
            }
            if (!user) {
                return res.status(404).json({success: false, message: 'User not found'});
            }
            req.decoded = decoded;
            req.user = user;

            return next();
        });
    });
};
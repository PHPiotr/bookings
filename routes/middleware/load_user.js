const User = require('../../data/models/user');

module.exports = (req, res, next) => {
    User.findOne({username: req.params.username}, (err, user) => {
        if (!user) {
            return res.handleError('User not found', 404, next);
        }
        res.user = user;
        next(err);
    });
};
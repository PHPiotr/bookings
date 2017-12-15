const User = require('../../data/models/user');

module.exports = (req, res, next) => {
    User.findOne({username: req.params.username}, (err, user) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(404).json({error: 'User not found'});
        }
        res.user = user;
        next();
    });
};
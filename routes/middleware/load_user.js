const User = require('../../data/models/user');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports = (req, res, next) => {
    User.findOne({_id: new ObjectId(req.params.id)}, (err, user) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(404).send('User not found');
        }
        req.user = user;
        next();
    });
};
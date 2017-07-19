var User = require('../../data/models/user');
var ObjectId = require('mongoose').Types.ObjectId;
function loadUser(req, res, next) {
    User.findOne({_id: new ObjectId(req.params.id)}, function (err, user) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(404).send('Not found');
        }
        req.user = user;
        next();
    });
}
module.exports = loadUser;
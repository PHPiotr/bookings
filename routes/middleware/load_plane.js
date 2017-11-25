const Plane = require('../../data/models/flight');
const ObjectId = require('mongoose').Types.ObjectId;

function loadPlane(req, res, next) {
    Plane.findOne({_id: new ObjectId(req.params.id)})
        .exec(function (err, plane) {
            if (err) {
                return next(err);
            }
            if (!plane) {
                return res.status(404).send('Not found');
            }
            if (req.user._id != plane.created_by.toString()) {
                return res.status(403).send(JSON.stringify(['Forbidden']));
            }
            req.plane = plane;
            next();
        });
}
module.exports = loadPlane;
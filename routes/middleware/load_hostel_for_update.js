const Hostel = require('../../data/models/hostel');
const ObjectId = require('mongoose').Types.ObjectId;

function loadHostel(req, res, next) {
    Hostel.findOne({_id: new ObjectId(req.params.id)})
        .exec(function (err, hostel) {
            if (err) {
                return next(err);
            }
            if (!hostel) {
                return res.status(404).send('Not found');
            }
            if (req.user._id != hostel.created_by.toString()) {
                return res.status(403).send(JSON.stringify(['Forbidden']));
            }
            req.hostel = hostel;
            next();
        });
}
module.exports = loadHostel;
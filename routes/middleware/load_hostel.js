const Hostel = require('../../data/models/hostel');
const async = require('async');
const moment = require('moment');
function loadHostel(req, res, next) {
    Hostel.findOne({booking_number: req.params.id})
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

            hostel.checkin_date = moment(hostel.checkin_date).format('YYYY-MM-DD');
            hostel.checkout_date = moment(hostel.checkout_date).format('YYYY-MM-DD');

            req.hostel = hostel;
            next();
        });
}
module.exports = loadHostel;


// const Hostel = require('../../data/models/hostel');
// const async = require('async');
//
// function loadHostel(req, res, next) {
//
//     const match = {booking_number: req.params.id, created_by: req.user._id};
//     async.parallel(
//         [
//             (next) => {
//                 Hostel.aggregate(
//                     [
//                         {$match: match},
//                         {$limit: 1},
//                         {
//                             $project: {
//                                 _id: 1,
//                                 booking_number: 1,
//                                 from: 1,
//                                 to: 1,
//                                 checkin_date: {
//                                     $dateToString: {
//                                         format: "%Y-%m-%d",
//                                         date: "$checkin_date"
//                                     }
//                                 },
//                                 checkout_date: {
//                                     $dateToString: {
//                                         format: "%Y-%m-%d",
//                                         date: "$checkout_date"
//                                     }
//                                 },
//                                 price: 1,
//                                 hostel_name: 1,
//                                 hostel_address: 1,
//                                 created_by: 1,
//                                 currency: 1,
//                             }
//                         }
//                     ],
//                     (err, results) => {
//                         if (err) {
//                             return next(err);
//                         }
//                         if (!results && !results[0]) {
//                             return next();
//                         }
//                         next(err, results[0]);
//                     }
//                 );
//             }
//         ],
//         (err, results) => {
//             if (err || !results[0]) {
//                 return next(err);
//             }
//             req.hostel = results[0];
//             next();
//         }
//     );
// }
//
// module.exports = loadHostel;
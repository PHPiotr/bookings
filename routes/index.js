var express = require('express');
var router = express.Router();

router.get('/', function (req, res, next) {
    res.json({'hello': 'BOOKINGS 4.0'});
});

module.exports = router;

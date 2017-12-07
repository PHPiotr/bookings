const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.json({'hello': 'BOOKINGS 4.0'}));

module.exports = router;

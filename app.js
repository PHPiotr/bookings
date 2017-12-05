require('dotenv').load();

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const index = require('./routes/index');
const auth = require('./routes/auth');
const users = require('./routes/users');
const buses = require('./routes/bookings/buses');
const planes = require('./routes/bookings/planes');
const trains = require('./routes/bookings/trains');
const hostels = require('./routes/bookings/hostels');
const report = require('./routes/report');

const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const api_prefix = process.env.API_PREFIX;

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", process.env.CORS_ACCESS_CONTROL_ALLOW_ORIGIN);
    res.header("Access-Control-Allow-Headers", process.env.CORS_ACCESS_CONTROL_ALLOW_HEADERS);
    res.header("Access-Control-Allow-Methods", process.env.CORS_ACCESS_CONTROL_ALLOW_METHODS);
    res.io = io;
    next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(api_prefix + '/', index);
app.use(api_prefix + '/auth', auth);
app.use(api_prefix + '/users', users);
app.use(api_prefix + '/bookings/planes', planes);
app.use(api_prefix + '/bookings/hostels', hostels);
app.use(api_prefix + '/bookings/buses', buses);
app.use(api_prefix + '/bookings/trains', trains);
app.use(api_prefix + '/report', report);

app.use((req, res, next) => {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);

});

app.use((err, req, res) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.json({'error': err});
});

mongoose.connect(process.env.MONGODB_URI, {
    useMongoClient: true
});

module.exports = {app: app, server: server};

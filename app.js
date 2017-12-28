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
const handleError = (msg, code, next) => {
    const err = new Error(msg);
    err.status = code;
    return next(err);
};

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.CORS_ACCESS_CONTROL_ALLOW_ORIGIN);
    res.header('Access-Control-Allow-Headers', process.env.CORS_ACCESS_CONTROL_ALLOW_HEADERS);
    res.header('Access-Control-Allow-Methods', process.env.CORS_ACCESS_CONTROL_ALLOW_METHODS);
    res.io = io;
    res.handleError = handleError;
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

app.use((err, req, res, next) => {
    const errorBody = err.body || {};
    const code = errorBody.code || err.status || 500;
    const message = errorBody.message || err.message || 'Something went wrong';
    res.statusMessage = message;
    res.status(code).json({
        message: message,
        code: code,
    });
    next();
});

mongoose.connect(process.env.MONGODB_URI, {
    useMongoClient: true,
});

module.exports = {app: app, server: server};

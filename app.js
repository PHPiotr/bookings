var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var config = require('./config.js');
var index = require('./routes/index');
var auth = require('./routes/auth');
var buses = require('./routes/bookings/buses');
var planes = require('./routes/bookings/planes');
var trains = require('./routes/bookings/trains');
var hostels = require('./routes/bookings/hostels');
var report = require('./routes/report');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var api_prefix = config.api_prefix;

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", config.cors.access_control_allow_origin);
    res.header("Access-Control-Allow-Headers", config.cors.access_control_allow_headers);
    res.io = io;
    next();
});

app.set('view engine', 'pug');
app.set('superSecret', config.secret);

app.use(require('method-override')('_method'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(api_prefix + '/', index);
app.use(api_prefix + '/auth', auth);
app.use(api_prefix + '/bookings/planes', planes);
app.use(api_prefix + '/bookings/hostels', hostels);
app.use(api_prefix + '/bookings/buses', buses);
app.use(api_prefix + '/bookings/trains', trains);
app.use(api_prefix + '/report', report);

app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);

});

app.use(function (err, req, res) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.json({'error': err});
});

mongoose.connect(config.database);

module.exports = {app: app, server: server};

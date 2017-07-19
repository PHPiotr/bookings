var User = require('../data/models/user');
var loggedIn = require('./middleware/logged_in');
var loadUser = require('./middleware/load_user');
var express = require('express');
var router = express.Router();
var ObjectId = require('mongoose').Types.ObjectId;
var bcrypt = require('bcrypt-nodejs');

router.post('/', (req, res, next) => {
    let user = req.body;
    user.active = false;
    if (user.password !== user.repeatPassword) {
        return res.status(400).json({err: {message: 'Password not confirmed properly'}});
    }
    User.create(user, function (err, created) {
        if (!err) {
            res.io.emit('create_user', created);
            bcrypt.hash(created.email + process.env.AUTH_SECRET, null, null, function (err, hash) {
                if (err) {
                    return next(err);
                }
                return res.status(201).json({
                    hash: hash,
                    user: created
                });
            });
        }
        return next(err);
    });
});

router.put('/:id', loggedIn, loadUser, (req, res) => {
    User.update({_id: new ObjectId(req.params.id)}, {$set: req.body}, (err) => {
        if (err) {
            throw new Error(err);
        }
        res.status(204).send();
    });
});

router.get('/:id', loggedIn, loadUser, (req, res, next) => {
    User.findOne({_id: new ObjectId(req.params.id)}, (err, user) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.status(200).json(user);
    });
});

module.exports = router;
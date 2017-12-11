const User = require('../data/models/user');
const loggedIn = require('./middleware/logged_in');
const loggedInOrActivating = require('./middleware/logged_in_or_activating');
const loadUser = require('./middleware/load_user');
const express = require('express');
const router = express.Router();
const ObjectId = require('mongoose').Types.ObjectId;
const jwt = require('jsonwebtoken');
const sendgrid = require('sendgrid');

router.post('/', (req, res) => {
    const user = req.body.registration;
    const sendActivationEmail = !req.body.suppressEmail;

    user.active = false;
    if (user.password !== user.repeatPassword) {
        return res.status(400).json({success: false, message: 'Password not confirmed properly'});
    }
    User.create(user, (err, created) => {
        if (!err) {

            if (sendActivationEmail) {

                const activationUrl = req.body.activationUrl;
                const appName = req.body.appName;
                const activationFromEmail = req.body.activationFromEmail;
                const token = jwt.sign({
                    sub: created._id,
                    purpose: 'activation',
                }, process.env.AUTH_SECRET, {algorithm: 'HS256'});

                const helper = sendgrid.mail;
                const fromEmail = new helper.Email(activationFromEmail, appName);
                const toEmail = new helper.Email(created.email);
                const subject = `[${appName}] Activate your account`;
                const link = `${activationUrl}/${created._id}/${token}`;
                const content = new helper.Content(
                    'text/html',
                    `Hello ${created.username}! Click the following link in order to activate your account: <a href="${link}">${link}</a>`);
                const mail = new helper.Mail(fromEmail, subject, toEmail, content);

                const sg = sendgrid(process.env.SENDGRID_API_KEY);
                const request = sg.emptyRequest({
                    method: 'POST',
                    path: '/v3/mail/send',
                    body: mail.toJSON(),
                });

                sg.API(request, (error) => {
                    if (error) {
                        throw Error(error);
                    }
                });
            }

            res.setHeader('Location', `${req.protocol}://${req.get('host')}${process.env.API_PREFIX}/users/${created.username}`);

            return res.status(201).send();
        }

        if (err.name === 'ValidationError') {
            return res.status(400).json({success: false, message: err.message});
        }
        if (err.code == 11000) {
            return res.status(400).json({success: false, message: 'Such user already exists'});
        }
    });
});

router.put('/:id', loggedInOrActivating, (req, res) => {
    try {
        if (req.decoded.sub != req.params.id) {
            throw Error('Invalid token');
        }
        if (req.user.active && req.decoded.purpose === 'activation') {
            throw Error('User already active');
        }
        if (!req.user.active && req.decoded.purpose === 'login') {
            throw Error('User not active');
        }
        User.update({_id: new ObjectId(req.params.id)}, {$set: req.decoded.purpose === 'login' ? req.body : {active: true}}, (err) => {
            if (err) {
                throw Error(err);
            }
            res.status(204).send();
        });
    } catch (e) {
        res.status(400).json({success: false, message: e.message});
    }
});

router.get('/:username', loadUser, (req, res, next) => {
    User.findOne({username: req.params.username}, (err, user) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }
        const {_id, username, active, meta} = user;
        res.status(200).json({
            id: _id,
            login: username,
            isActive: active,
            createdAt: meta.created_at,
            updatedAt: meta.updated_at,
        });
    });
});

router.delete('/:username', loggedIn, (req, res) => {
    User.remove({username: req.params.username}, (err) => {
        if (err) {
            throw Error(err);
        }
        res.status(204).send();
    });
});

module.exports = router;
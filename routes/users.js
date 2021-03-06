const User = require('../data/models/user');
const loggedIn = require('./middleware/logged_in');
const loggedInOrActivating = require('./middleware/logged_in_or_activating');
const express = require('express');
const router = express.Router();
const ObjectId = require('mongoose').Types.ObjectId;
const jwt = require('jsonwebtoken');
const sendgrid = require('sendgrid');

router.post('/', (req, res, next) => {
    const user = req.body.registration;

    user.active = false;
    User.create(user, (err, created) => {
        if (!err && created) {
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

            sg.API(request, () => null);

            res.setHeader('Location', `${req.protocol}://${req.get('host')}${process.env.API_PREFIX}/users/${created.username}`);

            return res.status(201).send();
        }

        if (err.name === 'ValidationError') {
            return res.status(422).json({error: err._message, errors: err.errors});
        }
        if (err.code == 11000) {
            return res.handleError('Such user already exists', 409, next);
        }
    });
});

router.put('/:id', loggedInOrActivating, (req, res) => User.update({_id: new ObjectId(req.params.id)}, {$set: res.decoded.purpose === 'login' ? req.body : {active: true}}, () => res.status(204).send()));

router.patch('/:id', (req, res, next) => {

    const header = req.headers['Authorization'] || req.headers['authorization'];
    const token = header
        ? ((header.match(/^Bearer\s+(\S+)$/) || [])[1])
        : (req.params['Authorization'] || req.params['authorization']);

    if (!token) {
        return res.handleError('No token provided', 403, next);
    }

    const {currentPassword, newPassword, newPasswordRepeat} = req.body;

    User.findById(req.params.id, function(err, user) {
        if (!user) {
            return res.handleError('No such user', 404, next);
        }
        if (currentPassword !== undefined) {
            jwt.verify(token, process.env.AUTH_SECRET, {algorithms: 'HS256'}, (err, decoded) => {
                if (err) {
                    return res.handleError('Failed to authenticate token', 403, next);
                }
                if (decoded.purpose !== 'login') {
                    return res.status(403).json({error: 'Failed to authenticate token'});
                }
                let error;
                if (!currentPassword.trim()) {
                    error = new Error('Failed to change password');
                    error.errors = {
                        currentPassword: {
                            message: 'required field',
                        }
                    };
                    return res.handleError(error, 403, next);
                }
                user.comparePassword(currentPassword, user.password, (err, isMatch) => {
                    if (!isMatch) {
                        error = new Error('Failed to change password');
                        error.errors = {
                            currentPassword: {
                                message: 'must match current password',
                            }
                        };
                        return res.handleError(error, 403, next);
                    }
                    user.set({password: newPassword, repeatPassword: newPasswordRepeat});
                    user.save(function (err) {
                        if (err) {
                            if (err.name === 'ValidationError') {
                                err.message = 'Failed to change password';
                            }
                            return res.handleError(err, 403, next);
                        }
                        res.status(204).send();
                    });
                });
            });
        } else {
            jwt.verify(token, `${process.env.AUTH_SECRET}${user.password}`, {algorithms: 'HS256'}, (err) => {
                if (err) {
                    return res.handleError(`${err.name}: ${err.message}`, 403, next);
                }
                user.set({ password: newPassword, repeatPassword: newPasswordRepeat});
                user.save(function (err) {
                    if (err) {
                        if (err.name === 'ValidationError') {
                            err.message = err._message;
                        }
                        return res.handleError(err, 403, next);
                    }
                    res.status(204).send();
                });
            });
        }
    });
});

router.get('/current', loggedIn, (req, res) => {
    const {user: {username, email, meta: {created_at, updated_at}, active}} = res;
    res.status(200).json({
        login: username,
        email,
        createdAt: created_at,
        updatedAt: updated_at,
        isActive: active,
    });
});

router.get('/:username', (req, res, next) => {
    const id = req.params.username;
    const or = [{username: id}];
    if (ObjectId.isValid(id)) {
        or.push({_id: ObjectId(id)});
    }
    User.findOne({$or: or}, (err, user) => {
        if (!user) {
            return res.handleError('User not found', 404, next);
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

router.delete('/:username', loggedIn, (req, res) => User.remove({username: req.params.username}, () => res.status(204).send()));

module.exports = router;
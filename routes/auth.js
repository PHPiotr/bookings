const User = require('../data/models/user');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const sendgrid = require('sendgrid');

const fail = (res, msg, code) => {
    res.set('WWW-Authenticate', 'Basic realm="Access to bookings"');
    res.status(code).json({success: false, msg: msg});
};

router.get('/login', (req, res, next) => {

    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [username, password] = new Buffer(b64auth, 'base64').toString().split(':');

    if (!username || !password) {
        return fail(res, 'Username/password combination does not match', 401);
    }

    User.findOne({
        username: username,
    }, (err, user) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return fail(res, 'Username/password combination does not match', 401);
        }
        user.comparePassword(password, user.password, (err, isMatch) => {
            if (err) {
                return next(err);
            }
            if (!isMatch) {
                return fail(res, 'Username/password combination does not match', 401);
            }
            if (!user.active) {
                return res.status(403).json({success: false, msg: 'Account not active'});
            }
            const expiresIn = process.env.EXPIRES_IN;
            const token = jwt.sign({sub: user._id, purpose: 'login'}, process.env.AUTH_SECRET, {
                expiresIn: expiresIn,
                algorithm: 'HS256',
            });
            const body = {token: token, expiresIn: expiresIn};

            res.json(body);
        });
    });
});

router.post('/account-recovery', (req, res, next) => {
    const recoveryEmail = req.body && req.body.email && req.body.email.toString().trim();
    if (!recoveryEmail) {
        return res.handleError('Email address not provided', 403, next);
    }
    if (!recoveryEmail.match(/.+@.+\..+/)) {
        return res.handleError('Email address not valid', 403, next);
    }
    User.findOne({email: recoveryEmail}, (err, user) => {
        if (err) {
            return res.handleError(`${err.name}: ${err.message}`, 403, next);
        }
        if (!user) {
            // Do not allow checking if email exists or not
            return res.status(201).send();
        }

        const recoveryUrl = req.body.recoveryUrl && req.body.recoveryUrl.toString().trim();

        if (!recoveryUrl) {
            return res.handleError('Recovery url missing', 403, next);
        }

        // Single-Use JWT
        const token = jwt.sign({
            sub: user._id,
            purpose: 'password-reset',
        }, `${process.env.AUTH_SECRET}${user.password}`, {algorithm: 'HS256'});

        const recoveryFromEmail = req.body.recoveryFromEmail && req.body.recoveryFromEmail.toString().trim();
        const appName = req.body.appName && req.body.appName.toString().trim();

        const helper = sendgrid.mail;
        const fromEmail = new helper.Email(recoveryFromEmail, appName);
        const toEmail = new helper.Email(user.email);
        const subject = `[${appName}] Recover your account`;
        const link = `${recoveryUrl}/${user._id}/${token}`;
        const content = new helper.Content(
            'text/html',
            `Hello ${user.username}! Click the following link in order to recover your account: <a href="${link}">${link}</a>`);
        const mail = new helper.Mail(fromEmail, subject, toEmail, content);

        const sg = sendgrid(process.env.SENDGRID_API_KEY);
        const request = sg.emptyRequest({
            method: 'POST',
            path: '/v3/mail/send',
            body: mail.toJSON(),
        });

        sg.API(request, (err) => {
            if (err) {
                if (!req.body.suppressEmail) {
                    return res.handleError(err.message, 403, next);
                }
            }
            return res.status(201).send();
        });
    });
});

module.exports = router;
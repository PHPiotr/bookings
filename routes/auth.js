const User = require('../data/models/user');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const sendgrid = require('sendgrid');

const fail = (res, body, code) => {
    res.set('WWW-Authenticate', 'Basic realm="Access to bookings"');
    res.status(code).json(body);
};

const error = 'Username / password combination does not match';

const getErrors = (usernameMessage = '', passwordMessage = '') => ({
    username: {
        message: usernameMessage,
    },
    password: {
        message: passwordMessage,
    },
});

router.get('/login', (req, res, next) => {

    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [username, password] = new Buffer(b64auth, 'base64').toString().split(':');

    if (!username || !password) {
        return fail(res, {
            error,
            errors: getErrors(!username ? 'required field' : '', !password ? 'required field' : ''),
        }, 401);
    }

    User.findOne({username: username}, (err, user) => {
        if (!user) {
            return fail(res, {
                error,
                errors: getErrors('incorrect value', ''),
            }, 401);
        }
        user.comparePassword(password, user.password, (err, isMatch) => {
            if (!isMatch) {
                return fail(res, {
                    error,
                    errors: getErrors('', 'incorrect value'),
                }, 401);
            }
            if (!user.active) {
                return res.handleError({
                    error: 'Account not active',
                    errors: getErrors('', ''),
                }, 403, next);
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
        return res.handleError('required field', 403, next);
    }
    if (!recoveryEmail.match(/.+@.+\..+/)) {
        return res.handleError('invalid format', 403, next);
    }
    User.findOne({email: recoveryEmail}, (err, user) => {
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

        sg.API(request, () => res.status(201).send());
    });
});

module.exports = router;
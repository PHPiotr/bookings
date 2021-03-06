const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');
const should = chai.should();
const jwt = require('jsonwebtoken');
const server = app.server;
const User = require('../data/models/user');

chai.use(chaiHttp);

describe('Password reset', () => {

    const username = '__hello__';
    const username2 = '__hello2__';
    const password = '__1Hello@__';
    const newPassword = '__1World@__';
    const newPasswordRepeat = '__1World@__';
    const email = 'hello@example.com';
    const email2 = 'hello2@example.com';
    const body = {
        registration: {
            username,
            password,
            email,
            repeatPassword: password,
        },
    };
    let userId, loginToken, activationToken, passwordResetToken;
    let userId2, loginToken2, activationToken2, passwordResetToken2;
    let incorrectlyHashedLoginToken, incorrectlyHashedActivationToken;

    const cleanup = (done, callback) => {
        const onDone = () => typeof callback === 'function' ? callback(done) : done();
        chai.request(server)
            .get(`${process.env.API_PREFIX}/users/${username}`)
            .then((res) => {
                if (res.statusCode !== 200) {
                    return onDone();
                }
                const {body} = res;
                loginToken = jwt.sign({
                    sub: body.id,
                    purpose: 'login',
                }, process.env.AUTH_SECRET, {algorithm: 'HS256'});

                chai.request(server)
                    .delete(`${process.env.API_PREFIX}/users/${body.login}`)
                    .set('Authorization', `Bearer ${loginToken}`)
                    .then(() => onDone())
                    .catch(() => done());
            })
            .catch(() => done());
    };

    const createUser2 = (done) => {
        chai.request(server).post(`${process.env.API_PREFIX}/users`).send({
            registration: {
                username: username2,
                password,
                email: email2,
                repeatPassword: password,
            },
        })
        .then((res) => {
            if (res.statusCode === 201) {
                const location = res.get('Location');
                const parts = location.split('/');
                chai.request(server)
                    .get(`${process.env.API_PREFIX}/users/${parts[parts.length - 1]}`)
                    .then((res) => {
                        userId2 = res.body.id;
                        loginToken2 = jwt.sign({
                            sub: userId2,
                            purpose: 'login',
                        }, process.env.AUTH_SECRET, {algorithm: 'HS256'});
                        activationToken2 = jwt.sign({
                            sub: userId2,
                            purpose: 'activation',
                        }, process.env.AUTH_SECRET, {algorithm: 'HS256'});

                        chai.request(server)
                        .put(`${process.env.API_PREFIX}/users/${userId2}`)
                        .set('Authorization', `Bearer ${activationToken2}`)
                        .then(() => {
                            User.findOne({_id: userId2}, (err, user) => {
                                passwordResetToken2 = jwt.sign({
                                    sub: userId2,
                                    purpose: 'password-reset',
                                }, `${process.env.AUTH_SECRET}${user.password}`, {algorithm: 'HS256'});
                                done();
                            });
                        })
                        .catch(() => done());
                    })
                    .catch(() => done());
            } else {
                done();
            }
        })
        .catch(() => done());
    };

    const removeUser2 = (done) => {
        chai.request(server)
            .delete(`${process.env.API_PREFIX}/users/${username2}`)
            .set('Authorization', `Bearer ${loginToken2}`)
            .end(() => done());
    };

    before(done => cleanup(done, createUser2));

    beforeEach((done) => {
        chai.request(server).post(`${process.env.API_PREFIX}/users`).send(body).end((err, res) => {
            if (res.statusCode === 201) {
                const location = res.get('Location');
                const parts = location.split('/');
                chai.request(server)
                    .get(`${process.env.API_PREFIX}/users/${parts[parts.length - 1]}`)
                    .then((res) => {
                        userId = res.body.id;
                        loginToken = jwt.sign({
                            sub: userId,
                            purpose: 'login',
                        }, process.env.AUTH_SECRET, {algorithm: 'HS256'});
                        activationToken = jwt.sign({
                            sub: userId,
                            purpose: 'activation',
                        }, process.env.AUTH_SECRET, {algorithm: 'HS256'});

                        chai.request(server)
                            .put(`${process.env.API_PREFIX}/users/${userId}`)
                            .set('Authorization', `Bearer ${activationToken}`)
                            .end(() => {
                                User.findOne({_id: userId}, (err, user) => {
                                    passwordResetToken = jwt.sign({
                                        sub: userId,
                                        purpose: 'password-reset',
                                    }, `${process.env.AUTH_SECRET}${user.password}`, {algorithm: 'HS256'});
                                    incorrectlyHashedLoginToken = jwt.sign({
                                        sub: userId,
                                        purpose: 'login',
                                    }, `${process.env.AUTH_SECRET}${user.password}`, {algorithm: 'HS256'});
                                    incorrectlyHashedActivationToken = jwt.sign({
                                        sub: userId,
                                        purpose: 'activation',
                                    }, `${process.env.AUTH_SECRET}${user.password}`, {algorithm: 'HS256'});
                                    done();
                                });
                            });
                    })
                    .catch(() => done());
            } else {
                done();
            }
        });
    });

    after(done => cleanup(done, removeUser2));

    it('it should succeed resetting password when body and token present', (done) => {
        chai.request(server)
            .patch(`${process.env.API_PREFIX}/users/${userId}`)
            .set('Authorization', `Bearer ${passwordResetToken}`)
            .send({newPassword, newPasswordRepeat})
            .then((res) => {
                should.equal(res.status, 204);
                done();
            })
            .catch(() => done());
    });
    it('it should fail resetting password when passwords do not match', (done) => {
        chai.request(server)
            .patch(`${process.env.API_PREFIX}/users/${userId}`)
            .set('Authorization', `Bearer ${passwordResetToken}`)
            .send({newPassword, newPasswordRepeat: 'incorrect'})
            .then((res) => {
                should.equal(res.status, 403);
                done();
            });
    });
    it('it should fail resetting password when passwords too short', (done) => {
        chai.request(server)
            .patch(`${process.env.API_PREFIX}/users/${userId}`)
            .set('Authorization', `Bearer ${passwordResetToken}`)
            .send({newPassword: 'short', newPasswordRepeat: 'short'})
            .then((res) => {
                should.equal(res.status, 403);
                done();
            });
    });
    it('it should fail resetting password when password is empty string', (done) => {
        chai.request(server)
            .patch(`${process.env.API_PREFIX}/users/${userId}`)
            .set('Authorization', `Bearer ${passwordResetToken}`)
            .send({newPassword: '', newPasswordRepeat: ''})
            .then((res) => {
                should.equal(res.status, 403);
                done();
            });
    });
    it('it should fail resetting password when incorrect token purpose', (done) => {
        chai.request(server)
            .patch(`${process.env.API_PREFIX}/users/${userId}`)
            .set('Authorization', `Bearer ${loginToken}`)
            .send({newPassword, newPasswordRepeat})
            .then((res) => {
                should.equal(res.status, 403);
                chai.request(server)
                    .patch(`${process.env.API_PREFIX}/users/${userId}`)
                    .set('Authorization', `Bearer ${activationToken}`)
                    .send({newPassword, newPasswordRepeat})
                    .then((res) => {
                        should.equal(res.status, 403);
                        chai.request(server)
                            .patch(`${process.env.API_PREFIX}/users/${userId}`)
                            .set('Authorization', `Bearer ${incorrectlyHashedLoginToken}`)
                            .send({newPassword, newPasswordRepeat})
                            .then((res) => {
                                should.equal(res.status, 403);
                                chai.request(server)
                                    .patch(`${process.env.API_PREFIX}/users/${userId}`)
                                    .set('Authorization', `Bearer ${incorrectlyHashedActivationToken}`)
                                    .send({newPassword, newPasswordRepeat})
                                    .then((res) => {
                                        should.equal(res.status, 403);
                                        done();
                                    })
                                    .catch(() => done());
                            })
                            .catch(() => done());
                    })
                    .catch(() => done());
            })
            .catch(() => done());
    });
    it('it should fail resetting password when no body and no token', (done) => {
        chai.request(server)
            .patch(`${process.env.API_PREFIX}/users/${userId}`)
            .then((res) => {
                should.equal(res.status, 403);
                done();
            });
    });
    it('it should fail resetting password when no body', (done) => {
        chai.request(server)
            .patch(`${process.env.API_PREFIX}/users/${userId}`)
            .set('Authorization', `Bearer ${passwordResetToken}`)
            .then((res) => {
                should.equal(res.status, 403);
                done();
            });
    });
    it('it should fail resetting password for user who does not exist', (done) => {
        chai.request(server)
            .patch(`${process.env.API_PREFIX}/users/${userId.split('').reverse().join('')}`)
            .set('Authorization', `Bearer ${passwordResetToken}`)
            .send({newPassword, newPasswordRepeat})
            .then((res) => {
                should.equal(res.status, 404);
                done();
            });
    });
    it('it should fail resetting password while using token for different user', (done) => {
        chai.request(server)
            .patch(`${process.env.API_PREFIX}/users/${userId2}`)
            .set('Authorization', `Bearer ${passwordResetToken}`)
            .send({newPassword, newPasswordRepeat})
            .then((res) => {
                should.equal(res.status, 403);
                chai.request(server)
                    .patch(`${process.env.API_PREFIX}/users/${userId}`)
                    .set('Authorization', `Bearer ${passwordResetToken2}`)
                    .send({newPassword, newPasswordRepeat})
                    .then((res) => {
                        should.equal(res.status, 403);
                        done();
                    })
                    .catch(() => done());
            })
            .catch(() => done());
    });
});
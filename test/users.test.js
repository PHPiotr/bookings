const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');
const should = chai.should();
const jwt = require('jsonwebtoken');

const server = app.server;

chai.use(chaiHttp);

describe('Users', () => {

    const username = '__hello__';
    const password = '__1Hello@__';
    const email = 'hello@example.com';
    const basic = new Buffer(username + ':' + password).toString('base64');
    const body = {
        registration: {
            username,
            password,
            email,
            repeatPassword: password,
        },
    };
    let userId;
    let userIdWhoDoesNotExist;
    let loginToken;
    let loginTokenOfUserWhodoesNotExist;
    let activationToken;

    const cleanup = (done) => {
        chai.request(server)
            .get(`${process.env.API_PREFIX}/users/${username}`)
            .end((err, res) => {
                if (err) {
                    return done();
                }
                if (res.statusCode !== 200) {
                    return done();
                }
                const {body} = res;
                userIdWhoDoesNotExist = body.id.split('').reverse().join();
                loginToken = jwt.sign({
                    sub: body.id,
                    purpose: 'login',
                }, process.env.AUTH_SECRET, {algorithm: 'HS256'});
                loginTokenOfUserWhodoesNotExist = jwt.sign({
                    sub: userIdWhoDoesNotExist,
                    purpose: 'login',
                }, process.env.AUTH_SECRET, {algorithm: 'HS256'});

                chai.request(server)
                    .delete(`${process.env.API_PREFIX}/users/${body.login}`)
                    .set('Authorization', `Bearer ${loginToken}`)
                    .end(() => done());
            });
    };

    before(done => cleanup(done));

    beforeEach((done) => {
        chai.request(server).post(`${process.env.API_PREFIX}/users`).send(body).end((err, res) => {
            if (res.statusCode === 201) {
                chai.request(server)
                    .get(`${process.env.API_PREFIX}/users/${username}`)
                    .end((err, res) => {
                        userId = res.body.id;
                        loginToken = jwt.sign({
                            sub: userId,
                            purpose: 'login',
                        }, process.env.AUTH_SECRET, {algorithm: 'HS256'});
                        activationToken = jwt.sign({
                            sub: userId,
                            purpose: 'activation',
                        }, process.env.AUTH_SECRET, {algorithm: 'HS256'});
                        done();
                    });
            } else {
                done(err);
            }
        });
    });

    afterEach(done => cleanup(done));

    describe('View', () => {
        it('it should fail when trying to view user who does not exist', (done) => {
            chai.request(server)
                .get(`${process.env.API_PREFIX}/users/${username.split('').reverse().join('')}`)
                .set('Authorization', `Bearer ${loginToken}`)
                .end((err, res) => {
                    should.exist(err);
                    res.should.have.status(404);
                    done();
                });
        });
    });

    describe('Creation', () => {
        it('it should fail creating user when passwords do not match', (done) => {
            chai.request(server)
                .delete(`${process.env.API_PREFIX}/users/${body.login}`)
                .set('Authorization', `Bearer ${loginToken}`)
                .end(() => {
                    chai.request(server).post(`${process.env.API_PREFIX}/users`)
                        .send({
                            registration: {
                                username,
                                password,
                                email: 'hello@example.com',
                                repeatPassword: `${password} does not match`,
                            },
                        })
                        .end((err, res) => {
                            should.exist(err);
                            res.should.have.status(422);
                            done();
                        });
                });
        });
        it('it should fail creating user when password not strong enough', (done) => {
            const weakPassword = 'weak';
            chai.request(server)
                .delete(`${process.env.API_PREFIX}/users/${body.login}`)
                .set('Authorization', `Bearer ${loginToken}`)
                .end(() => {
                    chai.request(server).post(`${process.env.API_PREFIX}/users`)
                        .send({
                            registration: {
                                username,
                                password: weakPassword,
                                email: 'hello@example.com',
                                repeatPassword: weakPassword,
                            },
                        })
                        .end((err, res) => {
                            should.exist(err);
                            res.should.have.status(422);
                            done();
                        });
                });
        });
        it('it should fail creating user when email not valid', (done) => {
            chai.request(server)
                .delete(`${process.env.API_PREFIX}/users/${body.login}`)
                .set('Authorization', `Bearer ${loginToken}`)
                .end(() => {
                    chai.request(server).post(`${process.env.API_PREFIX}/users`)
                        .send({
                            registration: {
                                username,
                                password,
                                email: 'notvalidemailaddress',
                                repeatPassword: password,
                            },
                        })
                        .end((err, res) => {
                            should.exist(err);
                            res.should.have.status(422);
                            done();
                        });
                });
        });
        it('it should fail creating user who already exists', (done) => {
            chai.request(server).post(`${process.env.API_PREFIX}/users`)
                .send({
                    registration: {
                        username,
                        password,
                        email,
                        repeatPassword: password,
                    },
                })
                .end((err, res) => {
                    should.exist(err);
                    res.should.have.status(409);
                    done();
                });
        });
    });

    describe('Edition', () => {
        it('it should fail editing user when no login token', (done) => {
            chai.request(server)
                .put(`${process.env.API_PREFIX}/users/${userId}`)
                .set('Authorization', `Bearer ${activationToken}`)
                .end(() => {
                    chai.request(server)
                        .put(`${process.env.API_PREFIX}/users/${userId}`)
                        .send({active: false})
                        .end((err, res) => {
                            should.exist(err);
                            res.should.have.status(403);
                            done();
                        });
                });
        });
        it('it should fail editing user using someone else\'s token', (done) => {
            chai.request(server)
                .put(`${process.env.API_PREFIX}/users/${userId.split('').reverse().join('')}`)
                .set('Authorization', `Bearer ${loginToken}`)
                .send({active: false})
                .end((err, res) => {
                    should.exist(err);
                    res.should.have.status(403);
                    done();
                });
        });
        it('it should succeed editing user', (done) => {
            chai.request(server)
                .put(`${process.env.API_PREFIX}/users/${userId}`)
                .set('Authorization', `Bearer ${activationToken}`)
                .end(() => {
                    chai.request(server)
                        .put(`${process.env.API_PREFIX}/users/${userId}`)
                        .set('Authorization', `Bearer ${loginToken}`)
                        .send({active: false})
                        .end((err, res) => {
                            should.not.exist(err);
                            res.should.have.status(204);
                            done();
                        });
                });
        });
        it('it should fail editing user who does not exist', (done) => {
            chai.request(server)
                .put(`${process.env.API_PREFIX}/users/${userIdWhoDoesNotExist}`)
                .set('Authorization', `Bearer ${loginTokenOfUserWhodoesNotExist}`)
                .send({active: false})
                .end((err, res) => {
                    should.exist(err);
                    res.should.have.status(403);
                    done();
                });
        });
    });

    describe('Activation', () => {
        it('it should succeed activating user when activation token present', (done) => {
            chai.request(server)
                .put(`${process.env.API_PREFIX}/users/${userId}`)
                .set('Authorization', `Bearer ${activationToken}`)
                .end((err, res) => {
                    should.not.exist(err);
                    res.should.have.status(204);
                    done();
                });
        });
        it('it should fail activating user when activation token is malformed', (done) => {
            chai.request(server)
                .put(`${process.env.API_PREFIX}/users/${userId}`)
                .set('Authorization', 'Bearer malformed.json.webtoken')
                .end((err, res) => {
                    should.exist(err);
                    res.should.have.status(403);
                    done();
                });
        });
        it('it should fail activating user with token whose purpose is login', (done) => {
            chai.request(server)
                .put(`${process.env.API_PREFIX}/users/${userId}`)
                .set('Authorization', `Bearer ${loginToken}`)
                .end((err, res) => {
                    should.exist(err);
                    res.should.have.status(403);
                    done();
                });
        });
        it('it should fail when performing activation more than once', (done) => {
            chai.request(server)
                .put(`${process.env.API_PREFIX}/users/${userId}`)
                .set('Authorization', `Bearer ${activationToken}`)
                .end((err, res) => {
                    should.not.exist(err);
                    should.exist(res);
                    chai.request(server)
                        .put(`${process.env.API_PREFIX}/users/${userId}`)
                        .set('Authorization', `Bearer ${activationToken}`)
                        .end((err, res) => {
                            should.exist(err);
                            res.should.have.status(400);
                            done();
                        });
                });
        });
        it('it should fail when trying to activate non-existing user', (done) => {
            chai.request(server)
                .put(`${process.env.API_PREFIX}/users/${userId}notexistinguser`)
                .set('Authorization', `Bearer ${activationToken}`)
                .end((err, res) => {
                    should.exist(err);
                    res.should.have.status(403);
                    done();
                });
        });
        it('it should fail login user who is not active yet using activation token', (done) => {
            chai.request(server)
                .get(`${process.env.API_PREFIX}/auth/login`)
                .set('Authorization', `Bearer ${activationToken}`)
                .end((err, res) => {
                    should.exist(err);
                    res.should.have.status(401);
                    done();
                });
        });
        it('it should fail login user who is not active yet using login token', (done) => {
            chai.request(server)
                .get(`${process.env.API_PREFIX}/auth/login`)
                .set('Authorization', `Bearer ${loginToken}`)
                .end((err, res) => {
                    should.exist(err);
                    res.should.have.status(401);
                    done();
                });
        });
    });

    describe('Deactivation', () => {
        it('it should be possible to deactivate own user account', (done) => {
            chai.request(server)
                .put(`${process.env.API_PREFIX}/users/${userId}`)
                .set('Authorization', `Bearer ${activationToken}`)
                .end((err, res) => {
                    should.not.exist(err);
                    res.should.have.status(204);
                    chai.request(server)
                        .put(`${process.env.API_PREFIX}/users/${userId}`)
                        .send({active: false})
                        .set('Authorization', `Bearer ${loginToken}`)
                        .end((err, res) => {
                            should.not.exist(err);
                            res.should.have.status(204);
                            chai.request(server)
                                .get(`${process.env.API_PREFIX}/auth/login`)
                                .set('Authorization', `Basic ${basic}`)
                                .end((err, res) => {
                                    should.exist(err);
                                    res.should.have.status(403);
                                    should.exist(res.body);
                                    res.body.should.be.an('object');
                                    res.body.should.not.have.property('token');
                                    res.body.should.not.have.property('expiresIn');
                                    done();
                                });
                        });
                });
        });
    });
});
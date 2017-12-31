const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');
const should = chai.should();
const jwt = require('jsonwebtoken');

const server = app.server;

chai.use(chaiHttp);

describe('Report', () => {

    const username = '__hello__';
    const password = '__hello__';
    const body = {
        registration: {
            username,
            password,
            email: 'hello@example.com',
            repeatPassword: password,
        },
    };
    let userId;
    let loginToken;
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
                loginToken = jwt.sign({
                    sub: body.id,
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
                const location = res.get('Location');
                const parts = location.split('/');
                chai.request(server)
                    .get(`${process.env.API_PREFIX}/users/${parts[parts.length - 1]}`)
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
                        chai.request(server)
                            .put(`${process.env.API_PREFIX}/users/${userId}`)
                            .set('Authorization', `Bearer ${activationToken}`)
                            .end(() => done());
                    });
            } else {
                done();
            }
        });
    });

    after(done => cleanup(done));

    describe('Validate dates', () => {
        it('it should succeed getting report when using proper `from` and `to` dates query params', (done) => {
            chai.request(server)
                .get(`${process.env.API_PREFIX}/report?from=2017-12-03&to=2017-12-31`)
                .set('Authorization', `Bearer ${loginToken}`)
                .end((err, res) => {
                    should.not.exist(err);
                    res.should.have.status(200);
                    done();
                });
        });
        it('it should succeed getting report when using proper `from` date and no `to` date', (done) => {
            chai.request(server)
                .get(`${process.env.API_PREFIX}/report?from=2017-12-03&`)
                .set('Authorization', `Bearer ${loginToken}`)
                .end((err, res) => {
                    should.not.exist(err);
                    res.should.have.status(200);
                    done();
                });
        });
        it('it should succeed getting report when using proper no `from` date and `to` date', (done) => {
            chai.request(server)
                .get(`${process.env.API_PREFIX}/report?to=2017-12-31`)
                .set('Authorization', `Bearer ${loginToken}`)
                .end((err, res) => {
                    should.not.exist(err);
                    res.should.have.status(200);
                    done();
                });
        });
        it('it should succeed getting report when both `from` and `to` do not have values', (done) => {
            chai.request(server)
                .get(`${process.env.API_PREFIX}/report?from=&to=`)
                .set('Authorization', `Bearer ${loginToken}`)
                .end((err, res) => {
                    should.not.exist(err);
                    res.should.have.status(200);
                    done();
                });
        });
        it('it should fail getting report when `from` and/or `to` dates query params are malformed', (done) => {
            chai.request(server)
                .get(`${process.env.API_PREFIX}/report?from=2017/12/03&to=`)
                .set('Authorization', `Bearer ${loginToken}`)
                .end((err, res) => {
                    should.exist(err);
                    res.should.have.status(422);
                    done();
                });
        });
    });

});
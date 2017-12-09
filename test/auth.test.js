const auth = require('../routes/auth');
const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');
const should = chai.should();
const jwt = require('jsonwebtoken');

const server = app.server;

chai.use(chaiHttp);

describe('Auth', () => {

    const username = '__hello__';
    const password = '__hello__';
    const basic = new Buffer(username + ':' + password).toString('base64');
    const body = {
        suppressEmail: true,
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
                loginToken = jwt.sign({
                    sub: res.body._id,
                    purpose: 'login'
                }, process.env.AUTH_SECRET, {algorithm: 'HS256'});

                chai.request(server)
                    .delete(`${process.env.API_PREFIX}/users/${res.body.username}`)
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
                userId = parts[parts.length - 1];
                loginToken = jwt.sign({
                    sub: userId,
                    purpose: 'login'
                }, process.env.AUTH_SECRET, {algorithm: 'HS256'});
                activationToken = jwt.sign({
                    sub: userId,
                    purpose: 'activation'
                }, process.env.AUTH_SECRET, {algorithm: 'HS256'});
                chai.request(server)
                    .put(`${process.env.API_PREFIX}/users/${userId}`)
                    .set('Authorization', `Bearer ${activationToken}`)
                    .end(() => done());
            } else {
                done();
            }
        });
    });

    after(done => cleanup(done));

    describe('/GET /auth/login', () => {
        it('it should fail logging user in when no basic auth', (done) => {
            chai.request(server)
                .get(`${process.env.API_PREFIX}/auth/login`)
                .end((err, res) => {
                    res.should.have.status(401);
                    done();
                });
        });
        it('it should succeed logging user in when correct basic auth', (done) => {
            chai.request(server)
                .get(`${process.env.API_PREFIX}/auth/login`)
                .set('Authorization', `Basic ${basic}`)
                .end((err, res) => {
                    res.should.have.status(200);
                    done();
                });
        });
        it('it should fail logging user in when incorrect basic auth', (done) => {
            chai.request(server)
                .get(`${process.env.API_PREFIX}/auth/login`)
                .set('Authorization', `Basic incorrect`)
                .end((err, res) => {
                    res.should.have.status(401);
                    done();
                });
        });
    });
    describe('/GET /auth/verify', () => {
        it('it should fail verifying user when no bearer token', (done) => {
            chai.request(server)
                .get(`${process.env.API_PREFIX}/auth/verify`)
                .end((err, res) => {
                    res.should.have.status(403);
                    done();
                });
        });
        it('it should succeed verifying user when bearer token present', (done) => {
            chai.request(server)
                .get(`${process.env.API_PREFIX}/auth/verify`)
                .set('Authorization', `Bearer ${loginToken}`)
                .end((err, res) => {
                    res.should.have.status(200);
                    done();
                });
        });
        it('it should fail verifying user when bearer activation token used', (done) => {
            chai.request(server)
                .get(`${process.env.API_PREFIX}/auth/verify`)
                .set('Authorization', `Bearer ${activationToken}`)
                .end((err, res) => {
                    res.should.have.status(403);
                    done();
                });
        });
    });
});
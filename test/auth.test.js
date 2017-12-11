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
                userId = parts[parts.length - 1];
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

    describe('Logging in', () => {
        it('it should succeed logging user in when correct basic auth', (done) => {
            chai.request(server)
                .get(`${process.env.API_PREFIX}/auth/login`)
                .set('Authorization', `Basic ${basic}`)
                .end((err, res) => {
                    should.not.exist(err);
                    res.should.have.status(200);
                    should.exist(res.body);
                    res.body.should.be.an('object');
                    res.body.should.have.property('token');
                    res.body.should.have.property('expiresIn');
                    res.body.token.should.be.a('string');
                    res.body.expiresIn.should.be.a('string');
                    done();
                });
        });
        it('it should fail logging user in when no basic auth', (done) => {
            chai.request(server)
                .get(`${process.env.API_PREFIX}/auth/login`)
                .end((err, res) => {
                    should.exist(err);
                    res.should.have.status(401);
                    done();
                });
        });
        it('it should fail logging user in when incorrect basic auth', (done) => {
            chai.request(server)
                .get(`${process.env.API_PREFIX}/auth/login`)
                .set('Authorization', 'Basic incorrect')
                .end((err, res) => {
                    should.exist(err);
                    res.should.have.status(401);
                    done();
                });
        });
    });
});
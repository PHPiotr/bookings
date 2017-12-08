const auth = require('../routes/auth');
const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');
const should = chai.should();
const jwt = require('jsonwebtoken');

const server = app.server;

chai.use(chaiHttp);

describe('Users', () => {

    const username = 'hello';
    const password = 'hello';
    const body = {
        suppressEmail: true,
        registration: {
            username,
            password,
            email: 'hello@example.com',
            repeatPassword: 'hello',
        },
    };
    let userId;
    let loginToken;
    let activationToken;
    beforeEach((done) => {
        chai.request(server)
            .post(`${process.env.API_PREFIX}/users`)
            .send(body)
            .end((err, res) => {
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
                done();
            });
    });
    afterEach((done) => {
        chai.request(server)
            .delete(`${process.env.API_PREFIX}/users/${userId}`)
            .set('Authorization', `Bearer ${loginToken}`)
            .end(() => done());
    });
    describe('Activation', () => {
        it('it should succeed activating user when activation token present', (done) => {
            chai.request(server)
                .put(`${process.env.API_PREFIX}/users/${userId}`)
                .set('Authorization', `Bearer ${activationToken}`)
                .end((err, res) => {
                    res.should.have.status(204);
                    done();
                });
        });
        it('it should fail activating user when activation token is malformed', (done) => {
            chai.request(server)
                .put(`${process.env.API_PREFIX}/users/${userId}`)
                .set('Authorization', `Bearer malformed.json.webtoken`)
                .end((err, res) => {
                    res.should.have.status(403);
                    done();
                });
        });
        it('it should fail activating user whit token whose purpose is login', (done) => {
            chai.request(server)
                .put(`${process.env.API_PREFIX}/users/${userId}`)
                .set('Authorization', `Bearer ${loginToken}`)
                .end((err, res) => {
                    res.should.have.status(400);
                    done();
                });
        });
        it('it should fail when performing activation more than once', (done) => {
            chai.request(server)
                .put(`${process.env.API_PREFIX}/users/${userId}`)
                .set('Authorization', `Bearer ${activationToken}`)
                .end((err, res) => {
                    chai.request(server)
                        .put(`${process.env.API_PREFIX}/users/${userId}`)
                        .set('Authorization', `Bearer ${activationToken}`)
                        .end((err, res) => {
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
                    res.should.have.status(400);
                    done();
                });
        });
    });
});
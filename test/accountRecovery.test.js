const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');
const should = chai.should();
const jwt = require('jsonwebtoken');
//const bcrypt = require('bcrypt-nodejs');

const server = app.server;

chai.use(chaiHttp);

describe('Account recovery', () => {

    const username = '__hello__';
    const password = '__hello__';
    //const basic = new Buffer(username + ':' + password).toString('base64');
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
    //let passwordResetToken;

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

                        // bcrypt.hash(password, null, null, (err, hash) => {
                        //     passwordResetToken = jwt.sign({
                        //         sub: userId,
                        //         purpose: 'password-reset',
                        //     }, `${process.env.AUTH_SECRET}${hash}`, {algorithm: 'HS256'});
                        // });

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

    describe('Account recovery', () => {
        it('it should fail initiating account recovery when no body posted', (done) => {
            chai.request(server)
                .post(`${process.env.API_PREFIX}/auth/account-recovery`)
                .end((err, res) => {
                    should.exist(err);
                    res.should.have.status(403);
                    done();
                });
        });
    });
});
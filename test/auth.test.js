const auth = require('../routes/auth');
const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');
const should = chai.should();

const server = app.server;

chai.use(chaiHttp);

describe('Auth', () => {
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
                .set('Authorization', `Basic ${process.env.AUTH_BASIC}`)
                .end((err, res) => {
                    res.should.have.status(200);
                    done();
                });
        });
    });
    describe('/GET /auth/verify', () => {

        let token = '';
        before((done) => {
            chai.request(server)
                .get(`${process.env.API_PREFIX}/auth/login`)
                .set('Authorization', `Basic ${process.env.AUTH_BASIC}`)
                .end((err, res) => {
                    token = res.body.token;
                    done();
                });
        });

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
                .set('Authorization', `Bearer ${token}`)
                .end((err, res) => {
                    res.should.have.status(200);
                    done();
                });
        });
    });
});
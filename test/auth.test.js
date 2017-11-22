let auth = require('../routes/auth');
let chai = require('chai');
let chaiHttp = require('chai-http');
let mongoose = require('mongoose');
let app = require('../app');
let should = chai.should;

let server = app.server;

chai.use(chaiHttp);

const URL_PREFIX = process.env.API_PREFIX;

describe('Auth', () => {
    describe('/GET /auth/login', () => {
        it('it should have response status code 401 without basic auth header', (done) => {
            chai.request(server).get(URL_PREFIX + '/auth/login').end((err, res) => {
                res.should.have.status(401);
                done();
            });
        });
        it('it should have response status code 200 with valid basic auth header', (done) => {
            chai.request(server)
                .get(URL_PREFIX + '/auth/login')
                .set('Authorization', 'Basic cGhwaW90cjQ6cGhwaW90cjQ=')
                .end((err, res) => {
                    res.should.have.status(200);
                    done();
                });
        });
    });
    describe('/GET /auth/verify', () => {
        it('it should have response status code 403 when user is not logged in', (done) => {
            chai.request(server).get(URL_PREFIX + '/auth/verify').end((err, res) => {
                res.should.have.status(403);
                done();
            });
        });
    });
});
const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');
const should = chai.should();
const server = app.server;

chai.use(chaiHttp);

describe('API status', () => {
    it('it should return 200 status code', (done) => {
        chai.request(server)
            .get(`${process.env.API_PREFIX}`)
            .end((err, res) => {
                should.not.exist(err);
                res.should.have.status(200);
                done();
            });
    });
});
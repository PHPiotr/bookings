const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../app');
const should = chai.should();
const jwt = require('jsonwebtoken');

const server = app.server;

chai.use(chaiHttp);

const bookingTypes = ['buses', 'planes', 'trains', 'hostels'];
const pluralToSingularMapping = {
    buses: 'bus',
    planes: 'flight',
    trains: 'train',
    hostels: 'hostel',
};
const bookings = {
    buses: {
        booking_number: '__unique__',
        from: '__from__',
        to: '__to__',
        departure_date: '2017-12-13',
        departure_time: '07:25',
        price: '9.99',
    },
    planes: {
        confirmation_code: '__unique__',
        from: '__from__',
        to: '__to__',
        departure_date: '2017-12-13',
        departure_time: '07:25',
        arrival_time: '08:55',
        price: 9.99,
    },
    trains: {
        from: '__from__',
        to: '__to__',
        departure_date: '2017-12-13',
        price: 9.99,
    },
    hostels: {
        booking_number: '__unique__',
        hostel_name: '__hostel__',
        checkin_date: '2017-12-13',
        checkout_date: '2017-12-14',
        price: 9.99,
    },
};
const bookingsIds = {
    buses: null,
    planes: null,
    trains: null,
    hostels: null,
};

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

describe('Bookings', () => {

    before((done) => {
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
    });

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
                            .end(() => {
                                done();
                            });
                    });
            } else {
                done();
            }
        });
    });

    after((done) => {
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

                let index = bookingTypes.length;
                bookingTypes.forEach((bookingType) => {
                    const bookingId = bookingsIds[bookingType];
                    if (bookingId) {
                        --index;
                        chai.request(server)
                            .delete(`${process.env.API_PREFIX}/bookings/${bookingType}/${bookingId}`)
                            .set('Authorization', `Bearer ${loginToken}`)
                            .end(() => {
                                if (!index) {
                                    chai.request(server)
                                        .delete(`${process.env.API_PREFIX}/users/${username}`)
                                        .set('Authorization', `Bearer ${loginToken}`)
                                        .end();
                                }
                            });
                    }
                });
                done();
            });
    });

    afterEach((done) => {
        bookingTypes.forEach((bookingType) => {
            const bookingId = bookingsIds[bookingType];
            if (bookingId) {
                chai.request(server)
                    .delete(`${process.env.API_PREFIX}/bookings/${bookingType}/${bookingId}`)
                    .set('Authorization', `Bearer ${loginToken}`)
                    .end();
            }
        });
        done();
    });

    bookingTypes.forEach((bookingType) => {

        describe(bookingType, () => {
            it(`it should succeed creating and viewing ${bookingType} booking`, (done) => {
                chai.request(server)
                    .post(`${process.env.API_PREFIX}/bookings/${bookingType}`)
                    .send(bookings[bookingType])
                    .set('Authorization', `Bearer ${loginToken}`)
                    .end((err, res) => {
                        should.not.exist(err);
                        res.should.have.status(201);
                        const location = res.get('Location');
                        const parts = location.split('/');
                        const bookingId = parts[parts.length - 1];
                        bookingsIds[bookingType] = bookingId;
                        chai.request(server)
                            .get(`${process.env.API_PREFIX}/bookings/${bookingType}/${bookingId}`)
                            .set('Authorization', `Bearer ${loginToken}`)
                            .end((viewErr, viewRes) => {
                                should.not.exist(viewErr);
                                viewRes.should.have.status(200);
                                done();
                            });
                    });
            });
            it(`it should fail creating ${bookingType} booking which already exists`, (done) => {
                if (bookingType === 'trains') {
                    // Train has no unique fields
                    return done();
                }
                chai.request(server)
                    .post(`${process.env.API_PREFIX}/bookings/${bookingType}`)
                    .send(bookings[bookingType])
                    .set('Authorization', `Bearer ${loginToken}`)
                    .end((err, res) => {
                        const location = res.get('Location');
                        const parts = location.split('/');
                        const bookingId = parts[parts.length - 1];
                        bookingsIds[bookingType] = bookingId;
                        chai.request(server)
                            .post(`${process.env.API_PREFIX}/bookings/${bookingType}`)
                            .send(bookings[bookingType])
                            .set('Authorization', `Bearer ${loginToken}`)
                            .end((err, res) => {
                                should.exist(err);
                                res.should.have.status(409);
                                chai.request(server)
                                    .delete(`${process.env.API_PREFIX}/bookings/${bookingType}/${bookingId}`)
                                    .set('Authorization', `Bearer ${loginToken}`)
                                    .end(() => done());
                            });
                    });
            });
            it(`it should fail creating ${bookingType} booking when invalid input`, (done) => {
                chai.request(server)
                    .post(`${process.env.API_PREFIX}/bookings/${bookingType}`)
                    .send(Object.assign({}, bookings[bookingType], {price: 'invalid input'}))
                    .set('Authorization', `Bearer ${loginToken}`)
                    .end((err, res) => {
                        should.exist(err);
                        res.should.have.status(403);
                        done();
                    });
            });
            it(`it should succeed editing ${bookingType} booking`, (done) => {
                chai.request(server)
                    .post(`${process.env.API_PREFIX}/bookings/${bookingType}`)
                    .send(bookings[bookingType])
                    .set('Authorization', `Bearer ${loginToken}`)
                    .end((err, res) => {
                        const location = res.get('Location');
                        const parts = location.split('/');
                        const bookingId = parts[parts.length - 1];
                        bookingsIds[bookingType] = bookingId;
                        chai.request(server)
                            .put(`${process.env.API_PREFIX}/bookings/${bookingType}/${bookingId}`)
                            .send({price: 99.99})
                            .set('Authorization', `Bearer ${loginToken}`)
                            .end((viewErr, viewRes) => {
                                should.not.exist(viewErr);
                                viewRes.should.have.status(204);
                                done();
                            });
                    });
            });
            it(`it should succeed editing ${bookingType} booking but \`created at\` date should not be updated`, (done) => {
                let createdAt;
                chai.request(server)
                    .post(`${process.env.API_PREFIX}/bookings/${bookingType}`)
                    .send(bookings[bookingType])
                    .set('Authorization', `Bearer ${loginToken}`)
                    .end((err, res) => {
                        const location = res.get('Location');
                        const parts = location.split('/');
                        const bookingId = parts[parts.length - 1];
                        bookingsIds[bookingType] = bookingId;

                        const Model = require(`../data/models/${pluralToSingularMapping[bookingType]}`);
                        Model.findOne({_id: bookingId})
                            .exec((err, booking) => {
                                createdAt = booking.meta.created_at;
                                chai.request(server)
                                    .put(`${process.env.API_PREFIX}/bookings/${bookingType}/${bookingId}`)
                                    .send({price: 99.99, meta: {created_at: Date.now()}})
                                    .set('Authorization', `Bearer ${loginToken}`)
                                    .end(() => {
                                        Model.findOne({_id: bookingId})
                                            .exec((err, checkBooking) => {
                                                checkBooking.meta.created_at.toLocaleTimeString().should.equal(createdAt.toLocaleTimeString());
                                                done();
                                            });
                                    });
                            });
                    });
            });
            it(`it should fail viewing someone else's ${bookingType} booking`, (done) => {

                let userIdOfSomeoneElse, loginTokenOfSomeoneElse, activationTokenOfSomeoneElse;
                const usernameOfSomeoneElse = `${username}of_someone_else`;

                chai.request(server)
                    .post(`${process.env.API_PREFIX}/users`)
                    .send({
                        registration: {
                            username: usernameOfSomeoneElse,
                            password,
                            email: 'hellosomeoneelse@example.com',
                            repeatPassword: password,
                        },
                    })
                    .end((err, res) => {
                        const location = res.get('Location');
                        const parts = location.split('/');
                        chai.request(server)
                            .get(`${process.env.API_PREFIX}/users/${parts[parts.length - 1]}`)
                            .end((err, res) => {
                                userIdOfSomeoneElse = res.body.id;
                                loginTokenOfSomeoneElse = jwt.sign({
                                    sub: userIdOfSomeoneElse,
                                    purpose: 'login',
                                }, process.env.AUTH_SECRET, {algorithm: 'HS256'});
                                activationTokenOfSomeoneElse = jwt.sign({
                                    sub: userIdOfSomeoneElse,
                                    purpose: 'activation',
                                }, process.env.AUTH_SECRET, {algorithm: 'HS256'});
                                chai.request(server)
                                    .put(`${process.env.API_PREFIX}/users/${userIdOfSomeoneElse}`)
                                    .set('Authorization', `Bearer ${activationTokenOfSomeoneElse}`)
                                    .end(() => {
                                        chai.request(server)
                                            .post(`${process.env.API_PREFIX}/bookings/${bookingType}`)
                                            .send(bookings[bookingType])
                                            .set('Authorization', `Bearer ${loginToken}`)
                                            .end((err, res) => {
                                                const location = res.get('Location');
                                                const parts = location.split('/');
                                                const bookingId = parts[parts.length - 1];
                                                bookingsIds[bookingType] = bookingId;
                                                chai.request(server)
                                                    .get(`${process.env.API_PREFIX}/bookings/${bookingType}/${bookingId}`)
                                                    .set('Authorization', `Bearer ${loginTokenOfSomeoneElse}`)
                                                    .end((err, res) => {
                                                        should.exist(err);
                                                        res.should.have.status(403);
                                                        chai.request(server)
                                                            .delete(`${process.env.API_PREFIX}/users/${usernameOfSomeoneElse}`)
                                                            .set('Authorization', `Bearer ${loginTokenOfSomeoneElse}`)
                                                            .end(() => done());
                                                    });
                                            });
                                    });
                            });
                });
            });

            it(`it should fail listing someone else's ${bookingType} bookings`, (done) => {

                let userIdOfSomeoneElse, loginTokenOfSomeoneElse;
                const usernameOfSomeoneElse = `${username}of_someone_else`;

                chai.request(server)
                    .post(`${process.env.API_PREFIX}/users`)
                    .send({
                        registration: {
                            username: usernameOfSomeoneElse,
                            password,
                            email: 'hellosomeoneelse@example.com',
                            repeatPassword: password,
                        },
                    })
                    .end((err, res) => {
                        const location = res.get('Location');
                        const parts = location.split('/');
                        chai.request(server)
                            .get(`${process.env.API_PREFIX}/users/${parts[parts.length - 1]}`)
                            .end((err, res) => {
                                userIdOfSomeoneElse = res.body.id;
                                loginTokenOfSomeoneElse = jwt.sign({
                                    sub: userIdOfSomeoneElse,
                                    purpose: 'login',
                                }, process.env.AUTH_SECRET, {algorithm: 'HS256'});
                                chai.request(server)
                                    .delete(`${process.env.API_PREFIX}/users/${usernameOfSomeoneElse}`)
                                    .set('Authorization', `Bearer ${loginTokenOfSomeoneElse}`)
                                    .end(() => {
                                        chai.request(server)
                                            .get(`${process.env.API_PREFIX}/bookings/${bookingType}`)
                                            .set('Authorization', `Bearer ${loginTokenOfSomeoneElse}`)
                                            .end((err, res) => {
                                                should.exist(err);
                                                res.should.have.status(403);
                                                done();
                                            });
                                    });
                            });
                    });
            });

            it(`it should fail creating ${bookingType} booking when no login token sent`, (done) => {
                chai.request(server)
                    .post(`${process.env.API_PREFIX}/bookings/${bookingType}`)
                    .send(bookings[bookingType])
                    .end((err, res) => {
                        should.exist(err);
                        res.should.have.status(403);
                        done();
                    });
            });
            it(`it should fail creating ${bookingType} booking when activation token used`, (done) => {
                chai.request(server)
                    .post(`${process.env.API_PREFIX}/bookings/${bookingType}`)
                    .send(bookings[bookingType])
                    .set('Authorization', `Bearer ${activationToken}`)
                    .end((err, res) => {
                        should.exist(err);
                        res.should.have.status(403);
                        done();
                    });
            });
            it(`it should fail creating ${bookingType} booking when no data submitted`, (done) => {
                chai.request(server)
                    .post(`${process.env.API_PREFIX}/bookings/${bookingType}`)
                    .set('Authorization', `Bearer ${activationToken}`)
                    .end((err, res) => {
                        should.exist(err);
                        res.should.have.status(403);
                        done();
                    });
            });

            it(`it should succeed deleting ${bookingType} booking`, (done) => {
                chai.request(server)
                    .post(`${process.env.API_PREFIX}/bookings/${bookingType}`)
                    .send(bookings[bookingType])
                    .set('Authorization', `Bearer ${loginToken}`)
                    .end((createErr, createResponse) => {

                        should.not.exist(createErr);
                        createResponse.should.have.status(201);

                        const location = createResponse.get('Location');
                        const parts = location.split('/');
                        const bookingId = parts[parts.length - 1];
                        bookingsIds[bookingType] = bookingId;

                        chai.request(server)
                            .delete(`${process.env.API_PREFIX}/bookings/${bookingType}/${bookingId}`)
                            .set('Authorization', `Bearer ${loginToken}`)
                            .end((deleteErr, deleteResponse) => {
                                should.not.exist(deleteErr);
                                deleteResponse.should.have.status(204);
                                done();
                            });
                    });
            });
            it(`it should fail deleting non-existing ${bookingType} booking`, (done) => {
                chai.request(server)
                    .delete(`${process.env.API_PREFIX}/bookings/${bookingType}/__non_existing_id__`)
                    .set('Authorization', `Bearer ${loginToken}`)
                    .end((err, res) => {
                        should.exist(err);
                        res.should.have.status(404);
                        done();
                    });
            });
            it(`it should fail deleting ${bookingType} booking when no token`, (done) => {
                chai.request(server)
                    .delete(`${process.env.API_PREFIX}/bookings/${bookingType}/__whatever_id__`)
                    .end((err, res) => {
                        should.exist(err);
                        res.should.have.status(403);
                        done();
                    });
            });

            it(`it should succeed listing ${bookingType} bookings`, (done) => {
                chai.request(server)
                    .get(`${process.env.API_PREFIX}/bookings/${bookingType}`)
                    .set('Authorization', `Bearer ${loginToken}`)
                    .end((err, res) => {
                        should.not.exist(err);
                        res.should.have.status(200);
                        done();
                    });
            });
            it(`it should succeed listing ${bookingType} current bookings`, (done) => {
                chai.request(server)
                    .get(`${process.env.API_PREFIX}/bookings/${bookingType}?type=current`)
                    .set('Authorization', `Bearer ${loginToken}`)
                    .end((err, res) => {
                        should.not.exist(err);
                        res.should.have.status(200);
                        done();
                    });
            });
            it(`it should succeed listing ${bookingType} past bookings`, (done) => {
                chai.request(server)
                    .get(`${process.env.API_PREFIX}/bookings/${bookingType}?type=past`)
                    .set('Authorization', `Bearer ${loginToken}`)
                    .end((err, res) => {
                        should.not.exist(err);
                        res.should.have.status(200);
                        done();
                    });
            });
            it(`it should fail listing ${bookingType} bookings of unsupported type`, (done) => {
                chai.request(server)
                    .get(`${process.env.API_PREFIX}/bookings/${bookingType}/?type=unsupported`)
                    .set('Authorization', `Bearer ${loginToken}`)
                    .end((err, res) => {
                        should.exist(err);
                        res.should.have.status(400);
                        done();
                    });
            });
            it(`it should fail listing ${bookingType} bookings when no token`, (done) => {
                chai.request(server)
                    .get(`${process.env.API_PREFIX}/bookings/${bookingType}`)
                    .end((err, res) => {
                        should.exist(err);
                        res.should.have.status(403);
                        done();
                    });
            });
            it(`it should fail listing ${bookingType} bookings with activation token`, (done) => {
                chai.request(server)
                    .get(`${process.env.API_PREFIX}/bookings/${bookingType}`)
                    .set('Authorization', `Bearer ${activationToken}`)
                    .end((err, res) => {
                        should.exist(err);
                        res.should.have.status(403);
                        done();
                    });
            });
            it(`it should fail listing ${bookingType} bookings with malformed token`, (done) => {
                chai.request(server)
                    .get(`${process.env.API_PREFIX}/bookings/${bookingType}`)
                    .set('Authorization', `Bearer j.w.t`)
                    .end((err, res) => {
                        should.exist(err);
                        res.should.have.status(403);
                        done();
                    });
            });

        });
    });
});
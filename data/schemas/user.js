const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');
const emailRegexp = /.+@.+\..+/;

mongoose.Promise = require('bluebird');

const UserSchema = new mongoose.Schema({
    username: {type: String, required: true, unique: true},
    name: mongoose.Schema.Types.Mixed,
    password: {type: String, required: true},
    email: {
        type: String,
        required: true,
        unique: true,
        match: emailRegexp,
    },
    active: {
        type: Boolean,
    },
    meta: {
        created_at: {
            type: Date,
            'default': Date.now,
            set: () => undefined,
        },
        updated_at: {
            type: Date,
            'default': Date.now,
        },
    },
});

UserSchema.virtual('repeatPassword')
    .get(function() {
        return this._repeatPassword;
    })
    .set(function(value) {
        this._repeatPassword = value;
    });

UserSchema.path('password').validate(function(password) {
    if (password || this._repeatPassword) {
        if (password !== this._repeatPassword) {
            this.invalidate('repeatPassword', 'Password must be confirmed');
        }
    }
}, null);

UserSchema.pre('save', function (next) {

    const that = this;

    that.meta.created_at = Date.now;
    that.meta.updated_at = Date.now;

    bcrypt.hash(that.password, null, null, (err, hash) => {
        that.password = hash;
        next(err);
    });
});
UserSchema.methods.comparePassword = (plainPassword, encryptedPassword, callback) => {
    bcrypt.compare(plainPassword, encryptedPassword, (err, isMatch) => {
        callback(err, isMatch);
    });
};

UserSchema.index({username: 1, 'meta.created_at': -1});

module.exports = UserSchema;
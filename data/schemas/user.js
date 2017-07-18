var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var emailRegexp = /.+\@.+\..+/;

mongoose.Promise = require('bluebird');

var UserSchema = new mongoose.Schema({
    username: {type: String, required: true, unique: true},
    name: mongoose.Schema.Types.Mixed,
    password: {type: String, required: true},
    email: {
        type: String,
        required: true,
        unique: true,
        match: emailRegexp
    },
    active: {
        type: Boolean
    },
    meta: {
        created_at: {
            type: Date,
            'default': Date.now,
            set: function (val) {
                return undefined;
            }
        },
        updated_at: {
            type: Date,
            'default': Date.now
        }
    }
});
UserSchema
    .virtual('full_name')
    .get(function () {
        if (typeof this.name === 'string') {
            return this.name;
        }
        return [this.name.first, this.name.last].join(' ');
    })
    .set(function (fullName) {
        var nameComponents = fullName.split(' ');
        this.name = {
            last: nameComponents.pop(),
            first: nameComponents.join(' ')
        };
    });
UserSchema.pre('save', function (next) {

    var that = this;

    if (that.isNew) {
        that.meta.created_at = undefined;
    }
    that.meta.updated_at = undefined;

    if (!this.isModified('password')) {
        return next();
    }

    bcrypt.hash(that.password, null, null, function (err, hash) {
        if (err) {
            return next(err);
        }
        that.password = hash;
        next();
    });
});
UserSchema.methods.comparePassword = function (candidatePassword, callback) {
    bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
        if (err) {
            return callback(err);
        }
        callback(null, isMatch);
    });
};

UserSchema.index({username: 1, 'meta.created_at': -1});

module.exports = UserSchema;
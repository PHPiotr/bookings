var mongoose = require('mongoose');
var request = require('request');
var bcrypt = require('bcrypt-nodejs');
var emailRegexp = /.+\@.+\..+/;
var TIMESPAN_YEAR = 31536000000;
var TIMESPAN_18_YEARS = 18 * TIMESPAN_YEAR;

function validate_18_years_old_or_more(date) {
    return (Date.now() - date.getTime()) > TIMESPAN_18_YEARS;
}

function twitterHandleExists(handle, done) {
    request('http://twitter.com/' + encodeURIComponent(handle), function (err, res) {
        if (err) {
            console.error(err);
            return done(false);
        }
        if (res.statusCode > 299) {
            done(false);
        } else {
            done(true);
        }
    });
}

mongoose.Promise = require('bluebird');

function filterTwitterHandle(handle) {
    if (!handle) {
        return;
    }
    handle = handle.trim();
    if (handle.indexOf('@') === 0) {
        handle = handle.substring(1);
    }
    return handle;
}

var UserSchema = new mongoose.Schema({
    username: {type: String, required: true, unique: true},
    name: mongoose.Schema.Types.Mixed,
    password: {type: String, required: true},
    email: {
        type: String,
        required: true,
        match: emailRegexp
    },
    gender: {
        type: String,
        required: true,
        uppercase: true,
        'enum': ['M', 'F']
    },
    birthday: {
        type: Date,
        validate: [validate_18_years_old_or_more, 'You must be 18 years old or more']
    },
    bio: {
        type: String
    },
    twitter: {
        type: String,
        sparse: true,
        validate: [twitterHandleExists, 'Please provide a valid twitter handle'],
        get: filterTwitterHandle,
        set: filterTwitterHandle
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
UserSchema
    .virtual('twitter_url')
    .get(function () {
        if (this.twitter) {
            return 'http://twitter.com/' + encodeURIComponent(this.twitter);
        }
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

    bcrypt.hash(this.password, null, null, function (err, hash) {
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

UserSchema.methods.recentArticles = function (callback) {
    return this.model('Article')
        .find({author: this._id})
        .sort('created_at')
        .limit(5)
        .exec(callback);
};

module.exports = UserSchema;
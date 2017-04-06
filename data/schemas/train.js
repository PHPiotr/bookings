var Schema = require('mongoose').Schema;
var TrainSchema = new Schema({
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    departure_date: {
        type: Date,
        required: true
    },
    departure_time: {
        type: String
    },
    arrival_time: {
        type: String
    },
    seat: {
        type: String
    },
    is_return: {
        type: Boolean,
        default: false
    },
    return_departure_date: {
        type: Date
    },
    return_departure_time: {
        type: String
    },
    return_arrival_time: {
        type: String
    },
    return_seat: {
        type: String
    },
    price: {
        type: Number,
        get: function (number) {
            return (number / 100).toFixed(2);
        },
        required: true
    },
    currency: {
        type: String,
        'enum': ['£', 'zł', '€', '$'],
        default: '£'
    },
    checked_in: {
        type: Boolean,
        default: false
    },
    created_by: {
        type: Schema.ObjectId,
        ref: 'User',
        required: true
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

module.exports = TrainSchema;
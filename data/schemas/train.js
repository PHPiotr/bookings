const Schema = require('mongoose').Schema;
const TrainSchema = new Schema({
    from: {
        type: String,
        required: [true, 'required field'],
    },
    to: {
        type: String,
        required: [true, 'required field'],
    },
    departure_date: {
        type: Date,
        required: [true, 'required field'],
    },
    departure_time: {
        type: String,
    },
    arrival_time: {
        type: String,
    },
    seat: {
        type: String,
    },
    is_return: {
        type: Boolean,
        default: false,
    },
    return_departure_date: {
        type: Date,
    },
    return_departure_time: {
        type: String,
    },
    return_arrival_time: {
        type: String,
    },
    return_seat: {
        type: String,
    },
    price: {
        type: Number,
        get: number => parseFloat(number).toFixed(2),
        set: number => parseFloat(number).toFixed(2),
        required: [true, 'required field'],
    },
    currency: {
        type: String,
        'enum': ['£', 'zł', '€', '$'],
        default: '£',
    },
    checked_in: {
        type: Boolean,
        default: false,
    },
    created_by: {
        type: Schema.ObjectId,
        ref: 'User',
        required: [true, 'required field'],
    },
    meta: {
        created_at: {
            type: Date,
            'default': Date.now,
        },
        updated_at: {
            type: Date,
            'default': Date.now,
        },
    },
});

TrainSchema.path('is_return').validate(function(value) {
    if (!value) {
        return;
    }
    if (!this.return_departure_date) {
        this.invalidate('return_departure_date', 'required field');
    }
}, null);

module.exports = TrainSchema;
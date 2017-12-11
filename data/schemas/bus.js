const Schema = require('mongoose').Schema;
const BusSchema = new Schema({
    booking_number: {
        type: String,
        unique: true,
        required: true,
    },
    from: {
        type: String,
        required: true,
    },
    to: {
        type: String,
        required: true,
    },
    departure_date: {
        type: Date,
        required: true,
    },
    departure_time: {
        type: String,
        required: true,
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
        required: true,
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
        required: true,
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

module.exports = BusSchema;
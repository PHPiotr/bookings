const Schema = require('mongoose').Schema;
const HostelSchema = new Schema({
    booking_number: {
        type: String,
        unique: true,
        required: true,
    },
    hostel_name: {
        type: String,
        required: true,
    },
    hostel_address: {
        type: String,
    },
    checkin_date: {
        type: Date,
        required: true,
    },
    checkout_date: {
        type: Date,
        required: true,
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

module.exports = HostelSchema;
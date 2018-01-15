const Schema = require('mongoose').Schema;
const HostelSchema = new Schema({
    booking_number: {
        type: String,
        unique: true,
        required: [true, 'required field'],
    },
    hostel_name: {
        type: String,
        required: [true, 'required field'],
    },
    hostel_address: {
        type: String,
    },
    checkin_date: {
        type: Date,
        required: [true, 'required field'],
    },
    checkout_date: {
        type: Date,
        required: [true, 'required field'],
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

module.exports = HostelSchema;
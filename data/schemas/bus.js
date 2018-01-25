const Schema = require('mongoose').Schema;
const BusSchema = new Schema({
    booking_number: {
        type: String,
        unique: true,
        required: [true, 'required field'],
    },
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
        required: [true, 'required field'],
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

BusSchema.path('to').validate(function(to) {
    if (to) {
        if (to === this.from) {
            this.invalidate('to', 'must be different');
        }
    }
});

BusSchema.path('is_return').validate(function(value) {
    if (!value) {
        return;
    }
    if (!this.return_departure_date) {
        this.invalidate('return_departure_date', 'required field');
    } else {
        if (this.departure_date) {
            if (this.departure_date.getTime() > this.return_departure_date.getTime()) {
                this.invalidate('return_departure_date', 'must be after `Departure date`');
            }
        }
    }
    if (!this.return_departure_time) {
        this.invalidate('return_departure_time', 'required field');
    } else {
        if (this.departure_time && this.departure_date && this.return_departure_date && this.departure_date.getTime() === this.return_departure_date.getTime()) {
            const departureTimeParts = this.departure_time.split(':');
            const returnDepartureTimeParts = this.return_departure_time.split(':');
            const departureHour = parseInt(departureTimeParts[0], 10);
            const returnDepartureHour = parseInt(returnDepartureTimeParts[0], 10);
            const departureMinute = parseInt(departureTimeParts[1], 10);
            const returnDepartureMinute = parseInt(returnDepartureTimeParts[1], 10);
            const validHour = departureHour <= returnDepartureHour;
            const validMinute = ((departureHour < returnDepartureHour) || (departureHour === returnDepartureHour && departureMinute < returnDepartureMinute));
            if (!validHour || !validMinute) {
                this.invalidate('return_departure_time', 'must be after `Departure time`');
            }
        }
    }
}, null);

module.exports = BusSchema;
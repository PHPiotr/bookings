const getFormattedValue = (date) => {

    if (!date) {
        return null;
    }

    const pattern = /(\d{4})-(\d{2})-(\d{2})/;
    const match = pattern.exec(date);

    if (!match) {
        throw Error('Invalid date format');
    }

    return date;
};

const validateDates = (req, res, next) => {
    try {
        const {from, to} = req.query;
        req.query.from = getFormattedValue(from);
        req.query.to = getFormattedValue(to);
        next();
    } catch (e) {
        res.handleError(e.message, 422, next);
    }
}

module.exports = validateDates;

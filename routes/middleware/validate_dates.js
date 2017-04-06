function getFormattedValue(date) {

    if (!date) {
        return null;
    }

    var pattern = /(\d{4})-(\d{2})-(\d{2})/;
    var match = pattern.exec(date);

    if (!match) {
        throw new Error('Invalid date format');
    }

    return date;
}

function validateDates(req, res, next) {
    try {
        req.query.from = getFormattedValue(req.query.from);
        req.query.to = getFormattedValue(req.query.to);
        next();
    } catch (e) {
        next(e);
    }
}

module.exports = validateDates;

const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    clientId: {
        type: String,
        required: true
    },
    client: {
        type: Object,
        required: true
    }
});

module.exports = mongoose.model('Session', sessionSchema);

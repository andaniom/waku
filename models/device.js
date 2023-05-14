const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
    clientId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    status: {
        type: Number,
        required: true
    },
    connectedAt: {
        type: Date,
        default: Date.now
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
});

const Device = mongoose.model('Device', deviceSchema);

module.exports = {Device};

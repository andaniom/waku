const mongoose = require('mongoose');

const receiverSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    },
    status: {
        type: Number,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
});

const Receiver = mongoose.model('Receiver', receiverSchema);

module.exports = {Receiver};

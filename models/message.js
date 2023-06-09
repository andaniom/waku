const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true
    },
    status: {
        type: Number,
        required: true
    },
    success: {
        type: Number,
        required: false
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
});

const Message = mongoose.model('Message', messageSchema);

module.exports = {Message};

const {Message} = require("../models/message");
const {connect} = require("../config/db-config");


class MessageRepository {
    constructor() {
        connect();
    }

    async findAllMessage(userId, pageNumber, pageSize) {
        return Message.find({'user': userId}).populate('user')
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize);
    }

    async countAll(userId) {
        return Message.find({'user': userId}).populate('user').count();
    }

    async findById(id) {
        // Use Mongoose to query the message by ID
        const message = await Message.findById(id);
        return message;
    }

    async save(deviceObject) {
        // Map the message object to a new Message document
        const message = new Message({
            message: deviceObject.message,
            status: deviceObject.status,
            user: deviceObject.user
        });
        // Use Mongoose to save the document to the message
        await message.save();
        return message;
    }

    async update(id, deviceObject) {
        // Use Mongoose to update the message by ID
        await Message.findByIdAndUpdate(id, deviceObject);
        return deviceObject;
    }

    async updateStatus(id, newStatus) {
        try {
            const message = await Message.findOne({id: id});
            if (!message) {
                console.error(`Message with clientId ${clientId} not found`);
                return false;
            }
            message.status = newStatus;
            await message.save();
            console.log(`Message with clientId ${id} updated successfully`);
            return true;
        } catch (err) {
            console.error(`Error updating message status: ${err}`);
            return false;
        }
    }

    async delete(id) {
        // Use Mongoose to delete the message by ID
        await Message.findByIdAndDelete(id);
    }
}

module.exports = new MessageRepository();
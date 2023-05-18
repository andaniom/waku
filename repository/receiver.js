const {Receiver} = require("../models/receiver");
const {connect} = require("../config/db-config");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

class ReceiverRepository {
    constructor() {
        connect();
    }

    async findAllReceiver(userId, pageNumber, pageSize) {
        return Receiver.find({'user': userId}).populate('group').populate('user').skip((pageNumber - 1) * pageSize)
            .limit(pageSize);
    }

    async countAllReceiver(userId, pageNumber, pageSize) {
        return Receiver.find({'user': userId}).populate('group').populate('user').count();
    }

    async findById(id) {
        // Use Mongoose to query the receiver by ID
        return Receiver.findById(id);
    }

    async find(data) {
        return Receiver.find(data);
    }

    async save(param) {
        // const param = {
        //     "phoneNumber": deviceObject.phoneNumber,
        //     "name": deviceObject.name,
        //     "group": new ObjectId(deviceObject.group),
        //     "status": 0,
        //     "user": deviceObject.user
        // }
        // // Map the receiver object to a new Receiver document
        // const receiver = new Receiver(param);
        // Use Mongoose to save the document to the receiver
        await Receiver.create(param);
        // return receiver;
    }

    async update(id, deviceObject) {
        // Use Mongoose to update the receiver by ID
        await Receiver.findByIdAndUpdate(id, deviceObject);
        return deviceObject;
    }

    async updateStatus(id, newStatus) {
        try {
            const receiver = await Receiver.findOne({id: id});
            if (!receiver) {
                console.error(`Receiver with clientId ${clientId} not found`);
                return false;
            }
            receiver.status = newStatus;
            await receiver.save();
            console.log(`Receiver with clientId ${id} updated successfully`);
            return true;
        } catch (err) {
            console.error(`Error updating receiver status: ${err}`);
            return false;
        }
    }

    async delete(id) {
        // Use Mongoose to delete the receiver by ID
        await Receiver.findByIdAndDelete(id);
    }
}

module.exports = new ReceiverRepository();
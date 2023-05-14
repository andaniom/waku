const { connect, disconnect } = require('../config/db-config');
const { Device } = require('../models/device');
const logger = require('../logger/logger');

class DeviceRepository {

    constructor() {
        connect();
    }

    async findAllDevice() {
        return Device.find({});
    }

    async findDeviceByUser(userId) {
        return Device.find({'user' : userId}).populate('user');
    }

    async findDeviceById(id) {
        return Device.findById(id);
    }

    async findDevice(data) {
        return Device.find(data).populate('user');
    }

    async saveDevice(deviceObject) {
        // Map the device object to a new Device document
        const device = new Device({
            name: deviceObject.name,
            phoneNumber: deviceObject.phoneNumber,
            status: deviceObject.status,
            clientId: deviceObject.clientId,
            user: deviceObject.user,
        });
        // Use Mongoose to save the document to the device
        await device.save();
        // Return the mapped device data
        return {
            id: device._id,
            name: device.name,
            phoneNumber: device.phoneNumber,
            status: device.status,
            clientId: device.clientId,
        };
    }

    async updateDevice(id, deviceObject) {
        // Use Mongoose to update the device by ID
        await Device.findByIdAndUpdate(id, deviceObject);
        // Return the mapped device data
        return {
            id: id,
            name: deviceObject.name,
            phoneNumber: deviceObject.phoneNumber,
            status: deviceObject.status,
        };
    }

    async updateDeviceStatus(clientId, newStatus) {
        try {
            const device = await Device.findOne({clientId: clientId});
            if (!device) {
                console.error(`Device with clientId ${clientId} not found`);
                return false;
            }
            device.status = newStatus;
            await device.save();
            console.log(`Device with clientId ${clientId} updated successfully`);
            return true;
        } catch (err) {
            console.error(`Error updating device status: ${err}`);
            return false;
        }
    }

    async deleteDevice(id) {
        // Use Mongoose to delete the device by ID
        await Device.findByIdAndDelete(id);
    }

    async deleteDeviceByClientId(clientId) {
        return Device.deleteOne({clientId});
    }
}

module.exports = new DeviceRepository();
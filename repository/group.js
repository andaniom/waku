const {connect} = require("../config/db-config");
const {Group} = require("../models/group");
const {Receiver} = require("../models/receiver");

class GroupRepository {
    constructor() {
        connect();
    }

    async findAllGroup(userId) {
        const group = await Group.find({'user': userId}).populate('user');
        return group;
    }

    async findAllGroupAndCount(userId, pageNumber, pageSize) {
        const groups = await Group.find({'user': userId}).populate('user')
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize);

        const list = [];
        for (const group of groups) {
            const receivers = await Receiver.countDocuments({group: group._id})
            const res = {
                "_id": group._id,
                "name": group.name,
                "status": group.status,
                "receivers": receivers
            };
            list.push(res);
        }
        return list;
    }

    async countAll(userId) {
        return Group.find({'user': userId}).populate('user').count();
    }

    async findById(id) {
        // Use Mongoose to query the group by ID
        const group = await Group.findById(id);
        return group;
    }

    async save(deviceObject) {
        // Map the group object to a new Group document
        const group = new Group({
            name: deviceObject.name,
            status: deviceObject.status,
            user: deviceObject.user
        });
        // Use Mongoose to save the document to the group
        await group.save();
        return group;
    }

    async update(id, deviceObject) {
        // Use Mongoose to update the group by ID
        await Group.findByIdAndUpdate(id, deviceObject);
        return deviceObject;
    }

    async updateStatus(id, newStatus) {
        try {
            const group = await Group.findOne({id: id});
            if (!group) {
                console.error(`Group with clientId ${clientId} not found`);
                return false;
            }
            group.status = newStatus;
            await group.save();
            console.log(`Group with clientId ${id} updated successfully`);
            return true;
        } catch (err) {
            console.error(`Error updating group status: ${err}`);
            return false;
        }
    }

    async delete(id) {
        // Use Mongoose to delete the group by ID
        await Group.findByIdAndDelete(id);
    }
}

module.exports = new GroupRepository();
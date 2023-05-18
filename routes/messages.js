const express = require('express');
const messageRepository = require("../repository/message");
const deviceRepository = require("../repository/device");
const groupRepository = require("../repository/group");
const receiverRepository = require("../repository/receiver");
const router = express.Router();

const webWaService = require('../service/web-wa-service')
const {isAuthenticated} = require("../service/auth-service");

/* GET messages listing. */
router.get('/', isAuthenticated, async function (req, res, next) {
    const devices = await deviceRepository.findDevice({status: 1, user: req.user._id});
    const groups = await groupRepository.findAllGroup(req.user._id);
    const messages = await messageRepository.findAllMessage(req.user._id);
    const errorMessage = req.query.error;
    res.render('messages', {
        title: 'WA-KU',
        header: "Group List",
        error: errorMessage,
        devices: devices, messages: messages,
        groups: groups
    });
});

router.post('/', isAuthenticated, async function (req, res, next) {
    console.log(req.body);
    if (req.body.message) {
        await messageRepository.save({
            "message": req.body.message,
            "status": 0,
            "user": req.user._id
        }).then(model => {
            console.log('model saved:', model);
            res.redirect('/messages');
        }).catch(error => {
            console.log('Error saving:', error);
            res.redirect('/messages?error=' + encodeURIComponent('Error saving:', error));
        });
    } else {
        res.redirect('/messages?error=' + encodeURIComponent("Error saving"));
    }
});

router.post('/update', isAuthenticated, async function (req, res, next) {
    console.log(req.body);
    if (req.body.message && req.body.id) {
        await messageRepository.update(req.body.id, {
            "message": req.body.message
        }).then(model => {
            console.log('model saved:', model);
            res.redirect('/messages');
        }).catch(error => {
            console.log('Error saving:', error);
            alert('Error saving:', error)
        });
    } else {
        res.redirect('/messages?error=' + encodeURIComponent("Update Error"));
    }
});

router.post('/delete/:id', isAuthenticated, async function (req, res) {
    console.log(req.params.id);
    try {
        const _id = req.params.id;
        await messageRepository.delete(_id);
        res.redirect('/messages');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/send/:id', isAuthenticated, async function (req, res) {
    console.log(req.params.id);
    console.log(req.body);
    let error = "";
    try {
        const _id = req.params.id;
        const {group, devices} = req.body;
        if (!group) {
            error = error + ("Group is Empty \n")
        }
        if (!devices) {
            error = error + ("Devices is Empty \n")
        }
        if (error) {
            res.redirect('/messages?error=' + encodeURIComponent(error));
        } else {
            const message = await messageRepository.findById(_id);
            if (!message) {
                res.redirect('/messages?error=' + encodeURIComponent("Message Not Found"));
            }
            await messageRepository.update(_id, {"success": 0})
            const deviceList =
                await deviceRepository.findDevice({_id: {$in: devices}, status: 1});
            console.log(deviceList)
            const receivers = await receiverRepository.find({group: group});
            console.log(receivers)
            let data = {
                "id": message._id,
                "message": message.message,
                "devices": deviceList.map(device => device.clientId),
                "receivers": receivers.map(receiver => receiver.phoneNumber)
            };
            webWaService.sendMessage(data).then(res => {

            });
            console.log('send_message')

            res.redirect('/messages');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;

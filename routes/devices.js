const express = require('express');
const deviceRepository = require('../repository/device');
const fs = require("fs");
const path = require("path");
const {deleteFolderRecursive} = require("../helper/utils");
const {isAuthenticated} = require("../service/auth-service");
const router = express.Router();

/* GET devices listing. */
router.get('/', isAuthenticated, async function (req, res, next) {
    const pageSize = parseInt(req.query.pageSize) || 10; // Number of documents per page (default: 10)
    let pageNumber = parseInt(req.query.pageNumber) || 1; // Page number to retrieve (default: 1)

    const count = await deviceRepository.countAll(req.user._id);
    const totalPages = Math.ceil(count / pageSize);
    const isLast = pageNumber >= totalPages;
    const isStart = pageNumber === 1;

    if (count > 0 && pageNumber > totalPages) {
        pageNumber = totalPages;
    }

    const devices = await deviceRepository.findDeviceByUser(req.user._id, pageNumber, pageSize);
    const errorMessage = req.query.error;
    res.render('devices', {
        title: 'WA-KU',
        header: "Devices List",
        route: "devices",
        error: errorMessage,
        devices: devices,
        pageNumber: pageNumber,
        totalPages: totalPages,
        isLast: isLast,
        isStart: isStart,
        totalRows: count
    });
});

router.post('/', isAuthenticated, async function (req, res, next) {
    console.log(req.body);
    // const { phoneNumber, name } = req.body;
    // if (!phoneNumber || !name) {
    //     alert('Param Empty:', error)
    // }
    // const device = new Device({
    //     "clientId": phoneNumber,
    //     "status": 0,
    //     "phoneNumber": phoneNumber,
    //     "name": name,
    // });
    // await device.save()
    //     .then(model => {
    //         console.log('model saved:', model);
    //         res.redirect('/devices');
    //     })
    //     .catch(error => {
    //         console.log('Error saving:', error);
    //         alert('Error saving:', error)
    //     });
});


router.post('/update', isAuthenticated, async function (req, res, next) {
    console.log(req.body);
    const {id, phoneNumber, name} = req.body;
    if (!id || !phoneNumber || !name) {
        res.redirect('/devices?error=' + encodeURIComponent('Missing Param'));
    }

    await deviceRepository.updateDevice(id, {
        "phoneNumber": phoneNumber,
        "name": name,
    })
        .then(model => {
            console.log('model saved:', model);
            res.redirect('/devices');
        })
        .catch(error => {
            console.log('Error saving:', error);
            res.redirect('/devices?error=' + encodeURIComponent('Error saving:', error));
        });
});

router.post('/delete/:id', isAuthenticated, async function (req, res) {
    console.log(req.params.id);
    try {
        const _id = req.params.id;
        const device = await deviceRepository.findDeviceById(_id);
        if (device) {
            console.log(device.clientId)
            const client = sessions.find(sess => sess.id === device.clientId)?.client;

            if (client) {
                const sessionDirName = device.clientId ? `session-${device.clientId}` : 'session/Default';
                const dirPath = path.join(path.join(rootPath, '.wwebjs_auth'), sessionDirName);
                await deleteFolderRecursive(dirPath)
                // client.logout();
                // client.destroy();
                const sessionIndex = sessions.findIndex(sess => sess.id === device.clientId);
                sessions.splice(sessionIndex, 1);
                await deviceRepository.deleteDevice(_id);
            }
        }
        res.redirect('/devices');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;

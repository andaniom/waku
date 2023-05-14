var express = require('express');

const receiverRepository = require("../repository/receiver");
const groupRepository = require("../repository/group");
const {isAuthenticated} = require("../service/auth-service");
var router = express.Router();

/* GET receiver listing. */
router.get('/', isAuthenticated, async function (req, res, next) {
    const receivers = await receiverRepository.findAllReceiver(req.user._id);
    const groups = await groupRepository.findAllGroup(req.user._id);
    res.render('receivers', {title: 'WA-KU', receivers: receivers, groups: groups});
});

router.post('/', isAuthenticated, async function (req, res, next) {
    console.log(req.body);
    const { phoneNumber, name, group } = req.body;
    let error = "";
    if (!phoneNumber) {
        error = error + ("Phone Number is Empty \n")
    }
    if (!name) {
        error = error + ("Name is Empty \n")
    }
    if (!group) {
        error = error + ("Group is Empty \n")
    }
    if (error) {
        alert(error);
    } else {
        await receiverRepository.save({
            "phoneNumber": req.body.phoneNumber,
            "name": req.body.name,
            "group": req.body.group,
            "status": 0,
            "user": req.user._id
        }).then(model => {
            console.log('model saved:', model);
            res.redirect('/receivers');
        }).catch(error => {
            console.log('Error saving:', error);
            // alert('Error saving:', error)
        });
    }
});

router.post('/delete/:id', isAuthenticated, async function (req, res) {
    console.log(req.params.id);
    try {
        const _id = req.params.id;
        await receiverRepository.delete(_id);
        res.redirect('/receivers');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;

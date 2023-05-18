var express = require('express');
const deviceRepository = require("../repository/device");
const repository = require('../repository/group');
const {isAuthenticated} = require("../service/auth-service");
var router = express.Router();

/* GET messages listing. */
router.get('/', isAuthenticated, async function (req, res, next) {
    const groups = await repository.findAllGroupAndCount(req.user._id);
    const errorMessage = req.query.error;
    res.render('groups', {title: 'WA-KU', header: "Group List", error: errorMessage, groups: groups});
});

router.post('/', isAuthenticated, async function (req, res, next) {
    console.log(req.body);
    if (req.body.name) {
        repository.save({
            "name": req.body.name,
            "status": 0,
            "user": req.user._id
        }).then(model => {
            console.log('model saved:', model);
            res.redirect('/groups');
        }).catch(error => {
            console.log('Error saving:', error);
            res.redirect('/groups?error=' + encodeURIComponent('Error saving:', error));
        });
    } else {
        res.redirect('/groups?error=' + encodeURIComponent("Error saving"));
    }
});

router.post('/update', isAuthenticated, async function (req, res, next) {
    console.log(req.body);
    if (req.body.name && req.body.id ) {
        repository.update(req.body.id, {
            "name": req.body.name
        }).then(model => {
            console.log('model saved:', model);
            res.redirect('/groups');
        }).catch(error => {
            console.log('Error saving:', error);
            res.redirect('/groups?error=' + encodeURIComponent('Error saving:', error));
        });
    } else {
        res.redirect('/groups?error=' + encodeURIComponent("Error saving"));
    }
});

router.post('/delete/:id', isAuthenticated, async function (req, res) {
    console.log(req.params.id);
    try {
        const _id = req.params.id;
        await repository.delete(_id);
        res.redirect('/groups');
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;

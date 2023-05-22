var express = require('express');
const repository = require('../repository/group');
const {isAuthenticated} = require("../service/auth-service");
var router = express.Router();

/* GET messages listing. */
router.get('/', isAuthenticated, async function (req, res, next) {
    const pageSize = parseInt(req.query.pageSize) || 10; // Number of documents per page (default: 10)
    let pageNumber = parseInt(req.query.pageNumber) || 1; // Page number to retrieve (default: 1)

    const count = await repository.countAll(req.user._id);
    const totalPages = Math.ceil(count / pageSize);
    const isLast = pageNumber >= totalPages;
    const isStart = pageNumber === 1;

    if (pageNumber > totalPages) {
        pageNumber = totalPages;
    }

    const groups = await repository.findAllGroupAndCount(req.user._id, pageNumber, pageSize);
    const errorMessage = req.query.error;
    res.render('groups', {
        title: 'WA-KU',
        header: "Group List",
        route: "groups",
        error: errorMessage,
        groups: groups,
        pageNumber: pageNumber,
        totalPages: totalPages,
        isLast: isLast,
        isStart: isStart,
        totalRows: count
    });
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

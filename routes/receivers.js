var express = require('express');

const receiverRepository = require("../repository/receiver");
const groupRepository = require("../repository/group");
const {isAuthenticated} = require("../service/auth-service");
var router = express.Router();

const xlsx = require('xlsx');
const multer = require('multer');
const {join} = require("path");

const upload = multer();

/* GET receiver listing. */
router.get('/', isAuthenticated, async function (req, res, next) {
    const pageSize = parseInt(req.query.pageSize) || 10; // Number of documents per page (default: 10)
    let pageNumber = parseInt(req.query.pageNumber) || 1; // Page number to retrieve (default: 1)

    const count = await receiverRepository.countAllReceiver(req.user._id);
    const maxPage = Math.ceil(count / pageSize);
    const isLast = pageNumber >= maxPage;
    const isStart = pageNumber === 1;

    if (pageNumber > maxPage) {
        pageNumber = maxPage;
    }

    const receivers = await receiverRepository.findAllReceiver(req.user._id, pageNumber, pageSize);

    const groups = await groupRepository.findAllGroup(req.user._id);
    const error = req.query.error;
    const data = {
        title: 'WA-KU',
        header: "Receiver List",
        receivers: receivers,
        groups: groups,
        error: error,
        pageNumber: pageNumber,
        maxPage: maxPage,
        isLast: isLast,
        isStart: isStart,
    }
    res.render('receivers', data);
});

router.post('/', isAuthenticated, async function (req, res, next) {
    console.log(req.body);
    const {phoneNumber, name, group} = req.body;
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
        res.redirect('/receivers?error=' + encodeURIComponent(error));
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
            res.redirect('/receivers?error=' + encodeURIComponent('Error saving:', error));
        });
    }
});

router.post('/update', isAuthenticated, async function (req, res, next) {
    console.log(req.body);
    const {id, phoneNumber, name, group} = req.body;
    let error = "";
    if (!id) {
        res.redirect('/receivers?error=' + encodeURIComponent("Update Error"));
    }
    else {
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
            res.redirect('/receivers?error=' + encodeURIComponent(error));
        } else {
            await receiverRepository.update(id, {
                "phoneNumber": req.body.phoneNumber,
                "name": req.body.name,
                "group": req.body.group
            }).then(model => {
                console.log('model saved:', model);
                res.redirect('/receivers');
            }).catch(error => {
                console.log('Error saving:', error);
                res.redirect('/receivers?error=' + encodeURIComponent('Error saving:', error));
            });
        }
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

router.post('/upload', upload.single('excelFile'), isAuthenticated, async function (req, res, next) {
    console.log(req.body);
    console.log("upload1");
    console.log(req.body.group)
    // if (!req.files || !req.files.excelFile) {
    //     return res.status(400).send('No file uploaded.');
    // }

    console.log("upload2");

    const fileBuffer = req.file.buffer;

    // Parse the Excel file
    const workbook = xlsx.read(fileBuffer, {type: 'buffer'});

    // const workbook = xlsx.readFile(req.files.excelFile.tempFilePath);

    const sheetNames = workbook.SheetNames;

    const sheetIndex = 0;
    const sheetName = sheetNames[sheetIndex];

    const worksheet = workbook.Sheets[sheetName];

    const range = xlsx.utils.decode_range(worksheet['!ref']);

    let list = [];

    for (let rowNum = range.s.r + 1; rowNum <= range.e.r; rowNum++) {
        const row = {};

        // Loop through each cell in the current row
        for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
            const cellAddress = xlsx.utils.encode_cell({r: rowNum, c: colNum});
            const cellValue = worksheet[cellAddress] ? worksheet[cellAddress].v : '';

            row[colNum] = cellValue;
        }

        // Process the row data
        console.log('Row:', row['0'], row[1]);
        let receiver = {
            "phoneNumber": row[1],
            "name": row[0],
            "group": req.body.group,
            "status": 0,
            "user": req.user._id
        };
        list.push(receiver);
    }
    receiverRepository.save(list).then(model => {
        console.log('model saved:', model);
        res.redirect('/receivers');
    }).catch(error => {
        console.log('Error saving:', error);
        // alert('Error saving:', error)
    });
});

router.post('/download', isAuthenticated, async function (req, res) {
    try {
        const fileName = 'example.xlsx';
        const filePath = join(rootPath, fileName);

        res.download(filePath, (err) => {
            if (err) {
                // Handle error
                console.error('Error downloading file:', err);
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;

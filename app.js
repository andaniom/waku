const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const {Client, Location, List, Buttons, LocalAuth} = require('whatsapp-web.js');
require('dotenv').config()

const session = require('express-session');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const {User} = require("./models/user");
const passport = require("passport");

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const devicesRouter = require('./routes/devices');
const messagesRouter = require('./routes/messages');
const groupRouter = require('./routes/groups');
const receiverRouter = require('./routes/receivers');
const authRouter = require('./routes/auth');

const fs = require("fs");
const app = express()
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const {connect} = require("./config/db-config");

connect();

// const mongoose = require("mongoose");
// const MongoStore = require("connect-mongo")(session);

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
passport.use(new LocalStrategy(User.authenticate()));

app.use(session({
    secret: 'andaniom',
    resave: false,
    saveUninitialized: false,
    // store: new MongoStore({mongooseConnection : mongoose.connection})
}));

app.use(passport.initialize());
app.use(passport.session());

require('./service/web-wa-service');
const qrcode = require("qrcode");
const deviceRepository = require("./repository/device");
const uuid = require("uuid");
const {deleteFolderRecursive} = require("./helper/utils");
const webWaService = require("./service/web-wa-service");

global.io = io;
global.rootPath = __dirname;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/messages', messagesRouter);
app.use('/devices', devicesRouter);
app.use('/groups', groupRouter);
app.use('/receivers', receiverRouter);
app.use('/auth', authRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    // res.locals.error = req.flash('error');
    // next();
    // next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

const port = process.env.PORT || 3000;

http.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

const sessions = [];
global.sessions = sessions;

const init = async function (socket) {
    const devices = await deviceRepository.findAllDevice();

    if (devices.length > 0) {
        if (socket) {
            devices.forEach((e, i, arr) => {
                arr[i].status = 1;
            });

            socket.emit('init', devices);
        } else {
            devices.forEach(sess => {
                if (sess.status) {
                    deviceRepository.updateDeviceStatus(sess.clientId, 2)
                    initClient(sess.clientId)
                }
            });
        }
    }
}

io.on('connection', (socket) => {
    // socket.on('get qr code', async () => {
    //     await createClient();
    // });
    init(socket);

    socket.on('connect_new_device', async (data) => {
        console.log('Received data:', data);
        await connectClient(data);
    });

    socket.on('reconnect_device', async (data) => {
        console.log('Received data:', data);
        await reconnectClient(data);
    });

    socket.on('create-dashboard', async (id) => {
        console.log('create-dashboard');
        const devices = await deviceRepository.findDeviceByUser(id);
        for (const i in devices) {
            const client = sessions.find(sess => sess.id === devices[i].clientId)?.client;
            if (!client) {
                devices[i].status = 0;
            }
        }
        socket.emit('init-dashboard', devices);
    });
});

const initClient = function (clientId) {
    const client = new Client({
        restartOnAuthFail: true,
        // puppeteer: {
        // headless: false,
        // args: [
        //     '--no-sandbox',
        //     '--disable-setuid-sandbox',
        //     '--disable-dev-shm-usage',
        //     '--disable-accelerated-2d-canvas',
        //     '--no-first-run',
        //     '--no-zygote',
        //     '--single-process', // <- this one doesn't works in Windows
        //     '--disable-gpu'
        // ],
        // },
        authStrategy: new LocalAuth({clientId: clientId}),
    });

    client.initialize();

    client.on('qr', async (qr) => {
        console.log('QR RECEIVED', qr);
        const qrCode = await qrcode.toDataURL(qr);
        io.emit('qr code', qrCode);
        io.emit('qr', {clientId: clientId, src: qrCode});
        io.emit('message', {clientId: clientId, text: 'QR Code received, scan please!'});
    });

    client.on('ready', async () => {
        console.log('Client is ready!');
        const result = await deviceRepository.updateDeviceStatus(clientId, 1);
        console.log('create-session:', clientId);
        // const savedSessions = getSessionsFile();
        // const sessionIndex = savedSessions.findIndex(sess => sess.id === clientId);
        // savedSessions[sessionIndex].ready = true;
        // setSessionsFile(savedSessions);
        io.emit('client connected');
        io.emit('ready', {clientId: clientId});
        io.emit('message', {clientId: clientId, text: 'Whatsapp is ready!'});
    });

    client.on('disconnected', async (reason) => {
        try {
            io.emit('message', {id: clientId, text: 'Whatsapp is disconnected!'});
            await client.destroy();
            const sessionDirName = clientId ? `session-${clientId}` : 'session';
            const dirPath = path.join(path.join(rootPath, '.wwebjs_auth'), sessionDirName);
            await deleteFolderRecursive(dirPath)
            const sessionIndex = sessions.findIndex(sess => sess.id === clientId);
            sessions.splice(sessionIndex, 1);
            console.log('remove-session:', clientId);
            deviceRepository.deleteDeviceByClientId(clientId)
        } catch (e) {
            console.log(e)
        }
    });

    client.on('authenticated', () => {
        console.log('AUTHENTICATED');
        // io.emit('authenticated');
        io.emit('message', {clientId: clientId, text: 'Whatsapp is authenticated!'});
    });

    client.on('auth_failure', msg => {
        // Fired if session restore was unsuccessful
        console.error('AUTHENTICATION FAILURE', msg);
        io.emit('message', {clientId: clientId, text: 'Auth failure, restarting...'});
    });

    client.on('loading_screen', (percent, message) => {
        console.log('LOADING SCREEN', percent, message);
        io.emit('loading_screen', percent);
        io.emit('message', {clientId: clientId, text: 'Loading ' + percent + " %"});
    });

    client.on('message', async  msg => {
        await webWaService.handleMessage(clientId, msg);
    })

    // client.on('message', async msg => {
    //     console.log('MESSAGE RECEIVED', msg);
    //
    //     if (msg.body === '!ping reply') {
    //         // Send a new message as a reply to the current one
    //         await msg.reply('pong');
    //
    //     } else if (msg.body === '!ping') {
    //         // Send a new message to the same chat
    //         console.log(msg.from)
    //         const res = await client.sendMessage(msg.from, 'pong');
    //         console.log(res);
    //
    //     } else if (msg.body.startsWith('!sendto ')) {
    //         // Direct send a new message to specific id
    //         let number = msg.body.split(' ')[1];
    //         let messageIndex = msg.body.indexOf(number) + number.length;
    //         let message = msg.body.slice(messageIndex, msg.body.length);
    //         number = number.includes('@c.us') ? number : `${number}@c.us`;
    //         let chat = await msg.getChat();
    //         chat.sendSeen();
    //         await client.sendMessage(number, message);
    //
    //     } else if (msg.body.startsWith('!subject ')) {
    //         // Change the group subject
    //         let chat = await msg.getChat();
    //         if (chat.isGroup) {
    //             let newSubject = msg.body.slice(9);
    //             chat.setSubject(newSubject);
    //         } else {
    //             msg.reply('This command can only be used in a group!');
    //         }
    //     } else if (msg.body.startsWith('!echo ')) {
    //         // Replies with the same message
    //         msg.reply(msg.body.slice(6));
    //     } else if (msg.body.startsWith('!desc ')) {
    //         // Change the group description
    //         let chat = await msg.getChat();
    //         if (chat.isGroup) {
    //             let newDescription = msg.body.slice(6);
    //             chat.setDescription(newDescription);
    //         } else {
    //             msg.reply('This command can only be used in a group!');
    //         }
    //     } else if (msg.body === '!leave') {
    //         // Leave the group
    //         let chat = await msg.getChat();
    //         if (chat.isGroup) {
    //             chat.leave();
    //         } else {
    //             msg.reply('This command can only be used in a group!');
    //         }
    //     } else if (msg.body.startsWith('!join ')) {
    //         const inviteCode = msg.body.split(' ')[1];
    //         try {
    //             await client.acceptInvite(inviteCode);
    //             msg.reply('Joined the group!');
    //         } catch (e) {
    //             msg.reply('That invite code seems to be invalid.');
    //         }
    //     } else if (msg.body === '!groupinfo') {
    //         let chat = await msg.getChat();
    //         if (chat.isGroup) {
    //             msg.reply(`
    //             *Group Details*
    //             Name: ${chat.name}
    //             Description: ${chat.description}
    //             Created At: ${chat.createdAt.toString()}
    //             Created By: ${chat.owner.user}
    //             Participant count: ${chat.participants.length}
    //         `);
    //         } else {
    //             msg.reply('This command can only be used in a group!');
    //         }
    //     } else if (msg.body === '!chats') {
    //         const chats = await client.getChats();
    //         client.sendMessage(msg.from, `The bot has ${chats.length} chats open.`);
    //     } else if (msg.body === '!info') {
    //         let info = client.info;
    //         client.sendMessage(msg.from, `
    //         *Connection info*
    //         User name: ${info.pushname}
    //         My number: ${info.wid.user}
    //         Platform: ${info.platform}
    //     `);
    //     } else if (msg.body === '!mediainfo' && msg.hasMedia) {
    //         const attachmentData = await msg.downloadMedia();
    //         msg.reply(`
    //         *Media info*
    //         MimeType: ${attachmentData.mimetype}
    //         Filename: ${attachmentData.filename}
    //         Data (length): ${attachmentData.data.length}
    //     `);
    //     } else if (msg.body === '!quoteinfo' && msg.hasQuotedMsg) {
    //         const quotedMsg = await msg.getQuotedMessage();
    //
    //         quotedMsg.reply(`
    //         ID: ${quotedMsg.id._serialized}
    //         Type: ${quotedMsg.type}
    //         Author: ${quotedMsg.author || quotedMsg.from}
    //         Timestamp: ${quotedMsg.timestamp}
    //         Has Media? ${quotedMsg.hasMedia}
    //     `);
    //     } else if (msg.body === '!resendmedia' && msg.hasQuotedMsg) {
    //         const quotedMsg = await msg.getQuotedMessage();
    //         if (quotedMsg.hasMedia) {
    //             const attachmentData = await quotedMsg.downloadMedia();
    //             client.sendMessage(msg.from, attachmentData, { caption: 'Here\'s your requested media.' });
    //         }
    //     } else if (msg.body === '!location') {
    //         msg.reply(new Location(37.422, -122.084, 'Googleplex\nGoogle Headquarters'));
    //     } else if (msg.location) {
    //         msg.reply(msg.location);
    //     } else if (msg.body.startsWith('!status ')) {
    //         const newStatus = msg.body.split(' ')[1];
    //         await client.setStatus(newStatus);
    //         msg.reply(`Status was updated to *${newStatus}*`);
    //     } else if (msg.body === '!mention') {
    //         const contact = await msg.getContact();
    //         const chat = await msg.getChat();
    //         chat.sendMessage(`Hi @${contact.number}!`, {
    //             mentions: [contact]
    //         });
    //     } else if (msg.body === '!delete') {
    //         if (msg.hasQuotedMsg) {
    //             const quotedMsg = await msg.getQuotedMessage();
    //             if (quotedMsg.fromMe) {
    //                 quotedMsg.delete(true);
    //             } else {
    //                 msg.reply('I can only delete my own messages');
    //             }
    //         }
    //     } else if (msg.body === '!pin') {
    //         const chat = await msg.getChat();
    //         await chat.pin();
    //     } else if (msg.body === '!archive') {
    //         const chat = await msg.getChat();
    //         await chat.archive();
    //     } else if (msg.body === '!mute') {
    //         const chat = await msg.getChat();
    //         // mute the chat for 20 seconds
    //         const unmuteDate = new Date();
    //         unmuteDate.setSeconds(unmuteDate.getSeconds() + 20);
    //         await chat.mute(unmuteDate);
    //     } else if (msg.body === '!typing') {
    //         const chat = await msg.getChat();
    //         // simulates typing in the chat
    //         chat.sendStateTyping();
    //     } else if (msg.body === '!recording') {
    //         const chat = await msg.getChat();
    //         // simulates recording audio in the chat
    //         chat.sendStateRecording();
    //     } else if (msg.body === '!clearstate') {
    //         const chat = await msg.getChat();
    //         // stops typing or recording in the chat
    //         chat.clearState();
    //     } else if (msg.body === '!jumpto') {
    //         if (msg.hasQuotedMsg) {
    //             const quotedMsg = await msg.getQuotedMessage();
    //             client.interface.openChatWindowAt(quotedMsg.id._serialized);
    //         }
    //     } else if (msg.body === '!buttons') {
    //         let button = new Buttons('Button body', [{ body: 'bt1' }, { body: 'bt2' }, { body: 'bt3' }], 'title', 'footer');
    //         client.sendMessage(msg.from, button);
    //     } else if (msg.body === '!list') {
    //         let sections = [{ title: 'sectionTitle', rows: [{ title: 'ListItem1', description: 'desc' }, { title: 'ListItem2' }] }];
    //         let list = new List('List body', 'btnText', sections, 'Title', 'footer');
    //         client.sendMessage(msg.from, list);
    //     } else if (msg.body === '!reaction') {
    //         msg.react('👍');
    //     }
    // });

    sessions.push({
        id: clientId,
        client: client
    });

    // const savedSessions = getSessionsFile();
    // const sessionIndex = savedSessions.findIndex(sess => sess.id === clientId);
    //
    // if (sessionIndex === -1) {
    //     savedSessions.push({
    //         id: clientId,
    //         ready: false,
    //     });
    //     setSessionsFile(savedSessions);
    // }
}

const connectClient = async function (model) {
    const clientId = uuid.v4();
    console.log(clientId);
    model.clientId = clientId;
    console.log(`Client connected:`, model);
    // Save the device data to MongoDB
    const savedDevice = await deviceRepository.saveDevice(model)
    if (savedDevice) {
        console.log('Device saved:', savedDevice);
    } else {
        console.log('Error saving device:', error);
        alert('Error saving device:', error);
    }
    initClient(clientId);
}

const reconnectClient = function (clientId) {
    deviceRepository.findDevice({clientId: clientId}).then(device => {
        console.log('device:', device);
        if (device) {
            initClient(device.clientId);
        } else {
            alert("Device not found")
        }
    });
}

init();

// module.exports = app;

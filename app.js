const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const {Client, LegacySessionAuth, LocalAuth} = require('whatsapp-web.js');

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

const mongoose = require('mongoose');
const logger = require('../logger/logger');

const connect = () => {

    // const uri = "mongodb+srv://andaniom:<password>@cluster0.t63zyt8.mongodb.net/?retryWrites=true&w=majority";
    // const url = process.env.MONGO_CONNECTION_STRING || 'mongodb://localhost:27017/wa-ku';
    const url = process.env.MONGO_CONNECTION_STRING || 'mongodb+srv://andaniom:Waku1234!@cluster0.t63zyt8.mongodb.net/?retryWrites=true&w=majority';
    logger.info("process.env.MONGO_CONNECTION_STRING :::" + url);

    mongoose.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })

    mongoose.connection.once("open", async () => {
        logger.info("Connected to database");
    });

    mongoose.connection.on("error", (err) => {
        logger.error("Error connecting to database  ", err);
    });
}

const disconnect = () => {

    if (!mongoose.connection) {
        return;
    }

    mongoose.disconnect();

    mongoose.once("close", async () => {
        console.log("Diconnected  to database");
    });

};

module.exports = {
    connect,
    disconnect
}
const mongoose = require("mongoose");

const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
    email: {type: String, required:true, unique:true},
    username : {type: String, unique: true, required:true},
    // password: { type: String, required: true },
    // isVerified: { type: Boolean, default: false },
    // verificationToken: { type: String, default: null },
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model('User', userSchema);

module.exports = {User};

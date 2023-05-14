// const bcrypt = require("bcryptjs");
const {User} = require("../models/user");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;


passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
passport.use(new LocalStrategy(User.authenticate()));

passport.initialize()
passport.session()

module.export = {passport};
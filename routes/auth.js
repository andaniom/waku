const {User} = require("../models/user");
const passport = require("passport");
const express = require("express");
const {isAuthenticated} = require("../service/auth-service");
const router = express.Router();

router.get("/login", function (req, res) {
    if (req.isAuthenticated()) {
        res.redirect("/")
    }
    res.render("login", {
        title: 'WA-KU',
    });
});

router.get('/register', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect("/")
    }
    res.render('register', {
        title: 'WA-KU',
    });
});

router.get('/current-user', isAuthenticated, (req, res) => {
    const currentUser = req.user;
    res.json(currentUser);
});

router.post("/register", function (req, res) {
    console.log(req.body)
    User.register(new User({
        email: req.body.email,
        username: req.body.username
    }), req.body.password, function (err, user) {
        console.log(err)
        if (err) {
            res.json({success: false, message: "Your account could not be saved. Error: " + err});
        } else {
            req.login(user, (er) => {
                if (er) {
                    res.json({success: false, message: er});
                } else {
                    res.redirect('/login');
                }
            });
        }
    });
});

// router.post("/login", function (req, res) {
//     if (!req.body.username) {
//         res.json({success: false, message: "Username was not given"})
//     } else if (!req.body.password) {
//         res.json({success: false, message: "Password was not given"})
//     } else {
//         passport.authenticate("local", function (err, user, info) {
//             if (err) {
//                 res.json({success: false, message: err});
//             } else {
//                 if (!user) {
//                     res.json({success: false, message: "username or password incorrect"});
//                 } else {
//                     const token = jwt.sign({userId: user._id, username: user.username}, secretkey, {expiresIn: "24h"});
//                     res.json({success: true, message: "Authentication successful", token: token});
//                 }
//             }
//         })(req, res);
//     }
// });

router.post('/login',
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/auth/login'
    }),
    (req, res) => {
        console.log(req.user);
    }
);

router.post('/logout', function (req, res, next) {
    console.log("logout")
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

module.exports = router;
const express = require('express');
const {User} = require("../models/user");
const passport = require('passport');
const {isAuthenticated} = require("../service/auth-service");
const router = express.Router();

/* GET home page. */
router.get('/', isAuthenticated, async function (req, res, next) {
    res.render('dashboard', {title: 'WA-KU', header: "Dashboard"});
});

// router.get('/register', (req, res) => {
//     res.render('register');
// });
//
// router.post('/register', async (req, res) => {
//     const {email, password} = req.body;
//
//     // Check if user with same email already exists
//     const userExists = await User.findOne({email});
//     if (userExists) {
//         return res.status(400).json({error: 'User with this email already exists'});
//     }
//
//     // Create new user
//     const newUser = new User({email, password});
//
//     try {
//         // Save user to database
//         await newUser.save();
//         // Authenticate user
//         req.login(newUser, (err) => {
//             if (err) throw err;
//             res.json({message: 'Registration successful'});
//         });
//     } catch (err) {
//         res.status(500).json({error: 'Server error'});
//     }
// });
//
// router.post('/login',
//     passport.authenticate('local', {
//         successRedirect: '/dashboard',
//         failureRedirect: '/login'
//     })
// );
//
// router.get('/logout', function(req, res){
//     req.logout();
//     res.redirect('/');
// });
//


module.exports = router;

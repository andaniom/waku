var express = require('express');
const {isAuthenticated} = require("../service/auth-service");
var router = express.Router();

/* GET users listing. */
router.get('/', isAuthenticated, function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;

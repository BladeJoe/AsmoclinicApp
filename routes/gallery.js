const path = require('path');

const express = require('express');

const router = express.Router();

router.get('/', (req, res, next) => {

  res.render('gallery', {
    path: '/gallery',
    i18n: global.i18n
  });
});



module.exports = router;
const path = require('path');

const express = require('express');


const router = express.Router();

router.get('/', (req, res, next) => {

  res.render('blogs', {
    path: '/blogs',
    i18n: global.i18n
  });
});



module.exports = router;
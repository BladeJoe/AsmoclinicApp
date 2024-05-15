const path = require('path');

const express = require('express');

const router = express.Router();

const mysql = require('mysql')
let connection;
if (process.env.NODE_ENV === 'development') {
  // When hosted on server
  connection = mysql.createConnection({
    host: `83.69.139.151`,
    user: 'asmocli1_user',
    password: 'iuL=(Qq8;c+8' ,
    database: 'asmocli1_database'
  });
} else {
  // When running locally
  connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'asmocli1_database'
  });
}connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database: ', err);
    return;
  }
  console.log('Connected to database');
});

function getDoctorData(doctor, locale) {
  return {
    ...doctor,
    name: doctor[`name-${locale}`],
    position: doctor[`position-${locale}`],
    experience: JSON.parse(doctor.experience || '[]').map(item => ({
      title: item.time,
      description: item[locale]
    }))
  }
}


router.get('/', (req, res, next) => {
  connection.query(`SELECT * FROM \`doctors\` `, (err, results, fields) => {
    if (err) {
      console.error('Error executing query: ', err);
      res.status(500).send("")
      return;
    }

    let locale = (req.session.user && req.session.user.locale) || (req.query && req.query.locale) || 'ru';

    results = results.map(doctor => getDoctorData(doctor, locale))


    res.render('index', {
      i18n: global.i18n,
      array: results
    });
  });
});

module.exports = router;
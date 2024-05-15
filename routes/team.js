const path = require('path');



const express = require('express');



const mysql = require('mysql')

const router = express.Router();

// const connection = mysql.createConnection({
//   host: `83.69.139.151`,
//   user: 'asmocli1_user',
//   password: 'iuL=(Qq8;c+8' ,
//   database: 'asmocli1_database'
// });
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
}

connection.connect((err) => {
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

    nameUZ: doctor['name-uz'],

    nameRU: doctor['name-ru'],

    position: doctor[`position-${locale}`],

    positionUZ: doctor['position-uz'],

    positionRU: doctor['position-ru'],

    experience: JSON.parse(doctor[`experience-${locale}`] || '[]').map(item => ({

      title: item.title,

      description: item.description

    })),

    experienceUZ: JSON.parse(doctor['experience-uz'] || '[]').map(item => ({

      title: item.title,

      description: item.description

    })),

    experienceRU: JSON.parse(doctor['experience-ru'] || '[]').map(item => ({

      title: item.title,

      description: item.description

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



    // console.log(results)



    res.render('team', {

      // path: `/team`,

      i18n: global.i18n,

      array: results

    });

  });

});





router.get('/:id', async (req, res, next) => {

  connection.query(`SELECT * FROM \`doctors\` WHERE id = ?`, [req.params.id], (err, results, fields) => {

    if (err) {

      console.error('Error executing query: ', err);

      res.status(500).send("")

      return;

    }

    let locale = (req.session.user && req.session.user.locale) || (req.query && req.query.locale) || 'ru';

    res.render('teamPage', {

      // path: `/team/${req.params.id}`,

      data: getDoctorData(results[0], locale),

      i18n: global.i18n

    });

  });

});



module.exports = router;
const path = require('path');

const express = require('express');

const bodyParser = require('body-parser');
const axios = require('axios');

const fs = require('fs')
const multer = require('multer');
const mysql = require('mysql');
const {
  METHODS
} = require('http');
const router = express.Router(); 
let connection;
if (process.env.NODE_ENV === 'development') { 
  connection = mysql.createConnection({
    host: `83.69.139.151`,
    user: 'asmocli1_user',
    password: 'iuL=(Qq8;c+8' ,
    database: 'asmocli1_database'
  });
} else { 
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



function getAllFiles(directoryPath, fileList) {
  let files = fs.readdirSync(directoryPath);

  fileList = fileList || [];

  files.forEach(file => {
    let filePath = path.join(directoryPath, file);
    let stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      fileList = getAllFileNamesInDirectory(filePath, fileList); // Recursively search subdirectories
    } else {
      fileList.push(file); // Push just the file name without the path
    }
  });

  return fileList;
}
let directoryPath = './public/assets/images/portfolio';
var fileList = getAllFiles(directoryPath);

 
let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './temp/');

  },
  filename: function (req, file, cb) {
    let uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + "." + file.originalname.split('.').pop())

  }
});

let upload = multer({
  storage: storage
});



router.post('/addDoctor', upload.fields([{
    name: 'avatar',
    maxCount: 1
  },
  {
    name: 'profile-photo',
    maxCount: 1
  }
]), (req, res, next) => {
  let experienceUZ = req.body.titleuz.map((title, i) => {
    // Check if either title or description is empty
    if (!title || !req.body.descriptionuz[i]) {
      return null; // Skip this entry
    }
    return {
      title,
      description: req.body.descriptionuz[i]
    };
  }).filter(entry => entry !== null); // Remove null entries

  let experienceRU = req.body.titleru.map((title, i) => {
    // Check if either title or description is empty
    if (!title || !req.body.descriptionru[i]) {
      return null; // Skip this entry
    }
    return {
      title,
      description: req.body.descriptionru[i]
    };
  }).filter(entry => entry !== null); // Remove null entries

  let values = [
    [
      req.body['name-uz'],
      req.body['name-ru'],
      req.body.birthday,
      req.body['position-uz'],
      req.body['position-ru'],
      JSON.stringify(experienceUZ),
      JSON.stringify(experienceRU)
    ]
  ];
  let id;
  connection.query(
    "INSERT INTO `doctors` (`name-uz`, `name-ru`, `birthDate`, `position-uz`, `position-ru`, `experience-uz` , `experience-ru`) VALUES ?",
    [values],
    (err, result) => {
      if (err) {
        next(err);
        return;
      }
      if (result) {
        id = result.insertId;

        // Use FormData to send files and other data in the inner POST request
        let files = new FormData();
        files.append('avatar', req.files ? ['avatar'][0] : null);
        files.append('profile-photo', req.files ? ['profile-photo'][0] : null);
        files.append('id', id);

        // Define the inner POST request configuration
        let innerPostConfig = {
          method: 'post',
          url: 'http://localhost:3000/admin/addDoctorPhotos',
          data: files
        };

        // Make the inner POST request
        axios(innerPostConfig)
          .then(innerRes => {
            res.redirect('back');
          })
          .catch(error => {
            console.error('Error in inner POST request:', error);
            res.status(500).send('Error in outer POST request');
          });
      }
    }
  );
});

router.post('/addDoctorPhotos', upload.fields([{
    name: 'avatar',
    maxCount: 1
  },
  {
    name: 'profile-photo',
    maxCount: 1
  }
]), async (req, res) => {
  let files = fs.readdirSync('./temp/')
  files.forEach(file => {
    let ext = file.slice(file.lastIndexOf('.'))
    if (file.includes('avatar')) { 
      fs.renameSync(`./temp/${file}`, `./public/assets/images/avatar/team-${req.body.id}${ext}`)
    } else if (file.includes('profile')) {
      fs.renameSync(`./temp/${file}`, `./public/assets/images/team/team-${req.body.id}${ext}`)
    }
  })
  res.redirect('back');
});


router.post('/updateDoctor/:id', upload.fields([
  { name: 'avatarUpdated', maxCount: 1 },
  { name: 'profile-photoUpdated', maxCount: 1 }
]), (req, res, next) => {
  console.log(req.body.titleru);
  let experienceUZ = req.body.titleuz.map((title, i) => {
    if (!title || !req.body.descriptionuz[i]) {
      return null;
    }
    return {
      title,
      description: req.body.descriptionuz[i]
    };
  }).filter(entry => entry !== null);

  let experienceRU = req.body.titleru.map((title, i) => {
    if (!title || !req.body.descriptionru[i]) {
      return null;
    }
    return {
      title,
      description: req.body.descriptionru[i]
    };
  }).filter(entry => entry !== null); 
  let values = [
    req.body['name-uz'],
    req.body['name-ru'],
    req.body.birthday,
    req.body['position-uz'],
    req.body['position-ru'],
    JSON.stringify(experienceUZ),
    JSON.stringify(experienceRU),
    req.params.id
  ];
  connection.query(
    "UPDATE `doctors` SET `name-uz` = ?, `name-ru` = ?, `birthDate` = ?, `position-uz` = ?, `position-ru` = ?, `experience-uz` = ?, `experience-ru` = ? WHERE `doctors`.`id` = ?",
    values,
    (err, result) => {
      if (err) {
        // Pass database errors to the error handling middleware
        return next(err);
      }

      // Check if any rows were affected by the update operation
      if (result) {
        let files = new FormData();
        if (req.files && req.files['avatarUpdated']) {
          files.append('avatarUpdated', req.files['avatarUpdated'][0]);
        }
        if (req.files && req.files['profile-photoUpdated']) {
          files.append('profile-photoUpdated', req.files['profile-photoUpdated'][0]);
        }
        files.append('id', req.params.id);

        // Define the inner POST request configuration
        let innerPostConfig = {
          method: 'post',
          url: 'http://localhost:3000/admin/updateDoctorPhotos',
          data: files,
          id: req.params.id // Corrected
        }; 
        // Make the inner POST request
        axios(innerPostConfig)
          .then(innerRes => {

            res.redirect('/admin');
          })
          .catch(error => {
            // Handle inner POST request errors
            console.error('Error in inner POST request:', error);
            res.status(500).send('Error in outer POST request');
          });
      } else {
        // Handle case where no rows were affected
        res.status(404).send('Doctor not found or no changes made.');
      }
    }
  );
});


router.post('/updateDoctorPhotos', upload.fields([{
    name: 'avatarUpdated',
    maxCount: 1
  },
  {
    name: 'profile-photoUpdated',
    maxCount: 1
  }
]), (req, res) => {
  let files = fs.readdirSync('./temp/');
  files.forEach(file => {
    let ext = file.slice(file.lastIndexOf('.'));
    if (file.includes('avatar')) {
      fs.unlinkSync(`./public/assets/images/avatar/team-${req.body.id}${ext}`)
      fs.renameSync(`./temp/${file}`, `./public/assets/images/avatar/team-${req.body.id}${ext}`)
    } else if (file.includes('profile')) {
      
      fs.unlinkSync(`./public/assets/images/team/team-${req.body.id}${ext}`);
      fs.renameSync(`./temp/${file}`, `./public/assets/images/team/team-${req.body.id}${ext}`)
    }
  });
  res.redirect('/admin');
});



router.post('/deleteDoctor/:id', async (req, res, next) => {
  connection.query(`DELETE FROM \`doctors\` WHERE id = ?`, [req.params.id], (err, results, fields) => {
    if (err) {
      console.error('Error executing query: ', err);
      res.status(500).send("");
      return;
    } else {
      // fs.unlink(`./public/assets/images/team/team-${req.params.id}.jpg` || `./public/assets/images/team/team-${req.params.id}.jpeg` || `./public/assets/images/team/team-${req.params.id}.png`, function (err) {
      //   if (err) return console.log(err);
      //   next
      // });
      // fs.unlink(`./public/assets/images/avatar/team-${req.params.id}.jpg` || `./public/assets/images/avatar/team-${req.params.id}.jpeg` || `./public/assets/images/avatar/team-${req.params.id}.png`, function (err) {
      //   if (err) return console.log(err);
      //   res.redirect('back')
      // }); 
    }
    res.redirect('back')
  })
});







router.post('/addResults', upload.fields([
  { name: 'before', maxCount: 1 },
  { name: 'after', maxCount: 1 }
]), async (req, res) => {
  let directoryPath = './public/assets/images/portfolio/';
  let files = fs.readdirSync(directoryPath);
  
  // Regular expression to extract numbers from filenames
  let numberRegex = /(\d+)/;
  
  let maxNumber = 0;

  files.forEach(file => {
    let match = numberRegex.exec(file);
    if (match) {
      let number = parseInt(match[0], 10);
      if (number > maxNumber) {
        maxNumber = number;
      }
    }
  });

  // Increment the maximum number by 1
  let nextNumber = maxNumber + 1;

  // Rename and move before and after files
  let renameAndMoveFile = (file, prefix) => {
    let ext = file.slice(file.lastIndexOf('.'));
    let newFileName = `${nextNumber}${prefix}${ext}`;
    fs.renameSync(`./temp/${file}`, `${directoryPath}${newFileName}`);
  };

  if (req.files['before']) {
    renameAndMoveFile(req.files['before'][0].filename, 'b');
  }

  if (req.files['after']) {
    renameAndMoveFile(req.files['after'][0].filename, 'a');
  }

  res.redirect('back');
});




router.post('/deleteResults/:id/:ext', (req, res, next) => {

  try {

    fs.unlink(`./public/assets/images/portfolio/${req.params.id}b.${req.params.ext}`, function (err) {});
    fs.unlink(`./public/assets/images/portfolio/${req.params.id}a.${req.params.ext}`, function (err) {});

    fileList = getAllFiles(directoryPath);
    res.redirect('back');
  } catch {
    res.redirect('back');

  }
});






//     GET  

router.get('/updateDoctor/:id', (req, res, next) => {
  connection.query(`SELECT * FROM \`doctors\` WHERE id = ?`, [req.params.id], (err, results, fields) => {
    if (err) {
      console.error('Error executing query: ', err);
      res.status(500).send("")
      return;
    }
    let locale = (req.session.user && req.session.user.locale) || (req.query && req.query.locale) || 'ru';
    res.render('teamPageEdit', {
      data: getDoctorData(results[0], locale),
      i18n: global.i18n
    });
  });
});




router.get('/', (req, res, next) => {
  fileList = getAllFiles(directoryPath);
  connection.query(`SELECT * FROM \`doctors\` `, (err, results, fields) => {
    if (err) {
      console.error('Error executing query: ', err);
      res.status(500).send("")
      return;
    }

    let locale = req.session.user.locale || req.query.locale || 'ru'

    results = results.map(doctor => {
      return {
        ...doctor,
        name: doctor[`name-${locale}`],
        position: doctor[`position-${locale}`]

      }
    })
    res.render('admin', {
      // path: `/team`,
      i18n: global.i18n,
      array: results,
      imageArray: fileList,

    });
  });
});

module.exports = router;
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const fs = require('fs-extra')
const multer = require('multer');
const mysql = require('mysql');
const {
  METHODS
} = require('http');
const {
  error
} = require('console');
const {
  unlinkSync
} = require('fs');
const router = express.Router();
let connection;
if (process.env.NODE_ENV === 'development') {
  dbConfig = {
    host: '83.69.139.151',
    user: 'asmocli1_user',
    password: 'iuL=(Qq8;c+8',
    database: 'asmocli1_database',
    connectTimeout: 0 // Infinite timeout
  };
} else {
  dbConfig = {
    host: 'localhost',
    user: 'root',
    database: 'asmocli1_database'
  };
}



connection = mysql.createConnection({
  host: process.env.NODE_ENV === 'development' ? '83.69.139.151' : 'localhost',
  user: process.env.NODE_ENV === 'development' ? 'asmocli1_user' : 'root',
  password: process.env.NODE_ENV === 'development' ? 'iuL=(Qq8;c+8' : '',
  database: 'asmocli1_database',
  connectTimeout: 0
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
    setTimeout(handleDisconnect, 2000); // Try to reconnect after 2 seconds
  } else {}
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
    if (!title) {
      return null; // Skip this entry
    }
    return {
      title,
      description: req.body.descriptionuz ? req.body.descriptionuz[i] : ""
    };
  }).filter(entry => entry !== null); // Remove null entries

  let experienceRU = req.body.titleru.map((title, i) => {
    // Check if either title or description is empty
    if (!title || !req.body.descriptionru[i]) {
      return null; // Skip this entry
    }
    return {
      title,
      description: req.body.descriptionru ? req.body.descriptionru[i] : ""
    };
  }).filter(entry => entry !== null); // Remove null entries

  let values = [
    [
      req.body['name-uz'],
      req.body['name-ru'],
      req.body['birthday'],
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

        let baseUrl = process.env.NODE_ENV === 'development' ? 'https://asmoclinic.uz' : 'http://localhost:3000';
        let url = `${baseUrl}/admin/addDoctorPhotos`;

        fetch(url, {
            method: 'POST',
            body: files
          })
          .then(response => {
            if (response.ok) {
              res.redirect('back');
            } else {
              throw new Error('Error in inner POST request');
            }
          })
          .catch(error => {
            console.error('Error in inner POST request:', error);
            res.status(500).send('Error in outer POST request');
          });

      }
    }
  );
});

router.post('/updateDoctor/:id', upload.fields([{
    name: 'avatar',
    maxCount: 1
  },
  {
    name: 'profile-photo',
    maxCount: 1
  }
]), (req, res, next) => {

  let id;
  try {
    let experienceUZ = req.body.titleuz.map((title, i) => {
      if (!title) return null;
      return {
        title,
        description: req.body.descriptionuz ? req.body.descriptionuz[i] : ""
      };
    }).filter(entry => entry !== null);

    let experienceRU = req.body.titleru.map((title, i) => {
      if (!title) return null;
      return {
        title,
        description: req.body.descriptionru ? req.body.descriptionru[i] : ""
      };
    }).filter(entry => entry !== null);

    let values = [
      req.body['name-uz'],
      req.body['name-ru'],
      req.body['birthday'],
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
        if (err) return next(err);

      });
  } catch (error) {
    next(console.error);
  }
  let files = fs.readdirSync('./temp/');
  for (const file of files) {
    let ext = path.extname(file);
    if (file.includes("avatar")) {
      const avatarPath = `./public/assets/images/avatar/team-${req.params.id}`;
      const tempFilePath = `./temp/avatar${ext}`;
      let avatarFilePath = avatarPath + ext;
      try {
        if (fs.existsSync(avatarFilePath)) {
          fs.unlinkSync(avatarFilePath);
        }
      } catch (error) {
        console.log(error);
      }
      if (!fs.existsSync(`./public/assets/images/avatar/team-${req.params.id}${ext}`)) {
        fs.renameSync(`./temp/avatar${ext}`, `./public/assets/images/avatar/team-${req.params.id}${ext}`);
      }

    } else if (file.includes("profile")) {
      const profilePath = `./public/assets/images/team/team-${req.params.id}`;
      const tempFilePath = `./temp/profile-photo${ext}`;
      let profileFilePath = profilePath + ext;
      try {
        if (fs.existsSync(profileFilePath)) {
          fs.unlinkSync(profileFilePath);
        }
      } catch (error) {
        console.log(error);
      }
      if (!fs.existsSync(`./public/assets/images/team/team-${req.params.id}${ext}`)) {
        fs.renameSync(`./temp/profile-photo${ext}`, `./public/assets/images/team/team-${req.params.id}${ext}`);
      }
    }
  }
  res.redirect('/admin')

});
router.post('/addDoctorPhotos', upload.fields([{
    name: 'avatar',
    maxCount: 1
  },
  {
    name: 'profile-photo',
    maxCount: 1
  }
]), (req, res) => {
  try {
    // Read files from the temp folder
    let files = fs.readdirSync('./temp/');

    // Loop through each file
    for (const file of files) {
      let ext = path.extname(file);
      let sourceFilePath = `./temp/${file}`;
      for (const file of files) {
        let ext = path.extname(file);
        let sourceFilePath = `./temp/${file}`;
        let destinationFilePath;

        // Check if the file extension is .jpg, .jpeg, or .png
        if (['.jpg', '.jpeg', '.png'].includes(ext.toLowerCase())) {
          // Check if the file starts with 'avatar' or 'profile-photo'
          if (file.startsWith('avatar')) {
            // Define the destination path for avatar images
            destinationFilePath = `./public/assets/images/avatar/team-${req.body.id}${ext}`;
            if (destinationFilePath) {
              fs.removeSync(destinationFilePath)
            }
          } else if (file.startsWith('profile-photo')) {
            // Define the destination path for profile photo images
            destinationFilePath = `./public/assets/images/team/team-${req.body.id}${ext}`;
            if (destinationFilePath) {
              fs.removeSync(destinationFilePath)
            }
          }
          // Move file only if destination is defined
          if (destinationFilePath) {
            fs.renameSync(sourceFilePath, destinationFilePath);
          }
        }
      }
    }
  } catch (err) {
    // Log any errors that occur during file processing
    console.log(err);
    // Send a 500 status with an error message
    return res.status(500).send("Internal Server Error");
  }
  // Redirect to admin page after processing files
  res.redirect('/admin');
});

// router.put('/putDoctorPhotos', upload.fields([{
//     name: 'avatar',
//     maxCount: 1
//   },
//   {
//     name: 'profile-photo',
//     maxCount: 1
//   }
// ]), (req, res) => {
//   let files = fs.readdirSync('./temp/');
//   for (const file of files) {
//     let ext = path.extname(file);
//     console.log(req);
//     if (file.includes("avatar")) {
//       const avatarPath = `./public/assets/images/avatar/team-${req.body.id}`;
//       const tempFilePath = `./temp/avatar${ext}`;
//       let avatarFilePath = avatarPath + ext;
//       try {
//         if (fs.existsSync(avatarFilePath)) {
//           fs.unlinkSync(avatarFilePath);
//         }
//       } catch (error) {
//         console.log(error);
//       }
//       if (!fs.existsSync(`./public/assets/images/avatar/team-${req.id}${ext}`)) {
//         fs.renameSync(`./temp/avatar${ext}`, `./public/assets/images/avatar/team-${req.id}${ext}`);
//       }

//     }
//   }
//   res.redirect('/admin')
// });



// Delete Doctor

router.post('/deleteDoctor/:id', (req, res, next) => {
  connection.query(`DELETE FROM \`doctors\` WHERE id = ?`, [req.params.id], (err, results, fields) => {
    if (err) {
      console.error('Error executing query: ', err);
      res.status(500).send("");
      return;
    } else {
      const imagePath = `./public/assets/images/team/team-${req.params.id}`;
      const avatarPath = `./public/assets/images/avatar/team-${req.params.id}`;

      // Define an array of possible file extensions
      const extensions = ['.jpg', '.jpeg', '.png'];

      try {
        // Loop through each extension and attempt to delete the file
        for (const extension of extensions) {
          const imageFilePath = `${imagePath}${extension}`;
          const avatarFilePath = `${avatarPath}${extension}`;

          // Delete image file
          if (fs.pathExistsSync(imageFilePath)) {
            unlinkSync(imageFilePath);
          }

          // Delete avatar file
          if (fs.pathExistsSync(avatarFilePath)) {
            unlinkSync(avatarFilePath);
          }
        }
        // Redirect back after deletion
        res.redirect('back');
      } catch (error) {
        console.error('Error deleting files: ', error);
        res.status(500).send("");
      }
    }
  });
});

// POST RESULTS

router.post('/addResults', upload.fields([{
    name: 'before',
    maxCount: 1
  },
  {
    name: 'after',
    maxCount: 1
  }
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


// GET 

router.get('/updateDoctor/:id', (req, res, next) => {
  connection.query(`SELECT * FROM \`doctors\` WHERE id = ?`, [req.params.id], (err, results, fields) => {
    if (err) {
      console.error('Error executing query: ', err);
      res.status(500).send("")
      return;
    }
    res.render('teamPageEdit', {
      data: getDoctorData(results[0]),
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
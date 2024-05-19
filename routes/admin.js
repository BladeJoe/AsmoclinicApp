const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra')
const multer = require('multer');
const mysql = require('mysql');
const axios = require('axios');


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
    database: 'asmocli1_database'
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
  }
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


function backUp() {
  let backupfile = './backup.json'


  let values = [];
  connection.query(`SELECT * FROM \`doctors\` `, (err, results, fields) => {

    // Iterate over the results array
    results.forEach(result => {
      // Extract values from each result
      const {
        'name-uz': nameUZ,
        'name-ru': nameRU,
        birthDate,
        'position-uz': positionUZ,
        'position-ru': positionRU,
        'experience-uz': experienceUZ,
        'experience-ru': experienceRU
      } = result;

      // Parse experienceUZ and experienceRU from JSON strings to arrays
      const experienceUZArray = JSON.parse(experienceUZ);
      const experienceRUArray = JSON.parse(experienceRU);

      // Push the extracted values into the values array
      values.push([
        nameUZ,
        nameRU,
        birthDate,
        positionUZ,
        positionRU,
        JSON.stringify(experienceUZArray),
        JSON.stringify(experienceRUArray)
      ]);
    });

    // Write the values array to backup.json
    fs.writeFileSync(backupfile, JSON.stringify(values, null, 2), (err) => {
      if (err) throw err;
      console.log('Backup data has been written to backup.json');
    });

    fs.readFile(backupfile, 'utf8', (err1, data1) => {
      if (err1) {
        console.error('Error reading backup.json:', err1);
        return;
      }

      // Read the contents of backup1.json
      fs.readFile('merged_backup.json', 'utf8', (err2, data2) => {
        if (err2) {
          console.error('Error reading backup1.json:', err2);
          return;
        }

        try {
          // Parse JSON data from both files
          const backupData1 = JSON.parse(data1);
          const backupData2 = JSON.parse(data2);

          // Merge the contents of both files
          const mergedData = [...backupData1, ...backupData2];

          // Write the merged data to a new file
          fs.writeFile('merged_backup.json', JSON.stringify(mergedData, null, 2), 'utf8', (err3) => {
            if (err3) {
              console.error('Error writing to merged_backup.json:', err3);
              return;
            } 
          });
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }
      });
    });

  });
}

function backUpInit() {
  // const rawData = fs.readFileSync('filename.json');
  const data = JSON.parse(rawData);
  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to database:', err);
      return;
    }
    console.log('Connected to database.');
  });

  // Define the SQL INSERT statement
  const insertQuery =
    "INSERT INTO `doctors` (`name-uz`, `name-ru`, `birthDate`, `position-uz`, `position-ru`, `experience-uz` , `experience-ru`) VALUES (?, ?, ?, ?, ?, ?, ?)";

  // Iterate over each data entry and execute the INSERT query
  data.forEach(entry => {
    connection.query(insertQuery, entry, (err, result) => {
      if (err) {
        console.error('Error inserting data:', err);
        return;
      }
      console.log('Data inserted successfully:', result);
    });
  });

  // Close the connection
  connection.end();
}



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
      backUp();
      if (result) {
        id = result.insertId;

        // Use FormData to send files and other data in the inner POST request
        let files = new FormData();
        files.append('avatar', req.files ? ['avatar'][0] : null);
        files.append('profile-photo', req.files ? ['profile-photo'][0] : null);
        files.append('id', id);

        let baseUrl = process.env.NODE_ENV === 'development' ? 'https://asmoclinic.uz' : 'http://localhost:3000';
        let url = `${baseUrl}/admin/addDoctorPhotos`;
        let innerPostConfig = {
          method: 'post',
          url: url,
          data: files
        };
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

router.post('/updateDoctor/:id', upload.fields([{
    name: 'avatar',
    maxCount: 1
  },
  {
    name: 'profile-photo',
    maxCount: 1
  }
]), (req, res, next) => {
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
  backUp();
  try {
    // Confirm the files exist in the temp directory
    let files = fs.readdirSync('./temp/');

    for (const file of files) {
      let ext = path.extname(file);
      let fileType;
      let destinationPath;
      let tempFilePath = `./temp/${file}`;

      if (file.includes("avatar")) {
        fileType = "avatar";
        destinationPath = `./public/assets/images/avatar/team-${req.params.id}${ext}`;
      } else if (file.includes("profile")) {
        fileType = "profile-photo";
        destinationPath = `./public/assets/images/team/team-${req.params.id}${ext}`;
      } else {
        continue;
      }

      // Attempt to delete existing files in the destination
      try {
        if (fs.pathExistsSync(destinationPath)) {
          fs.unlinkSync(destinationPath);
        }
      } catch (error) {}

      // Call the function to rename and move the files
      renameAndMoveFile(tempFilePath, destinationPath, fileType);
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
    // Confirm the files exist in the temp directory
    let files = fs.readdirSync('./temp/');

    for (const file of files) {
      let ext = path.extname(file);
      let fileType;
      let destinationPath;
      let tempFilePath = `./temp/${file}`;

      if (file.includes("avatar")) {
        fileType = "avatar";
        destinationPath = `./public/assets/images/avatar/team-${req.body.id}${ext}`;
      } else if (file.includes("profile")) {
        fileType = "profile-photo";
        destinationPath = `./public/assets/images/team/team-${req.body.id}${ext}`;
      } else {
        continue;
      }

      // Attempt to delete existing files in the destination
      try {
        if (fs.pathExistsSync(destinationPath)) {
          fs.unlinkSync(destinationPath);
          console.log(`Deleted existing ${fileType} at ${destinationPath}`);
        }
      } catch (error) {
        console.log(`Error deleting ${fileType}:`, error);
      }

      // Call the function to rename and move the files
      renameAndMoveFile(tempFilePath, destinationPath, fileType);
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

function renameAndMoveFile(tempFilePath, destinationPath, fileType) {
  try {
    if (fs.pathExistsSync(tempFilePath)) {
      fs.renameSync(tempFilePath, destinationPath);
    } else {}
  } catch (error) {
    console.log(`Error moving ${fileType}:`, error);
  }
}
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
      data: getDoctorData(results[0], 'uz'),
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

    let locale = req.session.user.locale || req.query.locale || 'uz'

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
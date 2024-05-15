const path = require('path');

const express = require('express');

const router = express.Router();
const fs = require('fs');

function getAllFiles(directoryPath, fileList) {
  const files = fs.readdirSync(directoryPath);

  fileList = fileList || [];

  files.forEach(file => {
    const filePath = path.join(directoryPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      fileList = getAllFileNamesInDirectory(filePath, fileList); // Recursively search subdirectories
    } else {
      fileList.push(file); // Push just the file name without the path
    }
  });

  return fileList;
}
// Directory path
const directoryPath = './public/assets/images/portfolio';

// Get all files in the directory
let fileList = getAllFiles(directoryPath);
router.get('/', (req, res, next) => {
 fileList = getAllFiles(directoryPath);
  res.render('results', {
    path: '/results',
    i18n: global.i18n,
    imageArray: fileList
  });
});

module.exports = router;
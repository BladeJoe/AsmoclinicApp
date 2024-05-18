// Import the mysql module

const mysql = require('mysql'); 





// Create a connection to the MySQL database

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
});

// // Create a connection to the MySQL database

// const connection = mysql.createConnection({

//   host: '83.69.139.151', 

//   user: 'asmocli1_user',

//   password: 'iuL=(Qq8;c+8',

//   database: 'asmocli1_database'

// });

// Connect to the database\



// Execute a SQL query

connection.query('SELECT * FROM doctors', (err, results, fields) => {

  if (err) {

    console.error('Error executing query: ', err);

    return;

  } 

});



// Close the connection

connection.end((err) => {

  if (err) {

    console.error('Error closing connection: ', err);

    return;

  } 

});



module.exports = connection
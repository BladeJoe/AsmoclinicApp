const path = require('path');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const morgan = require('morgan');
const app = express();
const router = require('./routes');
const routerTeam = require('./routes/team');
const routerGallery = require('./routes/gallery');
const routerResults = require('./routes/results');
const routerAdmin = require('./routes/admin');
const routerBlogs = require('./routes/blogs');
const routerAbout = require('./routes/about'); 

// Create a write stream (in append mode)
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'logs.log'), { flags: 'a' });

app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', 'views');
app.use(express.static('public'));
app.use(express.urlencoded({
  extended: true
}));
app.use(express.json());

// Session middleware
app.use(session({
  secret: 'alskdjfalkdsjf',
  resave: false,
  saveUninitialized: true
}));
 
// Internationalization middleware
app.use((req, res, next) => {
  let locale = (req.session.user && req.session.user.locale) || (req.query && req.query.locale) || 'ru';
  req.session.user = req.session.user || {}
  req.session.user.locale = locale
  req.session.save()
  const file = __dirname + "/i18n/" + locale + ".json";
  fs.readFile(file, (err, data) => {
    if (err) res.send("Error loading language file: " + file);
    else {
      global.i18n = JSON.parse(data);
      next();
    }
  });
});

// Logging middleware
app.use(morgan('combined', { stream: accessLogStream }));

// Set language endpoint
app.post('/set-language', express.json(), (req, res) => {
  const { locale } = req.body;
  req.session.user = req.session.user || {};
  req.session.user.locale = locale;

  setTimeout(() => {
    res.redirect(req.get('referer'));
  }, 1000); // 1000 milliseconds delay
});


// Routes
app.use('/', router);
app.use('/team', routerTeam);
app.use('/gallery', routerGallery);
app.use('/about', routerAbout);
app.use('/results', routerResults);
// app.use('/blogs', routerBlogs); // This route is commented out, perhaps it's not needed currently
app.use('/admin', routerAdmin);

// Error handling middleware
app.use((err, req, res, next) => {
  // Log the error to a file
  fs.appendFile('error.log', `${new Date().toISOString()}: ${err.stack}\n`, (error) => {
    if (error) {
      console.error('Error writing to log file:', error);
    }
  });

  // Render an error page or send an error response
  res.status(500).send('Something went wrong!');
});

// 404 Error handler
app.use((req, res, next) => {
  res.status(404).render('404', { path: '/404' });
});


process.on('unhandledRejection', (error) => {
  // Handle unhandled promise rejection
  console.error('Unhandled promise rejection:', error);
});


// Start server
app.listen(3000);

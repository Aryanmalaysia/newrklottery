import 'dotenv/config'

import express from 'express';
import configViewEngine from './config/configEngine';
import routes from './routes/web';
import cronJobContronler from './controllers/cronJobContronler';
import socketIoController from './controllers/socketIoController';
require('dotenv').config();
let cookieParser = require('cookie-parser');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
     res.set('Surrogate-Control', 'no-store');
    next();
});

const port = process.env.PORT || 7000;

app.use(cookieParser());
// app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// setup viewEngine
configViewEngine(app);
// init Web Routes
routes.initWebRouter(app);

// Cron game 1 Phut 
cronJobContronler.cronJobGame1p(io);

// Check xem ai connect vào sever 
socketIoController.sendMessageAdmin(io);

// app.all('*', (req, res) => {
//     return res.render("404.ejs"); 
// });


server.listen(port, () => {
    console.log("Connected success port: " + port);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Log the error, but continue running the server
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  // Log the error, but continue running the server
});

process.on('SIGINT', () => {
  console.log('Received SIGINT. Shutting down server gracefully.');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0); // Exit the process with a success exit code
  });
});

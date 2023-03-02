const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app)
const io = require('socket.io')(server);
const PORT = process.env.PORT || 3001
const rateLimit = require("express-rate-limit");

const usuarios = {};

server.listen(PORT, () => {
   console.log('Servidor ejecutando en puerto: ' + PORT);
});

const accountLimiterUsers = rateLimit({
   windowMs: 60 * 60 * 1000, // 1 hora
   max: 4, // limita cada IP a 6 peticiones por el tiempo definido con "windowMs"
   message: "Demasiadas peticiones realizadas, intenta despues de 1 hora"
 });

app.use(express.static(path.join(__dirname, 'src')));

app.get("/intentos", accountLimiterUsers, (req, res) => {
   res.send('Ya estas dentro del chat ...')
 });

io.on('connection', (socket) => {

   socket.on('register', ( username ) => {
      if ( usuarios[username] ) {
         socket.emit('login-issue');
         return;
      } else {
         usuarios[username] = socket.id;
         socket.username = username;
         socket.emit('login');
         io.emit('user-connected', usuarios);
      }
   });

   socket.on('send-message', ({message, image}) => {
      io.emit('send-message', {message, user: socket.username, image});
   });

   socket.on('send-private-message', ({targetUser, message, image}) => {
      if ( usuarios[targetUser] ) {
         io.to(usuarios[targetUser]).emit('send-private-message', { from: socket.username, message, image });
         io.to(usuarios[socket.username]).emit('send-private-message', { from: socket.username, message, image });
      }else {
         socket.emit('send-private-message-issue');
      }
   });

   socket.on('disconnect', () => {
      delete usuarios[socket.username];
      io.emit('user-connected', usuarios);
   }); 
});




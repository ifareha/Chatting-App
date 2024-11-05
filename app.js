const express = require('express');
const app = express();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const socketIo = require('socket.io');
const http = require('http');
const server = http.createServer(app);

const io = socketIo(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

let userNames = [];
let userId = [];
let userStatus = [];
let activeChats = {};


io.on("connection", function(socket) {
    socket.on("nameSet", function(data) {
       userId.push(socket.id);
       userNames.push(data);
       userStatus.push('available');
       io.emit("totalUsers", { userNames, userStatus, userId});    
       socket.emit("nameSetDone");
   });
   socket.on('startChat', function(friendId){
       const friendIndex = userId.indexOf(friendId);
       const userIndex = userId.indexOf(socket.id);
       
       if (friendIndex !== -1 && userIndex !== -1 && userStatus[userIndex] === "available" && userStatus[friendIndex] === "available") {
           let room = `${socket.id}-${friendId}`;
   
           if (activeChats[room]) {
               room = activeChats[room];
           } else {
               activeChats[room] = room;
               socket.join(room);
               io.to(friendId).emit("joinRoom", { room, friendName: userNames[userIndex] });
               io.to(socket.id).emit("joinRoom", { room, friendName: userNames[friendIndex] });
           }

           userStatus[userIndex] = "busy";
           userStatus[friendIndex] = "busy";
           io.emit("totalUsers", { userNames, userId, userStatus });
       }
   });
   
   socket.on('joinRoom', function(room) {
       socket.join(room);
   });
   socket.on("message", function(message,room) {
       if (activeChats[room]) {
           io.to(room).emit('message', { message, userId: socket.id });
       }
   });
   socket.on("typing", function(){
       var index = userId.indexOf(socket.id);
       var name = userNames[index];
     
       
       socket.broadcast.emit("typing", {name: name});
     })
   socket.on("signalingMessage", function(data) {
       const message = JSON.parse(data.message);
       if(message.type === "endCall"){
           io.to(data.room).emit("callEnded");
       }
socket.broadcast.to(data.room).emit("signalingMessage", data);
       
   });        
   socket.on("startVideoCall", function(room) {
    socket.broadcast.to(room.room).emit("incommingCall",room);     
   })
   socket.on("acceptVideoCall", function(room){
   io.to(room).emit("startVideoCall");
       
   })
   socket.on("rejectCall", function(room){
       socket.broadcast.to(room).emit("callRejected");
     })
   socket.on("leaveRoom", function(room) {
       if (activeChats[room]) {
           const usersInRoom = Array.from(io.sockets.adapter.rooms.get(room) || []);
           
           usersInRoom.forEach(user => {
               const index = userId.indexOf(user);
               if (index !== -1) {
                   userStatus[index] = "available";
                   io.to(user).emit('leftRoom', room); // Notify the user to leave the room
               }
           });
   
           io.emit("totalUsers", { userNames, userId, userStatus }); // Ensure consistency in event name
   
           // Clean up the room if no users left
           if (usersInRoom.length === 0) {
               delete activeChats[room];
           }
   
           // Make both users leave the room on the server side
           usersInRoom.forEach(user => {
               const userSocket = io.sockets.sockets.get(user);
               if (userSocket) {
                   userSocket.leave(room);
               }
           });
   
           const userIndex = userId.indexOf(socket.id);
           if (userIndex !== -1) {
               userStatus[userIndex] = "available";
               io.emit("totalUsers", { userNames, userId, userStatus }); // Consistent event name
           }
       }
   });
   
   socket.on("disconnect", function(){
       const index = userId.indexOf(socket.id);
       if (index !== -1) {
           // Find the room the user was in
           const room = Object.keys(activeChats).find(r => r.includes(socket.id));
   
           if (room) {
               const usersInRoom = io.sockets.adapter.rooms.get(room);
               if (usersInRoom) {
                   usersInRoom.forEach(user => {
                       const idx = userId.indexOf(user);
                       if (idx !== -1) {
                           userStatus[idx] = "available";
                       }
                   });
                   io.emit("totalUsers", { userNames, userId, userStatus }); // Ensure consistency
               }
               delete activeChats[room]; // Clean up the room
               socket.leave(room); // User leaves the room
           }
   
           // Remove user from arrays and broadcast updated user list
           userNames.splice(index, 1);
           userId.splice(index, 1);
           userStatus.splice(index, 1);
           io.emit("totalUsers", { userNames, userId, userStatus }); // Consistent event name
       }
   });
});




app.get('/', (req, res) => {
    res.render('index');
});
app.get('/chat', (req, res) => {
    res.render('chat');
});

server.listen(5000, () => {
    console.log('Server is running on port 5000');
});

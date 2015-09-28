
var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
//var io = require('socket.io').listen(server);

var _dirname = '../MultiRoomChatService';

//map static requests to the /public folder
app.use(express.static(_dirname + '/public'));

//map a request for the root to the index.html
app.get('/', function (request, response) {
    response.sendfile(_dirname + '/public/index.html');
});

app.get('/', function (request, reponse) {
    reponse.redirect('default.html');
});

var port = 2825;
server.listen(port);
console.log("Server listening to port: " + port);


//var chatServer = require('./lib/chat_server');
//chatServer.listen(server);


var socketio = require('socket.io');
var io;
var userNumber = 1;
var userNames = {};
var namesUsed = [];
var currentRoom = {};

//exports.listen = function (server) {
    io = socketio.listen(server);
    //io.set('log level', 1);
    io.sockets.on('connection', function (socket) {

        //Assign a usernumber to user when he/she connects
        userNumber = assignUserName(socket, userNumber, userNames, namesUsed);

        //Lobby is the default chat room, Join the user to Lobby when he/She connects
        joinRoom(socket, 'Lobby');

        //handle chat conversations
        handleMessageBroadcasting(socket);

        //handle name changes
        handleNameChanges(socket, userNames, namesUsed);

        //handle room creation and changes
        handleRoomJoin(socket);

        //handle private messages
       //socket.on('privatemessage', function(to, message){}

        //Give the list of rooms on request
        socket.on('rooms', function () {
            socket.emit('rooms', io.sockets.manager.rooms);
        });

        //handle disconnection
        handleDisconnection(socket, userNames, namesUsed);
    });
//};

//user Name assignment
function assignUserName(socket, userNumber, userNames, namesUsed) {
    var name = 'User' + userNumber;
    userNames[socket.id] = name;
    socket.emit('nameResult', {
        success: true,
        name: name
    });
    namesUsed.push(name);
    
    return userNumber + 1;
}

//Joining a room
function joinRoom(socket, room) {
    socket.join(room);
    currentRoom[socket.id] = room;
    socket.emit('joinResult', { room: room });
    console.log('join room: ' + room);
    socket.broadcast.to(room).emit('message', { text: 'SERVER: ' + userNames[socket.id] + ' has joined ' + room });

    var usersInRoom = io.sockets.clients(room);
    if (usersInRoom.length > 1) {
        var usersInRoomList = 'Users currently in ' + room + ': ';
        for (var index in usersInRoom) {
            var userSocketId = usersInRoom[index].id;
            if (userSocketId != socket.id) {
                if (index > 0) {
                    usersInRoomList += ', ';
                }
                usersInRoomList += userNames[userSocketId];
            }
        }

        socket.emit('message', { text: 'SERVER: ' + usersInRoomList });
    }
}

//Name change requests
function handleNameChanges(socket, userNames, namesUsed) {
    socket.on('nameAttempt', function (name) {
        if (name.indexOf('User') == 0) {
            socket.emit('nameResult', {
                success: false,
                message: 'SERVER: Names cannot begin with "user"'
            });
        }
        else {
            if (namesUsed.indexOf(name) == -1) {
                var previousName = userNames[socket.id];
                var previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name);
                userNames[socket.id] = name;
                delete namesUsed[previousNameIndex];
                socket.emit('nameResult', {
                    success: true,
                    name: name
                });
                socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                    text: 'SERVER: ' + previousName + ' is now known as ' + name
                });
            }
            else {
                socket.emit('nameResult', {
                    success: false,
                    message: 'SERVER: This name is already in use'
                });
            }
        }
    });
}


//Sending chat messages
function handleMessageBroadcasting(socket) {
    
    socket.on('message', function (message) {
        //console.log('room: ' + message.room + '-' + userNames);
        var d = new Date();
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
            text: '[' + d.getMonth() +'/' + d.getDate() +'/' + d.getFullYear() +']' + userNames[socket.id] + ': ' + message.text
        });
    });
}

//private message
//function handlePrivateMessage(socket, userNames) {
//    socket.on('privateMessage', function (message) {
//        var name = message.substring(0, index);
//        var actualmesg = message.substring(index + 1);
//        namesUsed[name].emit('private', {message: actualmesg, name: name });
//    });
//}


//Room change requests
function handleRoomJoin(socket) {
    socket.on('join', function (room) {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    });
}


//user disconnection
function handleDisconnection(socket, userNames, namesUsed) {
    socket.on('disconnect', function () {
        var nameIndex = namesUsed.indexOf(userNames[socket.id]);
        delete namesUsed[nameIndex];
        delete userNames[socket.id];
    });
}

var socketio = require('socket.io');
var io;
var userNumber = 1;
var userNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function (server) {
    io = socketio.listen(server);
    io.set('log level', 1);
    io.sockets.on('connection', function (socket) {

        //Assign a usernumber to user when he/she connects
        userNumber = assignUserName(socket, userNumber, userNames, namesUsed);

        //Lobby is the default chat room, Join the user to Lobby when he/She connects
        joinRoom(socket, 'Lobby');

        //handle chat conversations
        handleMessageBroadcasting(socket, userNames);

        //handle name changes
        handleNameChanges(socket, userNames, namesUsed);

        //handle room creation and changes
        handleRoomJoin(socket);

        //Give the list of rooms on request
        socket.on('rooms', function () {
            socket.emit('rooms', io.sockets.manager.rooms);
        });

        //handle disconnection
        handleDisconnection(socket, userNames, namesUsed);
    });
};

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
        socket.broadcast.to(room).emit('message', { text: userNames[socket.id] + ' has joined ' + room });

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

            socket.emit('message', { text: usersInRoomList });
        }
    }

    //Name change requests
    function handleNameChanges(socket, userNames, namesUsed) {
        socket.on('nameAttempt', function (name) {
            if (name.indexOf('User') == 0) {
                socket.emit('nameResult', {
                    success: false,
                    message: 'Names cannot begin with "user"'
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
                        text: previousName + ' is now known as ' + name
                    });
                }
                else {
                    socket.emit('nameResult', {
                        success: false,
                        message: 'This name is already in use'
                    });
                }
            }
        });
    }


    //Sending chat messages
    function handleMessageBroadcasting(socket, userNames) {
        socket.on('message', function (message) {
            socket.broadcast.to(message.room).emit('message', {
                text: userNames[socket.id] + ': ' + message.text
            });
        });
    }


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
            socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                text: 'SERVER: ' + name + ' left the room'
            });
            delete namesUsed[nameIndex];
            delete userNames[socket.id];
        });
    }

﻿var chat = function (socket) {
    this.socket = socket;
};

chat.prototype.sendMessage = function (room, text) {
    var message = {
        room: room,
        text: text
    };
    this.socket.emit('message', message);
};

chat.prototype.changeRoom = function (room) {
    this.socket.emit('join', {
        newRoom: room
    });
};

chat.prototype.processCommand = function (command) {
    var words = command.trim();
        words = command.split(' ');
    var command = words[0].substring(1, words[0].length).toLowerCase();
    var message = false;
    switch (command) {
        case 'join':
            words.shift();
            var room = words.join(' ');
            this.changeRoom(room);
            break;
        case 'changename':
            words.shift();
            var name = words.join(' ');
            this.socket.emit('nameAttempt', name);
            break;
        //cs
        default:
            message = 'Unrecognized command';
            break;
    }
    return message;
};
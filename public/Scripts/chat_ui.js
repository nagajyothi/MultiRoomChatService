/// <reference path="jquery-2.1.4.js" />


function divEscapedContentElement(message) {
    return $('<div></div>').text(message);
}

function divSystemContentElement(message) {
    return $('<div></div>').html('<i>' + message + '</i>');
}

function processUserInput(chatApp, socket) {
    var d = new Date();
    var message = $('#message').val();
    var systemMessage;
    //console.log("message is :" + message);
    if (message.charAt(0) == '/') {
        systemMessage = chatApp.processCommand(message);
        if (systemMessage) {
            $('#messages').append(divSystemContentElement(message));
        }
    }
    else {
        chatApp.sendMessage($('#room').text(), message);
        $('#messages').append(divEscapedContentElement('[' + d.getMonth() +'/' + d.getDate() +'/' + d.getFullYear() +']me: '  + message));
        $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    }
    $('#message').val('');
}

var socket;

$(document).ready(function () {
    socket = io.connect('http://52.88.189.77/');
    
    var chatApp = new chat(socket);
    socket.on('nameResult', function (result) {
        var message;
        if (result.success) {
            message = 'You are now known as ' + result.name;
        }
        else {
            message = result.message;
        }
        $('#messages').append(divSystemContentElement(message));
    });

    socket.on('joinResult', function (result) {
        $('#room').html('<b> Current Room: </b>' + result.room);
        $('#messages').append(divSystemContentElement('Room Changed'));
    });

    socket.on('message', function (message) {
        var newElement = $('<div></div>').text(message.text);
        $('#messages').append(newElement);
    });

    //socket.on('private', function (message) {
    //    var newElement = $('<div></div>').html('<i>' + message.text + '</i>');
    //    $('#messages').append(newElement);
    //});

    socket.on('rooms', function (rooms) {
        $('#roomlist').empty();
        for (var room in rooms) {
            room = room.substring(1, room.length);
            if (room != '') {
                $('#roomlist').append(divEscapedContentElement(room));
            }
        }

        $('#roomlist div').click(function(){
            chatApp.processCommand('/join' + $(this).text());
            $('#message').focus();
        });

        
    });


    setInterval(function () {
        socket.emit('rooms');
    }, 1000);

    $('#message').focus();
    $('#sendform').submit(function () {
       
        processUserInput(chatApp, socket);

        return false;
    });

});
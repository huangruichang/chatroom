var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var common = require('./common');
var port = process.env.PROT || 3000;

server.listen(port, function () {
    console.log('Server listening at port %d', port);
});

var userList = [];

app.use(express.static(__dirname + '/public'));

io.on('connection', function (socket) {

    var user_added = false;

    socket.on('message.new', function (data) {
        socket.broadcast.emit('message.new', {
            username: socket.username,
            content: data
        });
    });

    socket.on('user.add', function (username) {
        socket.username = username;
        user_added = true;
        userList.push({
            username: username,
            isFocus: true
        });

        var data = {
            user: {
                username: socket.username,
                isFocus: true
            },
            users_num: userList.length
        };

        socket.broadcast.emit('user.add', data);
        socket.emit('user.add', data);
    });

    socket.on('user.name.valid', function (username) {
        var data = {
            is_valided: true
        };
        if (common.checkDuplicate(userList, {username: username}, 'username')) {
            data.is_valided = false;
            data.msg = 'user already existed!';
        }
        socket.emit('user.name.valid', data);
    });

    socket.on('user.list.status', function () {
        socket.emit('user.list.status', {
            userList: userList
        });
    });

    socket.on('user.isFocus', function (data) {
        for (var i = 0; i < userList.length; i++) {
            if (userList[i].username === data.username) {
                userList[i].isFocus = data.isFocus;
            }
        }
        var result = {
            username: data.username,
            isFocus: data.isFocus
        };
        socket.emit('user.isFocus', result);
        socket.broadcast.emit('user.isFocus', result);
    });

    socket.on('disconnect', function () {
        if (user_added) {
            userList = common.removeItem(userList, { username: socket.username }, 'username');
            socket.broadcast.emit('user.left', {
                username: socket.username,
                users_num: userList.length
            });
        }
    });
});
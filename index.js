var sticky = require('sticky-session');
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var common = require('./common');
var port = process.env.PORT || 3000;
var fs = require('fs-extra');
var config = fs.readJsonSync('./config.json');
var UserService = require('./user');
var MessageService = require('./message');
var userService = new UserService(config);
var messageService = new MessageService(config);
var cluster = require('cluster');
var cpus = require('os').cpus();

//@TODO need to clean the not connected socket
var sockets = [];

if (!sticky.listen(server, 3000)) {
    // Master code

    // auto refork
    cluster.on('exit', function (workder, code, signal) {
        console.log('workder ' + workder.process.pid + ' died');
        var count = common.countKey(cluster.workers);
        if (count < cpus.length) {
            console.log('forking new...');
            cluster.fork();
        }
    });

    cluster.on('online', function (worker) {
        var _process = worker.process;
        var pid = _process.pid;
        _process.on('message', function (message) {
            // broadcast
            var workers = cluster.workers;
            for (var i in workers) {
                workers[i].process.send({
                    message: message,
                    pid: pid
                });
            }
        });
        console.log('process %d activate!', pid);
    });

    server.once('listening', function() {
        console.log('server started on 3000 port');
    });
} else {
    // Worker code
    app.use(express.static(__dirname + '/public'));

    io.on('connection', function (socket) {

        sockets.push(socket);

        console.log('pid: %d is serving...', process.pid);

        socket.on('message.new', function (data) {
            var messageObj = {
                username: socket.username,
                content: data
            };
            var aPromise = messageService.addMessage(messageObj);
            aPromise.then(function (result) {
                messageObj.index = result;
                socket.emit('message.new', messageObj);
                socket.broadcast.emit('message.new', messageObj);
                ipcMessageBroadcast(messageObj, 'message.new');
            });
        });

        socket.on('message.list', function (data) {
            if (data && data.index) {
                var lPromise = messageService.listAfterMessages(data.index);
                lPromise.then(function (result) {
                    socket.emit('message.list', {
                        list: result
                    });
                });
            }
        });

        socket.on('user.add', function (username) {
            socket.username = username;
            var aPromise = userService.addUser({
                username: username,
                isFocus: true,
                last_active: Date.parse(new Date())
            });

            aPromise.then(function (user) {
                var data = {
                    user: {
                        username: user.username,
                        isFocus: true
                    },
                    users_num: user.users_num
                };
                socket.broadcast.emit('user.add', data);
                socket.emit('user.add', data);
                ipcMessageBroadcast(user, 'user.add');
            });
        });

        socket.on('user.name.valid', function (username) {
            var data = {
                is_valided: true
            };
            var uPromise = userService.isExisted(username);
            uPromise.then(function (result) {
                data.is_valided = !result;
                if (!data.is_valided) {
                    data.msg = 'user already exists!';
                }
                socket.emit('user.name.valid', data);
            });
        });

        socket.on('user.list.status', function () {
            var lPromise = userService.listUsers();
            lPromise.then(function (userList) {
                socket.emit('user.list.status', {
                    userList: userList
                });
            });
        });

        socket.on('user.isFocus', function (data) {
            var result = {
                username: data.username,
                isFocus: data.isFocus
            };
            userService.updateUser(data.username, {
                isFocus: data.isFocus
            });
            socket.emit('user.isFocus', result);
            socket.broadcast.emit('user.isFocus', result);
            ipcMessageBroadcast(result, 'user.isFocus');
        });

        socket.on('user.reconnected', function (data) {
            if (data && data.username) {
                socket.username = data.username;
            }
        });

        socket.on('disconnect', function () {
            if (socket.username) {
                var rPromise = userService.removeUser(socket.username);
                rPromise.then(function (result) {
                    var data = {
                        username: socket.username,
                        users_num: result
                    };
                    socket.broadcast.emit('user.left', data);
                    ipcMessageBroadcast(data, 'user.left');
                });
            }
        });
    });

    var ipcMessageBroadcast = function (message, event) {
        if (event) {
            message.event = event;
        }
        message.pid = process.pid;
        process.send(message);
    };

    process.on('message', function (data) {
        if (data.pid === process.pid) {
            return;
        }
        if (!data.message || !data.message.event) {
            return;
        }
        var event = data.message.event;
        switch (event) {
            case 'user.add':
                sockets.forEach(function (socket) {
                    var user = data.message;
                    socket.emit('user.add', {
                        user: user
                    });
                });
                break;
            case 'user.left':
                sockets.forEach(function (socket) {
                    socket.emit('user.left', data.message);
                });
                break;
            case 'message.new':
                sockets.forEach(function (socket) {
                    socket.emit('message.new', data.message);
                });
                break;
            case 'user.isFocus':
                sockets.forEach(function (socket) {
                    socket.emit('user.isFocus', data.message);
                });
                break;
            default : break;
        }
    });
}

process.on('uncaughtException', function (err) {
    //@TODO send error report by email
    console.log(err);
});
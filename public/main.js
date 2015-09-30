$(function () {

    var $window = $(window);
    var $messageSendingInput = $('.message-sending-input');
    var $messagePanel = $('.message-panel');
    var $pickName = $('input[name="user-name"]');
    var $loginModal = $('.login-modal-dimmer');
    var $chatRoom = $('.chatroom');
    var $headerUsername = $('#header-username');

    var username;
    var userList;
    var lastMessage;
    var $currentInput = $messageSendingInput.focus();

    var scrolling = false;
    var connected = false;

    var socket = io();

    var setUser = function () {
        username = escapeInput($pickName.val());
        if (username) {
            $loginModal.fadeOut();
            $chatRoom.fadeIn();
            $headerUsername.text(username);
            setTimeout(function () {
                $currentInput = $messageSendingInput.focus();
            }, 30);

            socket.emit('user.add', username);

            // fetch user list
            socket.emit('user.list.status');
        }
    };

    var sendMessage = function () {
        var message = $messageSendingInput.val();
        message = escapeInput(message);

        if (message && username) {
            $messageSendingInput.val('');
            /*addMessage({
                username: username,
                content: message
            });*/
            socket.emit('message.new', message);
        }
    };

    var escapeInput = function (input) {
        return $('<div/>').text(input).text();
    };

    var addMessage = function (message) {
        // mark last message
        lastMessage = message;
        var $message = buildMessageItem(message);
        $messagePanel.append($message);
        if (!scrolling) {
            $messagePanel[0].scrollTop = $messagePanel[0].scrollHeight;
        }
    };

    // judge if user is reading history message
    $messagePanel.scroll(function () {
        scrolling = $messagePanel[0].scrollTop + $messagePanel[0].clientHeight != $messagePanel[0].scrollHeight;
    });

    var buildMessageItem = function (message) {
        var $message = $('<div class="message-item message">');
        var $username = $('<span class="user-name">' + message.username + ': </span> ');
        var $content = $('<span class="message-content">').text(message.content);
        $username.append($content);
        $message.append($username);
        return $message;
    };

    var buildJoinInMessage = function (username, usernum) {
        var html_str = ['<div class="message-item tip">',
                            '<div><span class="user-name ellipsis">', '</span> join in the chatroom</div>',
                            '<div class="online-user-num"><span>', usernum, '</span> online now.</div>',
                        '</div>'
                       ].join('');
        var $dom = $(html_str);
        $dom.find('.user-name').text(username);
        return $dom;
    };

    var buildLeftMessage = function (username) {
        var html_str = ['<div class="message-item tip">',
                            '<span class="user-name ellipsis">', '</span> left.',
                        '</div>'
                        ].join('');
        var $dom = $(html_str);
        $dom.find('.user-name').text(username);
        return $dom;
    };

    var buildReconnectingMessage = function () {
        var html_str = '<div class="message-item tip reconnecting">you have <span class="warning">disconnected</span>, reconnecting now...</div>';
        var $dom = $(html_str);
        return $dom;
    };

    var buildReconnectSuccessMessage = function () {
        var html_str = '<div class="message-item tip reconnecting"><span class="succeed">reconnect succeed!</span></div>';
        var $dom = $(html_str);
        return $dom;
    };

    var refreshUserList = function (list) {
        if (!list || list.length === 0) return;
        var $list = buildUserList(list);
        $('.user-list').replaceWith($list);
    };

    var buildUserList = function (list) {
        if (!list || list.length === 0) return;
        var ul = $('<ul class="user-list">');
        for (var i = 0; i < list.length; i++) {
            var userItem = buildUserItem(list[i]);
            ul.append(userItem);
        }
        return ul;
    };

    var buildUserItem = function (user) {
        var li = $('<li class="user-item" data-id="' + user.username + '">');
        var i = $('<i class="fa fa-user">');
        var span = $('<span class="user-name ellipsis">').text(user.username);

        if (user.isFocus) {
            li.addClass('user-focus');
        } else {
            li.addClass('user-not-focus');
        }

        if (username === user.username) {
            li.addClass('current-user');
        }

        li.append(i);
        li.append(span);

        return li;
    };

    var removeItem = function (list, item, key) {
        if (!list || !list.length) return;
        for (var i = 0; i < list.length; i++) {
            if (list[i][key] === item[key]) {
                list.splice(i, 1);
            }
        }
        return list;
    };

    var markFocus = function($el) {
        if ($el.hasClass('user-not-focus')) $el.removeClass('user-not-focus');
        if ($el.hasClass('user-focus')) return;
        $el.addClass('user-focus');
        for (var i = 0; i < userList.length; i++) {
            if (userList[i].username === $el.attr('data-id')) {
                userList[i].isFocus = true;
            }
        }
    };

    var markNotFocus = function ($el) {
        if ($el.hasClass('user-focus')) $el.removeClass('user-focus');
        if ($el.hasClass('user-not-focus')) return;
        $el.addClass('user-not-focus');
        for (var i = 0; i < userList.length; i++) {
            if (userList[i].username === $el.attr('data-id')) {
                userList[i].isFocus = false;
            }
        }
    };

    var socketInit = function (socket) {
        if (!socket) return;
        socket.on('message.new', function (data) {
            addMessage({
                username: data.username,
                content: data.content,
                index: data.index
            });
        });

        socket.on('message.list', function (data) {
            console.log(data);
            if (data && data.list) {
                var list = data.list;
                if (list.length > 0) {
                    list.forEach(function (message) {
                        var $message = buildMessageItem(message);
                        $messagePanel.append($message);
                    });

                    lastMessage = list[list.length - 1];
                }
            }
        });

        socket.on('user.list.status', function (data) {
            userList = data.userList;
            refreshUserList(data.userList);
        });

        socket.on('user.name.valid', function (data) {
            if (!data.is_valided) {
                if (data.msg) alert(data.msg);
            } else {
                setUser();
            }
        });

        socket.on('user.left', function (data) {
            if (username) {
                userList = removeItem(userList, {username: data.username}, 'username');
                refreshUserList(userList);
                var $leftMessage = buildLeftMessage(data.username);
                $messagePanel.append($leftMessage);
            }
        });

        socket.on('user.add', function (data) {
            if (userList) {
                if(checkDuplicate(userList, data.user, 'username')) {
                    return;
                }
                userList.push(data.user);
                refreshUserList(userList);
            }
            if (username) {
                var $joinInMessage = buildJoinInMessage(data.user.username, data.users_num);
                $messagePanel.append($joinInMessage);
            }
        });

        socket.on('user.isFocus', function (data) {
            var $userItem = $('.user-item[data-id="' + data.username + '"]');
            if (username) {
                if (data.isFocus) {
                    markFocus($userItem);
                } else {
                    markNotFocus($userItem);
                }
            }
        });

        socket.on('reconnect', function () {
            connected = true;
            if (!username) {
                return;
            }
            // fetch userList
            // fetch messageList
            // reset username
            socket.emit('user.list.status');
            setTimeout(function () {
                console.log('message.list');
                socket.emit('message.list', lastMessage);
            }, 2000);
            socket.emit('user.reconnected', {
                username: username
            });
            var $success = buildReconnectSuccessMessage();
            $messagePanel.append($success);
        });

        socket.on('reconnecting', function () {
            if (!connected) {
                return;
            }
            connected = false;
            // reconnecting tip
            if (!username) {
                return;
            }
            var $reconnectingMessage = buildReconnectingMessage();
            $messagePanel.append($reconnectingMessage);
        });

        socket.on('connecting', function () {
            connected = false;
        });

        socket.on('connect', function () {
            connected = true;
        });
    };

    socketInit(socket);

    $window.keydown(function (event) {
        if (!connected) return;
        if (!(event.ctrlKey || event.metaKey || event.altKey)) {
            if (username) {
                $currentInput.focus();
            } else {
                $pickName.focus();
            }
        }
        if (event.which === 13) {
            if (username) {
                sendMessage();
            } else {
                var user_name = escapeInput($pickName.val());
                socket.emit('user.name.valid', user_name);
            }
        }
    });

    $window.on('focus', function () {
        if (!username || !connected) return;
        socket.emit('user.isFocus', {
            username: username,
            isFocus: true
        });
    });

    $window.on('blur', function () {
        if (!username || !connected) return;
        socket.emit('user.isFocus', {
            username: username,
            isFocus: false
        });
    });

    var checkDuplicate = function (list, item, key) {
        for (var i = 0; i < list.length; i++) {
            if (list[i][key] === item[key]) {
                return true;
            }
        }
        return false;
    };
});
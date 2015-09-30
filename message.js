var redis = require("redis");
var Q = require("q");
var redisManager = require('./redis-manager');

var Message = function () {

    Message.key = MESSAGE_KEY = "list.messages";

    var addMessage = function (msgObj) {
        var deferred = Q.defer();
        redisManager.getClient(function (err, client) {
            if (err) {
                deferred.reject(err);
                return;
            }
            client.rpush(MESSAGE_KEY, JSON.stringify(msgObj), function (err, length) {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                deferred.resolve(length - 1);
            });
        });
        return deferred.promise;
    };

    var listAfterMessages = function (index) {
        var deferred = Q.defer();
        var msg_arr = [];
        redisManager.getClient(function (err, client) {
            client.lrange(MESSAGE_KEY, index, -1, function (err, messages) {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                if (err) {
                    deferred.reject(err);
                    return;
                }
                for (var i = 0; i < messages.length; i++) {
                    var message = JSON.parse(messages[i]);
                    message.index = index + i + 1;
                    msg_arr.push(message);
                }
                deferred.resolve(msg_arr);
            });
        });
        return deferred.promise;
    };

    Message.prototype.addMessage = addMessage;
    Message.prototype.listAfterMessages = listAfterMessages;
};

module.exports = Message;
var redis = require("redis");
var Q = require('q');
var redisManager = require('./redis-manager');

var User = function () {

    var USER_KEY = 'set.users';
    var USER_ID_SQUENCE = "squence.users";    // store users' id sequences

    var listUsers = function () {
        var deferred = Q.defer();
        var user_arr = [];
        redisManager.getClient(function (err, client) {
            if (err) {
                deferred.reject(err);
                return;
            }
            client.hgetall(USER_KEY, function (err, users) {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                for (var key in users) {
                    var user = JSON.parse(users[key]);
                    user.username = key;
                    user_arr.push(user);
                }
                user_arr.sort(function (o1, o2) {
                    return o1.id - o2.id;
                });
                deferred.resolve(user_arr);
            });
        });
        return deferred.promise;
    };

    var removeUser = function (user_key) {
        var deferred = Q.defer();
        redisManager.getClient(function (err, client) {
            if (err) {
                deferred.reject(err);
                return;
            }
            client.hget(USER_KEY, user_key, function (err, userObj) {
                var user = userObj;
                if (err) {
                    deferred.reject(err);
                    return;
                }
                if (!user) {
                    deferred.resolve();
                    return;
                }
                client.hdel(USER_KEY, user_key, function (err) {
                    if (err) {
                        deferred.reject(err);
                        return;
                    }
                    client.hlen(USER_KEY, function (err, length) {
                        if (err) {
                            deferred.reject(err);
                            return;
                        }
                        deferred.resolve(length);
                    });
                });
            });
        });
        return deferred.promise;
    };

    var updateUser = function (user_key, fields) {
        var deferred = Q.defer();
        redisManager.getClient(function (err, client) {
            if (err) {
                deferred.reject(err);
                return;
            }
            client.hget(USER_KEY, user_key, function (err, user) {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                if (!user) {
                    deferred.resolve();
                    return;
                }
                user = JSON.parse(user);
                for (var key in fields) {
                    user[key] = fields[key];
                }
                client.hset(USER_KEY, user_key, JSON.stringify(user), function (err) {
                    if (err) {
                        deferred.reject(err);
                        return;
                    }
                    deferred.resolve();
                });
            });
        });
        return deferred.promise;
    };

    var addUser = function (userObj) {
        var deferred = Q.defer();
        redisManager.getClient(function (err, client) {
            if (err) {
                deferred.reject(err);
                return;
            }
            client.hget(USER_KEY, userObj.username, function (err, user) {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                if (user) {
                    deferred.reject("user already exists!");
                    return;
                }
                // use incr generate id sequence of users
                client.incr(USER_ID_SQUENCE, function (err, seq) {
                    if (err) {
                        deferred.reject(err);
                        return;
                    }
                    var id = seq;
                    userObj.id = id;
                    client.hset(USER_KEY, userObj.username, JSON.stringify(userObj), function (err) {
                        if (err) {
                            deferred.reject(err);
                            return;
                        }
                        client.hlen(USER_KEY, function (err, length) {
                            if (err) {
                                deferred.reject(err);
                                return;
                            }
                            userObj.users_num = length;
                            deferred.resolve(userObj);
                        });

                    });
                });
            });
        });
        return deferred.promise;
    };

    var isExisted = function (user_key) {
        var deferred = Q.defer();
        redisManager.getClient(function (err, client) {
            if (err) {
                deferred.reject(err);
                return;
            }
            client.hget(USER_KEY, user_key, function (err, user) {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                deferred.resolve(!!user);
            });
        });
        return deferred.promise;
    };

    User.prototype.listUsers = listUsers;
    User.prototype.removeUser = removeUser;
    User.prototype.addUser = addUser;
    User.prototype.isExisted = isExisted;
    User.prototype.updateUser = updateUser;
};

module.exports = User;
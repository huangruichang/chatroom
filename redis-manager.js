var redis = require('redis');
var fs = require('fs-extra');
var config = fs.readJsonSync('./config.json');
var RedisManager = function (config) {

    this._freeClients = [];

    var getClient = function (cb) {
        var pool = this;
        if (pool._freeClients.length > 0) {
            var client = pool._freeClients.pop();
            return pool._acquireClient(client, cb);
        } else {
            return cb(new Error("no free clients"));
        }
    };

    var _acquireClient = function (client, cb) {
        client.ping(function (err) {
            if (err) {
                cb(new Error("client is not connected"));
                return;
            }
            cb(null, client);
        });
    };

    var _init = function (config) {
        var size = config.pool_size || 10;
        var pool = this;
        for (var i = 0; i < size; i++) {
            var client = redis.createClient(config.redis.port, config.redis.host, {});
            client.on('idle', function () {
                pool._freeClients.push(client);
            });
            pool._freeClients.push(client);
        }
    };

    RedisManager.prototype.getClient = getClient;
    RedisManager.prototype._init = _init;
    RedisManager.prototype._acquireClient = _acquireClient;

    this._init(config);
};

module.exports = new RedisManager(config);
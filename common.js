var Common = function () {
    var checkDuplicate = function (list, item, key) {
        for (var i = 0; i < list.length; i++) {
            if (list[i][key] === item[key]) {
                return true;
            }
        }
        return false;
    };

    var removeItem = function (list, item, key) {
        for (var i = 0; i < list.length; i++) {
            if (list[i][key] === item[key]) {
                list.splice(i, 1);
            }
        }
        return list;
    };

    Common.prototype.checkDuplicate = checkDuplicate;
    Common.prototype.removeItem = removeItem;
};

module.exports = new Common();
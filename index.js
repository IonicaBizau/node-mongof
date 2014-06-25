// Dependencies
var Mongo = require("mongodb");
  , MongoServer = mongo.Server("127.0.0.1", 27017)
  ;

var JsonDb = module.exports = function (options, callback) {

    var self = this;

    options = Object(options);
    options.collection = options.collection || "tmp-" + Math.random().toString(36).replace(/[^A-Za-z]+/g, "");
    options.database = options.database || "jsondb";

    callback = callback || function (err) {
        throw err;
    }

    (new mongo.Db(options.database, server, { safe: true, w: 0 })).open(function (err, db) {
        if (err) { return callback (err); }
        self._database = db;
        db.collection(options.collection, function(err, col) {
            if (err) { return callback (err); }
            self._col = col;
            callback(null, db, col);
        });
    });

    // TODO
};

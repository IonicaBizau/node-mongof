// Dependencies
var Mongo = require("mongodb")
  , MongoServer = Mongo.Server("127.0.0.1", 27017)
  , Fs = require("fs")
  ;

var JsonDb = module.exports = function (options, callback) {

    var self = this;

    options = Object(options);
    options.collection = options.collection || "tmp-" + Math.random().toString(36).replace(/[^A-Za-z]+/g, "");
    options.database = options.database || "jsondb";
    options.file = options.file || options.collection + ".json";

    callback = callback || function (err) {
        throw err;
    }

    (new Mongo.Db(options.database, MongoServer, { safe: true, w: 0 })).open(function (err, db) {
        if (err) { return callback (err); }
        self._database = db;
        db.collection(options.collection, function(err, col) {
            if (err) { return callback (err); }
            self._col = col;

            for (var key in col) {
                (function (key) {
                    var keyValue = col[key];
                    self[key] = function () {
                        var args = Array.prototype.slice.call(arguments, 0);
                        args.sort();
                        args.push(self._callback);
                        console.log(key);
                        col[key].apply(col, args);
                    }
                })(key);
            }

            callback(null, db, col);
        });
    });

    self._callback = function (err, data) {
        self._col.find({}).toArray(function (err, docs) {
            if (err) { return console.log(err); }
            Fs.writeFile(options.file, JSON.stringify(docs, null, 2), function (err) {
                if (err) { return console.log(err); }
            });
        });
    };
};

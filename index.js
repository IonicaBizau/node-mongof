// Dependencies
var Mongo = require("mongodb")
  , MongoClient = Mongo.MongoClient
  , EventEmitter = require("events").EventEmitter
  , Fs = require("fs")
  , Path = require("path")
  ;

var JsonDb = module.exports = function (options) {

    // Force options to be an object and process data
    options = Object(options);
    options.collections = options.collections || [];

    // Initialize self
    var self = new EventEmitter();
    self._options = options;
    self._instance = this;
    self._cache = {};

    self.addInCache = function (uri, dbObj, colName, colObj) {

        var uriCache = self._cache[uri] = self._cache[uri] || {};
        uriCache.db = dbObj;

        if (!colName || !colObj) { return self; }

        uriCache.collections = uriCache.collections || {};
        uriCache.collections[colName] = colObj;
    };

    self.getDatabase = function (uri, callback) {

        var cached = self._cache[uri];
        if (cached) { return callback(null, cached); }

        MongoClient.connect(uri, function(err, db) {
            if (err) { return callback(err); }
            callback(null, self._cache[uri] = db);
        });
    };

    self.getCollection = function (dbUri, collection, callback) {

        var cached = Object(Object(self._cache[dbUri]).collections)[collection];
        if (cached) { return callback(null, cached); }

        self.getDatabase(dbUri, function (err, db) {
            if (err) { return callback(err); }
            callback(null, self._cache[dbUri].collections[collection] = db.collection(collection), db);
        });
    };

    self.initCollection = function (options, callback) {

        var uri = options.uri
          , inputFile = options.inputFile
          , outputFile = options.outputFile
          , collection = options.collection
          , collectionInstance = new EventEmitter()
          ;

        self.getCollection(uri, collection, function (err, col, db) {
            if (err) { return callback(err); }

            // Attach collection and database fields
            collectionInstance.collection = col;
            collectionInstance.database = db;

            // Attach Mongo functions
            for (var key in col) {
                (function (key) {
                    var keyValue = col[key];

                    // Attach the new method
                    collectionInstance[key] = function () {

                        // Handle arguments
                        var args = Array.prototype.slice.call(arguments, 0);
                        args.sort();

                        // Get provided callback
                        var providedCallback = args[args.length - 1];
                        args.splice(args.length - 1, 1);

                        // Push push the real callback
                        args.push(function (err, data) {

                            var cSelf = this
                              , cArguments = arguments
                              , opCallback = function () {
                                    providedCallback.apply(this, cArguments);
                                }
                              ;

                            if (err) { return opCallback.call(cSelf, err); }

                            // Stringify the documents
                            col.find({}).toArray(function (err, docs) {
                                if (err) { return opCallback.call(cSelf, err); }
                                Fs.writeFile(options.outputFile, JSON.stringify(docs, null, 2), function (err) {
                                    if (err) { return opCallback.call(cSelf, err); }
                                    opCallback.apply(cSelf, cArguments);
                                });
                            });
                        });

                        col[key].apply(col, args);
                    }
                })(key);
            }

            if (options.autoInit === true) {
                try {
                    data = require(Path.resolve(options.inputFile))
                } catch (e) { data = null }
                if (data) {
                    collectionInstance.remove({}, {multi: true}, function (err, data) {
                        if (err) { return callback(err); }
                        collectionInstance.insert(data, callback);
                    });
                }
            } else {
                callback(null, col);
            }
        });

        return collectionInstance;
    };

    var callbackData = {err: [], data: []};
    for (var i = 0; i < options.collections.length; ++i) {
        self.initCollection(options.collections[i], function (err, data) {
            if (--i <= 0) {
                if (!callbackData.err.length) {
                    callbackData.err = null;
                }
                return callback(callbackData.err, callbackData.data);
            }
        });
    }

    return self;
};

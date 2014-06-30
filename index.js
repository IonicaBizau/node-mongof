// Dependencies
var Mongo = require("mongodb")
  , MongoClient = Mongo.MongoClient
  , EventEmitter = require("events").EventEmitter
  , Fs = require("fs")
  , Path = require("path")
  ;

/**
 * JsonDb
 * Creates a new instance of JsonDb.
 *
 * @name JsonDb
 * @function
 * @param {Object} options The options object of the constructor.
 * @return {EventEmitter} The instance of JsonDb object
 */
var JsonDb = module.exports = function (options) {

    // Force options to be an object and process data
    options = Object(options);
    options.collections = options.collections || [];
    options.ignoreSyncFor = options.ignoreSyncFor || [];
    options.ignoreCallbackFor = options.ignoreCallbackFor || ["find", "findOne"];

    // Initialize self
    var self = new EventEmitter();
    self._options = options;
    self._instance = this;
    self._cache = {};

    /**
     * addInCache
     * Cache database and collection
     *
     * @name addInCache
     * @function
     * @param {String} uri The Mongo database URI string
     * @param {Object} dbObj Database object
     * @param {String} colName Collection name (optional)
     * @param {Object} colObj Collection object (optional)
     */
    self.addInCache = function (uri, dbObj, colName, colObj) {

        var uriCache = self._cache[uri] = self._cache[uri] || {};
        uriCache.db = dbObj;

        if (!colName || !colObj) { return self; }

        uriCache.collections = uriCache.collections || {};
        uriCache.collections[colName] = colObj;
    };

    /**
     * getDatabase
     * Returns (via callback) a database object from cache or fetched via Mongo functions.
     *
     * @name getDatabase
     * @function
     * @param {String} uri The Mongo database URI string
     * @param {Function} callback The callback function
     */
    self.getDatabase = function (uri, callback) {

        var cached = self._cache[uri];
        if (cached) { return callback(null, cached); }

        MongoClient.connect(uri, function(err, db) {
            if (err) { return callback(err); }
            callback(null, self._cache[uri] = db);
        });
    };

    /**
     * getCollection
     * Returns (via callback) the collection object from cache
     *
     * @name getCollection
     * @function
     * @param {String} dbUri The Mongo database URI string
     * @param {String} collection Collection name
     * @param {Function} callback The callback function
     */
    self.getCollection = function (dbUri, collection, callback) {

        var cached = Object(Object(self._cache[dbUri]).collections)[collection];
        if (cached) { return callback(null, cached); }

        self.getDatabase(dbUri, function (err, db) {
            if (err) { return callback(err); }
            callback(null, self._cache[dbUri].collections[collection] = db.collection(collection), db);
        });
    };

    /**
     * initCollection
     * Inits the collection and returns the collection instance.
     *
     * @name initCollection
     * @function
     * @param {Object} options The options for initing the collection
     * @param {Function} callback The callback function
     * @return {EventEmitter} The instance of collection object.
     */
    self.initCollection = function (options, callback) {

        var uri = options.uri
          , inputFile = options.inputFile
          , outputFile = options.outputFile
          , collection = options.collection
          , collectionInstance = new EventEmitter()
          ;

        collectionInstance._options = options;

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

                        if (typeof providedCallback === "function") {
                            args.splice(args.length - 1, 1);
                        }

                        if (self._options.ignoreCallbackFor.indexOf(key) === -1) {
                            // Push push the real callback
                            args.push(function (err, data) {

                                var cSelf = this
                                  , cArguments = arguments
                                  , opCallback = function () {
                                        if (typeof providedCallback !== "function") { return; }
                                        providedCallback.apply(this, cArguments);
                                    }
                                  ;

                                // Ignore sync
                                if (self._options.ignoreSyncFor.indexOf(key) !== -1) {
                                    return opCallback.apply(cSelf, cArguments);
                                }

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
                        }

                        return col[key].apply(col, args);
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
                } else {
                    callback(null, col);
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

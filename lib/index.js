// Dependencies
var Mongo = require("mongodb")
  , MongoClient = Mongo.MongoClient
  , EventEmitter = require("events").EventEmitter
  , Fs = require("fs")
  , Path = require("path")
  ;

/**
 * MongoSyncFiles
 * Creates a new instance of MongoSyncFiles.
 *
 * @name MongoSyncFiles
 * @function
 * @param {Object} options An object containing the following properties:
 *
 *  - `collections` (Array): An array of objects with the needed fields for initing the collections that should be inited (default: `[]`).
 *  - `ignoreSyncFor` (Array): An array with Mongo collection method names for that sync should be diabled (default: `[]`).
 *  - `ignoreCallbackFor` (array): An array with Mongo collection method names for that callback should be diabled (default: `["find", "findOne"]`).
 *
 * @param {Function} callback The callback function. Called with `err`, `collections` and `data`. `collections` is an object like this:
 *
 *   ```js
 *   {
 *      "collectionName": <collectionObject>
 *   }
 *   ```
 *
 * `<collectionObject>` is an object containing all Mongo collection methods.
 *
 * @return {EventEmitter} The instance of MongoSyncFiles object.
 */
var MongoSyncFiles = module.exports = function (options, callback) {

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

    callback = callback || function () {};

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
     * @param {Object} options An object containing the following properties:
     *
     *  - `uri` (String): The MongoDB uri.
     *  - `inputFile` (String): The path to the input file.
     *  - `outputFile` (String): The path to the output file.
     *  - `outputFile` (String): The path to the output file.
     *  - `collection` (String): The collection that should be synced.
     *  - `outFields` (String): An object with fields that should be exported/ignored on stringify (default: `{_id: 0}`).
     *  - `autoInit` (Boolean): If `true`, the collection will be inited with input data.
     *
     * @param {Function} callback The callback function
     * @return {EventEmitter} The instance of collection object.
     */
    self.initCollection = function (options, callback) {

        var uri = options.uri
          , inputFile = options.inputFile
          , outputFile = options.outputFile
          , collection = options.collection
          , collectionInstance = new EventEmitter()
          , outFields = options.outFields || { _id: 0 }
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

                        if (self._options.ignoreCallbackFor.indexOf(key) === -1) {
                            // Get provided callback
                            var providedCallback = args[args.length - 1];
                            if (typeof providedCallback === "function") {
                                args.splice(args.length - 1, 1);
                            }

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
                                col.find({}, outFields).toArray(function (err, docs) {
                                    if (err) { return opCallback.call(cSelf, err); }
                                    Fs.writeFile(options.outputFile, JSON.stringify(docs, null, 2), function (err) {
                                        if (err) { return opCallback.call(cSelf, err); }
                                        opCallback.apply(cSelf, cArguments);
                                    });
                                });
                            });
                        }

                        return col[key].apply(col, args);
                    };
                })(key);
            }

            if (options.autoInit === true) {
                try {
                    data = require(Path.resolve(options.inputFile));
                } catch (e) { data = null; }
                (function (data) {
                    if (data && data.length) {
                        collectionInstance.remove({}, {multi: true}, function (err) {
                            if (err) { return callback(err); }
                            collectionInstance.insert(data, callback);
                        });
                    } else {
                        callback(null, col);
                    }
                })(data);
            } else {
                callback(null, col);
            }
        });

        return collectionInstance;
    };

    // Init the initial collections
    if (!options.collections.length) {
        callback(null, null);
        return self;
    }

    var callbackData = {err: [], data: [], dbs: {}};
    for (var i = 0; i < options.collections.length; ++i) {
        (function (cCol) {
            callbackData.dbs[cCol.collection] = self.initCollection(cCol, function (err, data) {
                if (err) {
                    callbackData.err.push(err);
                    delete callbackData.dbs[cCol.collection];
                } else {
                    callbackData.data.push(data);
                }
                if (!--i) {
                    if (!callbackData.err.length) {
                        callbackData.err = null;
                    }
                    return callback(callbackData.err, callbackData.dbs, callbackData.data);
                }
            });
        })(options.collections[i]);
    }

    return self;
};

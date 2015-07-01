// Dependencies
var Mongo = require("mongodb")
  , MongoClient = Mongo.MongoClient
  , EventEmitter = require("events").EventEmitter
  , Fs = require("fs")
  , Abs = require("abs")
  , Util = require("util")
  , Ul = require("ul")
  , SameTime = require("same-time")
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
 *  - `ignore_sync_for` (Array): An array with Mongo collection method names for that sync should be diabled (default: `[]`).
 *  - `ignore_callback_for` (array): An array with Mongo collection method names for that callback should be diabled (default: `["find", "findOne"]`).
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
Util.inherits(MongoSyncFiles, EventEmitter);
function MongoSyncFiles(options, callback) {
    var self = this;
    callback = callback || function () {};
    options = Ul.merge(options, {
        collections: []
      , ignore_sync_for: []
      , ignore_sync_for: ["find", "findOne"]
    });
    self.options = options;
    self.cache = {};

    // Init the initial collections
    if (!options.collections.length) {
        callback(null, null);
        return self;
    }

    self.dbs = {};
    SameTime(options.collections.map(function (cCol) {
        return function (cb) {
            self.dbs[cCol.collection] = self.initCollection(cCol, function (err, data) {
                if (err) {
                    delete self.dbs[cCol.collection];
                    cb(err);
                }
                cb(null, data);
            });
        }
    }), function (err, data) {
        if (err) { return callback(err); }
        callback(null, self.dbs, data);
    });
}

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
MongoSyncFiles.prototype.addInCache = function (uri, dbObj, colName, colObj) {

    var self = this
      , uriCache = self.cache[uri] = self.cache[uri] || {}
      ;

    uriCache.db = dbObj;

    if (!colName || !colObj) { return self; }

    uriCache.collections = uriCache.collections || {};
    uriCache.collections[colName] = colObj;

    return self;
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
MongoSyncFiles.prototype.getDatabase = function (uri, callback) {

    var self = this
      , cached = self.cache[uri]
      ;

    if (cached) { return callback(null, cached); }

    MongoClient.connect(uri, function(err, db) {
        if (err) { return callback(err); }
        callback(null, self.cache[uri] = db);
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
MongoSyncFiles.prototype.getCollection = function (dbUri, collection, callback) {

    var cached = Object(Object(self.cache[dbUri]).collections)[collection];
    if (cached) { return callback(null, cached); }

    self.getDatabase(dbUri, function (err, db) {
        if (err) { return callback(err); }
        callback(null, self.cache[dbUri].collections[collection] = db.collection(collection), db);
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
MongoSyncFiles.prototype.initCollection = function (options, callback) {

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

        function override(key) {
            var keyValue = col[key];

            // Attach the new method
            collectionInstance[key] = function () {

                // Handle arguments
                var args = Array.prototype.slice.call(arguments, 0);

                function run() {
                    return col[key].apply(col, args);
                }

                if (self._options.ignore_callback_for.indexOf(key) !== -1) { return run(); }

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
                    if (self._options.ignore_sync_for.indexOf(key) !== -1) {
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

                return run();
            };
        }

        Object.keys(col).forEach(override);

        if (options.autoInit === true) {
            try {
                data = require(Abs(options.inputFile));
            } catch (e) { data = null; }
            (function (data) {
                if (Array.isArray(data) && data.length) {
                    collectionInstance.remove({}, {
                        multi: true
                    }, function (err) {
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

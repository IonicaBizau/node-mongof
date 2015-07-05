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

// Cache
var _cache = {};

/**
 * Mongof
 * Creates a new instance of Mongof.
 *
 * @name Mongof
 * @function
 * @param {Object} options An object containing the following properties:
 *
 *  - `collections` (Array): An array of objects with the needed fields for initing the collections that should be inited (default: `[]`).
 *  - `ignore_sync_for` (Array): An array with Mongo collection method names for that sync should be diabled (default: `[]`).
 *  - `ignore_callback_for` (array): An array with Mongo collection method names for that callback should be diabled (default: `["find", "findOne"]`).
 *  - `uri` (String): The databse uri.
 *  - `db` (String): The databse name. If provided, the `uri` field will be overriden, with the `localhost:27017` Mongo databse uri.
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
 * @return {EventEmitter} The instance of Mongof object.
 */
Util.inherits(Mongof, EventEmitter);
function Mongof(options, callback) {
    var self = this;
    callback = callback || function () {};
    options = Ul.merge(options, {
        collections: []
      , uri: null
      , ignore_sync_for: []
      , ignore_callback_for: ["find", "findOne"]
    });

    if (options.db) {
        options.uri = "mongodb://localhost:27017/" + options.db;
        delete options.db;
    }

    self.options = options;

    // Init the initial collections
    if (!options.collections.length) {
        callback(null, null, null);
        return self;
    }

    self.cols = {};
    SameTime(options.collections.map(function (cCol) {
        return function (cb) {
            self.cols[cCol.collection] = self.initCollection(cCol, function (err, data) {
                if (err) {
                    delete self.cols[cCol.collection];
                    cb(err);
                }
                cb(null, data);
            });
        };
    }), function (err, data) {
        if (err) { return callback(err); }
        callback(null, self.cols, data);
    });
}

/**
 * addInCache
 * Cache database and collection in the internal cache.
 *
 * @name addInCache
 * @function
 * @param {String} uri The Mongo database URI string.
 * @param {Database} dbObj The database object.
 * @param {String} colName The collection name (optional).
 * @param {Collection} colObj The collection object (optional).
 * @return {Mongof} The `Mongof` instance.
 */
Mongof.prototype.addInCache = function (uri, dbObj, colName, colObj) {

    var self = this
      , uriCache = _cache[uri] = Object(_cache[uri]);
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
 * @return {Mongof} The `Mongof` instance.
 */
Mongof.prototype.getDatabase = function (uri, callback) {

    var self = this
      , cached = _cache[uri]
      ;

    if (cached) { return callback(null, cached.db); }

    MongoClient.connect(uri, function(err, db) {
        if (err) { return callback(err); }
        self.addInCache(uri, db);
        callback(null, db);
    });

    return self;
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
 * @return {Mongof} The `Mongof` instance.
 */
Mongof.prototype.getCollection = function (dbUri, collection, callback) {

    var self = this
      , col = Object(Object(_cache[dbUri]).collections)[collection]
      ;

    if (col) { return callback(null, col); }

    self.getDatabase(dbUri, function (err, db) {
        if (err) { return callback(err); }
        col = db.collection(collection);
        self.addInCache(dbUri, db, collection, col);
        callback(null, col, db);
    });

    return self;
};

/**
 * initCollection
 * Inits the collection and returns the collection instance.
 *
 * @name initCollection
 * @function
 * @param {Object} options An object containing the following properties:
 *
 *  - `inputFile` (String): The path to the input file.
 *  - `outputFile` (String): The path to the output file.
 *  - `collection` (String): The collection that should be synced.
 *  - `outFields` (String): An object with fields that should be exported/ignored on stringify (default: `{_id: 0}`).
 *  - `autoInit` (Boolean): If `true`, the collection will be inited with input data.
 *
 * @param {Function} callback The callback function
 * @return {EventEmitter} The collection object.
 */
Mongof.prototype.initCollection = function (options, callback) {

    var self = this
      , uri = self.options.uri
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
            if (typeof keyValue !== "function") { return; }

            // Attach the new method
            collectionInstance[key] = function () {

                // Handle arguments
                var args = Array.prototype.slice.call(arguments, 0);

                function run() {
                    return col[key].apply(col, args);
                }

                if (self.options.ignore_callback_for.indexOf(key) !== -1) { return run(); }

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
                    if (self.options.ignore_sync_for.indexOf(key) !== -1) {
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

        Object.keys(Object.getPrototypeOf(col)).forEach(override);

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

module.exports = Mongof;

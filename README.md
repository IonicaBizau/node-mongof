Mongo Sync Files
================
Sync MongoDB collections with JSON files.

# Installation
Run the following commands to download and install the module:

```sh
$ git clone git@github.com:IonicaBizau/node-mongo-sync.git mongo-sync
$ cd mongo-sync
$ npm install
```

# Example

```js
// Dependencies
var MongoSyncFiles = require("mongo-sync-files");

// Create database instance
new MongoSyncFiles({
    collections: [{
        inputFile: __dirname + "/docs-in.json"
      , outputFile: __dirname + "/docs-out.json"
      , uri: "mongodb://localhost:27017/test"
      , collection: "myCol"
      , autoInit: true
    }]
}, function (err, collections) {
    if (err) { throw err; }

    var MyAwesomeCollection = collections.myCol;

    // Run a Mongo request
    MyAwesomeCollection.find({}).toArray(function (err, docs) {
        if (err) { throw err; }

        // Output
        console.log("Documents: ", docs);

        // Insert
        MyAwesomeCollection.insert([...], function (err, docs) {
            if (err) { throw err; }

            console.log("Successfully inserted a new document: ", docs);
            console.log("Check out the content of the following file: ", MyAwesomeCollection._options.outputFile);

            // Close database
            MyAwesomeCollection.database.close();
        });
    });
});
```

# Documentation

## `MongoSyncFiles(options, callback)`
Creates a new instance of MongoSyncFiles.

### Params
- **Object** `options`: An object containing the following properties:
 - `collections` (Array): An array of objects with the needed fields for initing the collections that should be inited (default: `[]`).
 - `ignoreSyncFor` (Array): An array with Mongo collection method names for that sync should be diabled (default: `[]`).
 - `ignoreCallbackFor` (array): An array with Mongo collection method names for that callback should be diabled (default: `["find", "findOne"]`).

- **Function** `callback`: The callback function. Called with `err`, `collections` and `data`. `collections` is an object like this:
  ```js
  {
     "collectionName": <collectionObject>
  }
  ```

`<collectionObject>` is an object containing all Mongo collection methods.

### Return
- **EventEmitter** The instance of MongoSyncFiles object.

## `addInCache(uri, dbObj, colName, colObj)`
Cache database and collection

### Params
- **String** `uri`: The Mongo database URI string
- **Object** `dbObj`: Database object
- **String** `colName`: Collection name (optional)
- **Object** `colObj`: Collection object (optional)

## `getDatabase(uri, callback)`
Returns (via callback) a database object from cache or fetched via Mongo functions.

### Params
- **String** `uri`: The Mongo database URI string
- **Function** `callback`: The callback function

## `getCollection(dbUri, collection, callback)`
Returns (via callback) the collection object from cache

### Params
- **String** `dbUri`: The Mongo database URI string
- **String** `collection`: Collection name
- **Function** `callback`: The callback function

## `initCollection(options, callback)`
Inits the collection and returns the collection instance.

### Params
- **Object** `options`: An object containing the following properties:
 - `uri` (String): The MongoDB uri.
 - `inputFile` (String): The path to the input file.
 - `outputFile` (String): The path to the output file.
 - `outputFile` (String): The path to the output file.
 - `collection` (String): The collection that should be synced.
 - `outFields` (String): An object with fields that should be exported/ignored on stringify (default: `{_id: 0}`).
 - `autoInit` (Boolean): If `true`, the collection will be inited with input data.

- **Function** `callback`: The callback function

### Return
- **EventEmitter** The instance of collection object.

# Changelog
## `1.0.0`
 - Initial stable release.
 - Fixed `collections` array handling.
 - Added `outFields` feature.

## `v0.1.3`
 - Introduced an anonymous function call

## `v0.1.2`
 - Remove provided callback from args if callback is not ignored

## `v0.1.1`
 - Corrected the condition for ignoring callback

## `v0.1.0`
 - Initial release

# How to contribute
1. File an issue in the repository, using the bug tracker, describing the
   contribution you'd like to make. This will help us to get you started on the
   right foot.
2. Fork the project in your account and create a new branch:
   `your-great-feature`.
3. Commit your changes in that branch.
4. Open a pull request, and reference the initial issue in the pull request
   message.

# License
See the [LICENSE](./LICENSE) file.

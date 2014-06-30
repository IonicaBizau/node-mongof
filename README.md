Mongo Sync
==========
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
var JsonDb = require("../index")
  , Faker = require("faker")
  ;

// Create database instance
var MyDatabase = new JsonDb();

function generateFakeDataArray() {
    var docs = [];
    for (var i = 0; i < 30; ++i) {
        docs.push({
            name: Faker.Name.findName()
          , email: Faker.Internet.email()
          , age: Faker.Helpers.randomNumber(90)
        });
    }
    return docs;
}

// Create collection instance
var MyAwesomeCollection = MyDatabase.initCollection({
    inputFile: __dirname + "/docs-in.json"
  , outputFile: __dirname + "/docs-out.json"
  , uri: "mongodb://localhost:27017/test"
  , collection: "myCol"
  , autoInit: true
}, function (err) {

    // Handle error
    if (err) { throw err; }

    // Run a Mongo request
    MyAwesomeCollection.find({}).toArray(function (err, docs) {

        // Handle error
        if (err) { throw err; }

        // Output
        console.log("Documents: ", docs);

        // Insert
        MyAwesomeCollection.insert(generateFakeDataArray(), function (err, docs) {

            // Handle error
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

## `new JsonDb(options)`
Creates a new instance of JsonDb.

### Params:
* **Object** *options* The options object of the constructor.

### Return:
* **EventEmitter** The instance of JsonDb object

## `addInCache(uri, dbObj, colName, colObj)`
Cache database and collection

### Params:
* **String** *uri* The Mongo database URI string
* **Object** *dbObj* Database object
* **String** *colName* Collection name (optional)
* **Object** *colObj* Collection object (optional)

## `getDatabase(uri, callback)`
Returns (via callback) a database object from cache or fetched via Mongo functions.

### Params:
* **String** *uri* The Mongo database URI string
* **Function** *callback* The callback function

## `getCollection(dbUri, collection, callback)`
Returns (via callback) the collection object from cache

### Params:
* **String** *dbUri* The Mongo database URI string
* **String** *collection* Collection name
* **Function** *callback* The callback function

## `initCollection(options, callback)`
Inits the collection and returns the collection instance.

### Params:
* **Object** *options* The options for initing the collection
* **Function** *callback* The callback function

### Return:
* **EventEmitter** The instance of collection object.

# Changelog
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

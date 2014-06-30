// Dependencies
var JsonDb = require("../index");

// Create database instance
var MyDatabase = new JsonDb();

// Create collection instance
var MyAwesomeCollection = MyDatabase.initCollection({
    inputFile: "./docs-in.json"
  , outputFile: "./docs-out.json"
  , uri: "mongodb://localhost:27017/test"
  , collection: "myCol"
  , autoinit: true
}, function (err) {

    // Handle error
    if (err) { throw err; }

    // Run a Mongo request
    MyAwesomeCollection.find({}).toArray(function (err, docs) {

        // Handle error
        if (err) { throw err; }

        // Output
        console.log(docs);

        // Close database
        MyAwesomeCollection.database.close();
    });
});

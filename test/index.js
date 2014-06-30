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
        MyAwesomeCollection.insert({name: "Ionică Bizău", age: 18}, function (err, docs) {

            // Handle error
            if (err) { throw err; }

            console.log("Successfully inserted a new document: ", docs);
            console.log("Check out the content of the following file: ", MyAwesomeCollection._options.outputFile);

            // Close database
            MyAwesomeCollection.database.close();
        });
    });
});

// Dependencies
var JsonDb = require("../index")
  , Path = require("path")
  , Faker = require("faker")
  ;

// Create database instance
var MyDatabase = new JsonDb();

// Create collection instance
var MyAwesomeCollection = MyDatabase.initCollection({
    inputFile: Path.resolve("./docs-in.json")
  , outputFile: Path.resolve("./docs-out.json")
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
        MyAwesomeCollection.insert({
            name: Faker.Name.findName()
          , email: Faker.Internet.email()
          , age: Faker.Helpers.randomNumber()
        }, function (err, docs) {

            // Handle error
            if (err) { throw err; }

            console.log("Successfully inserted a new document: ", docs);
            console.log("Check out the content of the following file: ", MyAwesomeCollection._options.outputFile);

            // Close database
            MyAwesomeCollection.database.close();
        });
    });
});

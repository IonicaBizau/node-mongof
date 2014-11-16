// Dependencies
var MongoSyncFiles = require("../index")
  , Faker = require("faker")
  ;

// Create database instance
var MyDatabase = new MongoSyncFiles();

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

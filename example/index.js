// Dependencies
var Mongof = require("../lib")
  , Faker = require("faker")
  ;

/**
 * generateFakeDataArray
 * Generates fake data for inserting it in the MongoDB database.
 *
 * @name generateFakeDataArray
 * @function
 * @return {Array} An array with fake data.
 */
function generateFakeDataArray() {
    var docs = [];
    for (var i = 0; i < 30; ++i) {
        docs.push({
            name: Faker.name.findName()
          , email: Faker.internet.email()
          , age: Faker.helpers.randomNumber(90)
        });
    }
    return docs;
}

// Create database instance
var MyDatabase = new Mongof({
    uri: "mongodb://localhost:27017/test"
  , collections: [{
        inputFile: __dirname + "/docs-in.json"
      , outputFile: __dirname + "/docs-out.json"
      , collection: "myCol"
      , autoInit: true
    }]
}, function (err, collections) {

    // Handle error
    if (err) { throw err; }

    var MyAwesomeCollection = collections.myCol;

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
            debugger
            console.log("Check out the content of the following file: ", MyAwesomeCollection._options.outputFile);

            // Close database
            MyAwesomeCollection.database.close();
        });
    });
});

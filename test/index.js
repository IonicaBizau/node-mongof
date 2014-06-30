var JsonDb = require("../index");

var MyDatabase = new JsonDb();
var MyAwesomeCollection = MyDatabase.initCollection({
    inputFile: "./docs-in.json"
  , outputFile: "./docs-out.json"
  , uri: "mongodb://localhost:27017/integration_test"
  , collection: "myCol"
  , autoinit: true
}, function (err) {
    MyAwesomeCollection.find({}).toArray(function (err, docs) {
        console.log(err || docs);
        MyAwesomeCollection.database.close();
    });
});

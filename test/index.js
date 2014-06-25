var JsonDb = require("../index");

var myDb = new JsonDb({
    collection: "articles"
}, function (err, db, col) {
    console.log(err || "Success");
    myDb.insert({name: "ionica"});
});

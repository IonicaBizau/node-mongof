## Documentation

You can see below the API reference of this module.

### `Mongof(options, callback)`
Creates a new instance of Mongof.

#### Params

- **Object** `options`: An object containing the following properties:
 - `collections` (Array): An array of objects with the needed fields for initing the collections that should be inited (default: `[]`).
 - `ignore_sync_for` (Array): An array with Mongo collection method names for that sync should be diabled (default: `[]`).
 - `ignore_callback_for` (array): An array with Mongo collection method names for that callback should be diabled (default: `["find", "findOne"]`).
 - `uri` (String): The databse uri.
 - `db` (String): The databse name. If provided, the `uri` field will be overriden, with the `localhost:27017` Mongo databse uri.
- **Function** `callback`: The callback function. Called with `err`, `collections` and `data`. `collections` is an object like this:
  ```js
  {
     "collectionName": <collectionObject>
  }
  ```

`<collectionObject>` is an object containing all Mongo collection methods.

#### Return
- **EventEmitter** The instance of Mongof object.

### `addInCache(uri, dbObj, colName, colObj)`
Cache database and collection in the internal cache.

#### Params

- **String** `uri`: The Mongo database URI string.
- **Database** `dbObj`: The database object.
- **String** `colName`: The collection name (optional).
- **Collection** `colObj`: The collection object (optional).

#### Return
- **Mongof** The `Mongof` instance.

### `getDatabase(uri, callback)`
Returns (via callback) a database object from cache or fetched via Mongo functions.

#### Params

- **String** `uri`: The Mongo database URI string
- **Function** `callback`: The callback function

#### Return
- **Mongof** The `Mongof` instance.

### `getCollection(dbUri, collection, callback)`
Returns (via callback) the collection object from cache

#### Params

- **String** `dbUri`: The Mongo database URI string
- **String** `collection`: Collection name
- **Function** `callback`: The callback function

#### Return
- **Mongof** The `Mongof` instance.

### `initCollection(options, callback)`
Inits the collection and returns the collection instance.

#### Params

- **Object** `options`: An object containing the following properties:
 - `inputFile` (String): The path to the input file.
 - `outputFile` (String): The path to the output file.
 - `collection` (String): The collection that should be synced.
 - `outFields` (String): An object with fields that should be exported/ignored on stringify (default: `{_id: 0}`).
 - `autoInit` (Boolean): If `true`, the collection will be inited with input data.
- **Function** `callback`: The callback function

#### Return
- **EventEmitter** The collection object.


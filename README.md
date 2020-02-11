# Simple-Index
An indexedDB wrapper for simplified client side object storage.

simple-index handles the messy verbiage of updating database versions and provides straight forward functions needed to interact with the database(s).

Once installed, simple-index can be used client side without any configuration.

Example:
```javascript
import simpleIndex from "simple-index";

const obj_to_store = {
	title: "foo",
	author: "bar",
	key: "book: foo" // this attribute is necessary if not using a config file
}

simpleIndex.put(obj_to_store, (err, success) => {
	if (err) {
		console.error(err);
	} else if (success) {
		alert("Book saved!");
	} else {
		alert("Unable to save book.");
	};
});


simpleIndex.get("book: foo", (err, obj) => {
	if (err) {
		console.error(err);
	} else {
		// do something with obj;
	};
});
```

Simple-index handles all the excessive verbiage of upgrading database versions and provides simple functions to store, access, update and remove data from the indexedDB. It utilizes an optional config file for describing and customizing database(s) structures.


### Functions:

#### put
*Syntax:*
```
put(object, [objectStoreName, databaseName,] callback(err, success))
```
*Parameters:*
`object` - object to be put
`objectStoreName` - the name of the object store to use
`databaseName` - the name of the database in question
`callback` - a callback function which expects an err or success

There are three options for using the put function. Which method to use depends on the config file and the object to be stored.
If using the included simple database, no objectStore_name or database_name is required. The object must have a property with the key  ‘key’, and a unique value that can be used to retrieve the object. For example:
```javascript
const object_to_store = {
	key: "favorites", // this property is necessary
	color: "teal",
	pets: "chihuahua",
	flower: "daisy"
};

simpleIndex.put(object_to_store, (err, success) => {
	if (err) {
		console.error(err);
	};
	if (success) {
		alert("Saved your favorites!");
	};
});
```

Using a database from the config file requires the objectStore name and database name arguments to be supplied. They can either be included as arguments in the function call:
```javascript
const object_to_store = {
	key: "favorites",
	color: "teal",
	pets: "chihuahua",
	flower: "daisy"
};

const objectStore = "preferences";

const database = "user";

simpleIndex.put(object_to_store, objectStore, database, (err, success) => {
	if (err) {
		console.error(err);
	};
	if (success) {
		alert("Saved your favorites!");
	};
});
```

Or as properties of the object to be saved:
```javascript
const object_to_store = {
	key: "favorites",
	color: "teal",
	pets: "chihuahua",
	flower: "daisy"
	objectStore: "preferences"
	database: "user"
};

simpleIndex.put(object_to_store, (err, success) => {
	if (err) {
		console.error(err);
	};
	if (success) {
		alert("Saved your favorites!");
	};
});
```

Remember to include a key property, as described in the config file, as a property of the object to be stored.

#### get
```
get(key or key object, objectStore_name(optional), database_name(optional), callback(err, data))
```
get works similarly to put. There are three options of using it. As with put it depends on the config file and the object to be retrieved.
If using the included simple database, no objectStore_name or database_name is required. The key argument is required. For example:
```javascript
const key = "favorites";

simpleIndex.get(key, (err, data) => {
	if (err) {
		console.error(err);
	};
	if (data) {
		//do something with data
	};
});
```

Using a database from the config file requires the objectStore name and database name arguments to be supplied. They can either be included as arguments in the function call:
```javascript
const key = "favorites";

const objectStore = "preferences";

const database = "user";

simpleIndex.get(key, objectStore, database, (err, data) => {
	if (err) {
		console.error(err);
	};
	if (data) {
		// do something with data
	};
});
```

Or as properties of a key object to be retrieved:
```javascript
const key = {
	key: "favorites",
	objectStore: "preferences"
	database: "user"
};

simpleIndex.get(key, (err, data) => {
	if (err) {
		console.error(err);
	};
	if (data) {
		// do something with data
	};
});
```
```
remove(key or key object, objectStore_name(optional), database_name(optional), callback(err, success))
```
Much like the get function, remove can be used with three options. Rather than returning data however, success will either be true if the data was succefully removed from the database or false if it wasn’t able to be removed (perhaps because it didn’t exist).  


### Creating the simple-index.config.js file.

For developers who need a more robust database with many objectStores, or even multiple databases, includ a config file in the root of the app and describe the desired database schema thusly:

```javascript
module.exports = {
	schema: {
		"database_name": {
			"objectStore_name": {
				keyPath: "key_name"
			},
		},
	},
}
```

The simple-index package will automatically search for and use the config file to construct the database(s) in the indexedDB.


Other options that can be included in the config file:
```
mode: "either development or production",
```
"development" mode will print errors to the console. "production" silences those errors. simple-index will generally work aroung errors, however, it's helpful to understand what's happening in the package to create an app that works as intended. Defaults to "production".
```
simple-on: true or false,
```
If true, simple-index will create the afformentioned simple database even if another database is described in the config. if false, the simple database will not be created and hence unavailable. Defaults to true.


A simple-index.config.js file could be written like this:
```javascript
module.exports = {
	schema: {
		"books": {
			"fiction": {
				keyPath: "title"
			},
			"non-fiction": {
				keyPath: "title"
			},
		},
		"food": {
			"cheese": {
				keyPath: "type"
			},
			"crackers": {
				keyPath: "flavor"
		  },
		},
	},
	mode: "development",
	simple-on: false,
};
```

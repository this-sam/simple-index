"use strict";


let config;

try{
	config = require('simple-index.config');	
}
catch {
	config = require('../../../simple-index.config');
}
catch {
	config = require('./simple-index.config');
}
catch {
	error("simple-index.config.js not found (ignore this error if not using a config file). If using a config file, try placing it in the root folder of the app. If this error still occurs, try placing it in the root folder of the simple-index module with the index.js file. If using webpack, include a resolve alias in the webpack.config.js file.");
}

const simpleDB = {
	schema: {
		'simpleDB' : {
			'objStore' : {
				key : 'key'
			},
		}
	},
	mode : 'production',
	simple_on : true
};

if (!config) {
	config = simpleDB;
} else {
	config.schema
};

let mode;
if (config.mode) {
 	mode = config.mode;
} else {
	mode = 'production';
};

let simple_on = true;
if (config.simple_on === false)  {
	simple_on = false
}


function error(message) {
	if (mode === "development") {
		console.error(message);
	};
};


function databaseOnError(event) {
	error(event);
	error('simple-indexedDB database error, indexedDB error: ' + event.target.errorCode);
};


function getCache(db_name, callback) {
	
	const cache = window.indexedDB.open('current_schema', 1);
		
	cache.onerror = function(event) {
		databaseOnError(event);
	};

	cache.onupgradeneeded = function(event) {
		const cache_db = event.target.result;
		
		cache_db.onerror = function(event) {
			databaseOnError(event);
		}; 
		
		if (event.oldVersion < 1) {
			const objectStore = cache_db.createObjectStore("cache" , { keyPath: "name"});
			
			objectStore.transaction.oncomplete = function(event) {
				const cacheObjectStore = db.transaction("cache", "readwrite").objectStore("cache");
				for (let db_obj_name in config.schema) {
					let new_db_obj_cache = {
						version: 1,
						name: db_obj_name,
						current: config.schema[db_obj_name]
					};
		      cacheObjectStore.add(new_db_obj_cache);					
				};
		  };
		};
	};
	
	cache.onsuccess = function(event) {
		const cache_db = event.target.result;
		
		cache_db.onerror = function(event) {
			databaseOnError(event);
		};
		
		const cache_transaction = cache_db.transaction("cache", "readwrite");
		
		cache_transaction.onerror = function(event) {
			databaseOnError(event);
		};
		
		const cache_objectStore = cache_transaction.objectStore("cache");
		
		cache_objectStore.onerror = function(event) {
			databaseOnError(event);
		};
	
		const cache_objStore_request = cache_objectStore.get(db_name);
	
		cache_objStore_request.onerror = function(event) {
			databaseOnError(event);
		};
	
		cache_objStore_request.onsuccess = function(event) {
			let cached_db_obj = request.result;
			if (!cached_db_obj) {
				cached_db_obj = {
					version: 1,
					name: db_name,
					current: config.schema[db_name]
				};
				cache_objectStore.put(cached_db_obj);
				window.indexedDB.deleteDatabase(db_name);
			} else if (cached_db_obj.current != config.schema[db_name]) {
				cached_db_obj.version += 1;
				let remove = [];
				for (let objstore in cached_db_obj.current) {
					if (!objstore in config.schema[db_name]) {
						remove.push(objstore);
					};
				};
				let create = [];
				for (let objstore in config.schema[db_name]) {
					if (!objstore in cached_db_obj.current) {
						create.push(objstore);
					};
				};
				cached_db_obj.current = config.schema[db_name];
				cache_objectStore.put(cached_db_obj);
				cached_db_obj.remove = remove;
				cached_db_obj.create = create;
			};
			callback(cached_db_obj);
		};
	};
};


function openDatabase(callback) {
			
	const db_name = config.schema.name;
	const request = window.indexedDB.open(db_name, config.schema.version);
	
	request.onerror = function(event) {
		databaseOnError(event);
	};

 	request.onupgradeneeded = function(event) {
		var db = event.target.result;

		db.onerror = function(event) {
			databaseOnError(event);
		};

		if (event.oldVersion < config.schema.version) {
			for (let objstore in config.schema.remove) {
				db.deleteObjectStore(objstore);
			}; 
			for (let objStore in config.schema.create) {
				let objectStore = db.createObjectStore(objStore, { keyPath: config.schema.current[objStore].key});
				if (config.schema.current[objStore].indexes)
				for (let objStore_index in config.schema.current[objStore].indexes)
					objectStore.createIndex(objStore_index, objStore_index, {unique: config.schema.current[objStore].indexes[objStore_index]})
			};
		};
 	};

	request.onsuccess = function(event) {
		var db = event.target.result;
		console.log('rdb');
		db.onerror = function(event) {
			databaseOnError(event);
		};
		callback(db);
 	};
};


function openTransaction(db, objstore_name, callback) {
	const transaction = db.transaction([objstore_name], "readwrite");
	console.log('ot');
	transaction.onerror = function(event) {
		databaseOnError(event)
	} 

	callback(transaction);
};


function openObjectStore(transaction, objstore_name, callback) {
	const objectStore = transaction.objectStore(objstore_name);
	console.log('os');
	objectStore.onerror = function(event) {
		databaseOnError(event)
	} 

	callback(transaction.objectStore(objstore));
};


function openDBRequest(objstore, db_request, arg, callback) {
	try {
		console.log(objstore);
		const request = objstore[db_request](arg);

		request.onerror = function(event) {
			error(db_request + " could not be executed with args: " + arg);
			callback(null, null);
		};

		request.onsuccess = function(event) {
			callback(null, request.result);
		};

	}
	catch {
		error("No such request: " + db_request);
		callback(null, null);
	};
}; 


function beginTransaction(arg, objstore_name, db_request, callback) {
	console.log('bt');
	openDatabase((db) => {
		openTransaction(db, objstore_name, (transaction) => {
			openObjectStore(transaction, objstore_name, (objstore) => {
				openDBRequest(objstore, db_request, arg, (err, response) => {
					callback(err, response);
				});
			});
	 	});
	});
};
	

function makeRequest(arg, objstore_name, db_name, db_request, callback) {
	getCache(db_name, (cached_db) => {
		console.log(cached_db);
		beginTransaction(arg, objstore_name, cached_db, db_request, (err, response) => {
			callback(err, response)
		});
	});
};
	

function commitObject(data, objstore_name, db_name, callback) {
	console.log('obj');
	makeRequest(data, objstore_name, db_name, 'put', (err, response) => {
		callback(err, response);
	});
};


function getObject(key, objstore_name, db_name, callback){
	makeRequest(key, objstore_name, db_name, 'get', (err, response) => {
		callback(response);
	});
};


function getObjectStore(objstore_name, db_name, callback) {
	makeRequest(null, objstore_name, db_name, 'getAll', (err, response) => {
		callback(response);
	});
};


function removeObject(key, objstore_name, db_name, callback) {
	makeRequest(key, objstore_name, db_name, "delete", (err, success) => {
		callback(success)
	})
}


/* consider function rewrite*/
exports.get = function(key, objectStoreName, dBName, callback) {
	getObject(key, objectStoreName, dBName, (err, object) => {
		callback(object);
	});
};
		

/* this function can return hugh quantitiy of data, offer cursor function */
exports.getObjectStore = function(objstore_name, db_name, callback) {
	getObjectStore(objstore_name, objstore_name, db_name, (err, object) => {
		callback(object);
	});
};
		
/*put expects first arg to be array of data or single data, a callback, and an optional objectstore and dbname */
exports.put = const put = function() {
	let objectStoreName, dBName, callback, obj = arguments[0];
	if (arguments.length == 4) {
		objectStoreName = arguments[1];
		dBName = arguments[2];
		callback = arguments[3];
	} else if (obj.objectstore) {
		objectStoreName = obj.objectstore;
		dBName = obj.dbname;		
		callback = arguments[1];
	} else {
		objectStoreName = 'objStore';
		dBName = 'simpleDB';
		callback = arguments[1];
	}
	if (typeof obj === 'array') {
		let success;
		for (let to_store of obj) {
			commitObject(to_store, objectStoreName, dBName, (err, success) => {
				if (err) {
					callback(err, success);
				}
			})	
		}
		callback(null, success);
	} else {
		commitObject(obj, objectStoreName, dBName, (err, success) => {
			arguments[1](err, success);
	 	}		
	}
};


exports.remove = function(key, objstore_name, db_name, callback) {
	removeObject(key, objstore_name, db_name, (err, success) => {
		callback(err, success);
	});
};


exports.delDatabase = function(name) {
	try {
		window.indexedDB.delete(name);		
	}
	catch {
		error("No database with name: " + name);
	}
};


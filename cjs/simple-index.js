"use strict";


console.log(process.cwd());

const mode = "development";


function error(message) {
	if (mode === "development") {
		console.error(message);
	};
};


function databaseOnError(event) {
	error(event);
	error('IndexedDB database error: ' + event.target.errorCode);
};


function getCache(db_name, db_obj, callback) {
	
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
				for (let db_obj_name in db_obj) {
					let new_db_obj_cache = {
						version: 1,
						name: db_name,
						current: db_obj[db_obj_name]
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
					current: db_obj[db_name]
				};
				cache_objectStore.put(cached_db_obj);
				window.indexedDB.deleteDatabase(db_name);
			} else if (cached_db_obj.current != db_obj[db_name]) {
				cached_db_obj.version += 1;
				let remove = [];
				for (let objstore in cached_db_obj.current) {
					if (!objstore in db_obj[db_name]) {
						remove.push(objstore);
					};
				};
				let create = [];
				for (let objstore in db_obj[db_name]) {
					if (!objstore in cached_db_obj.current) {
						create.push(objstore);
					};
				};
				cached_db_obj.current = db_obj[db_name];
				cache_objectStore.put(cached_db_obj);
				cached_db_obj.remove = remove;
				cached_db_obj.create = create;
			};
			callback(cached_db_obj);
		};
	};
};



function openDatabase(db_obj, callback) {
			
	const db_name = db_obj.name;
	const request = window.indexedDB.open(db_name, db_obj.version);
	
	request.onerror = function(event) {
		databaseOnError(event);
	};

 	request.onupgradeneeded = function(event) {
		var db = event.target.result;

		db.onerror = function(event) {
			databaseOnError(event);
		};

		if (event.oldVersion < db_obj.version) {
			for (let objstore in db_obj.remove) {
				db.deleteObjectStore(objstore);
			}; 
			for (let objStore in db_obj.create) {
				let objectStore = db.createObjectStore(objStore, { keyPath: db_obj.current[objStore].key});
				if (db_obj.current[objStore].indexes)
				for (let objStore_index in db_obj.current[objStore].indexes)
					objectStore.createIndex(objStore_index, objStore_index, {unique: db_obj.current[objStore].indexes[objStore_index]})
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


function beginTransaction(arg, objstore_name, db_obj, db_request, callback) {
	console.log('bt');
	openDatabase(db_obj, (db) => {
		openTransaction(db, objstore_name, (transaction) => {
			openObjectStore(transaction, objstore_name, (objstore) => {
				openDBRequest(objstore, db_request, arg, (err, response) => {
					callback(err, response);
				});
			});
	 	});
	});
};
	

function makeRequest(arg, objstore_name, db_name, db_request, db_obj, callback) {
	getCache(db_name, db_obj, (cached_db) => {
		console.log(cached_db);
		beginTransaction(arg, objstore_name, cached_db, db_request, (err, response) => {
			callback(err, response)
		});
	});
};
	

function commitObject(data, objstore_name, db_name, db_obj, callback) {
	console.log('obj');
	makeRequest(data, objstore_name, db_name, 'put', db_obj, (err, response) => {
		callback(err, response);
	});
};


function commitMultObject(data_array, objstore_name, db_name, db_obj, callback) {
	let err_cache = false;
	for (let data in data_array) {
		commitData(data, objstore_name, db_name, db_obj, (err, response) => {
			if (err) {
				err_cache = true;
				callback(err, false);
			};
		});
	};
	if(!err_cache) {
		callback(null, true);
	};
};


function getObject(key, objstore_name, db_name, db_obj, callback){
	makeRequest(key, objstore_name, db_name, db_obj, 'get', (err, response) => {
		callback(response);
	});
};


function getObjectStore(objstore_name, db_name, db_obj, callback) {
	makeRequest(null, objstore_name, db_name, db_obj, 'getAll', (err, response) => {
		callback(response);
	});
};


function removeObject(key, objstore_name, db_name, db_obj, callback) {
	makeRequest(key, objstore_name, db_name, db_obj, "delete", (err, success) => {
		callback(success)
	})
}



exports.get = function(key, objstore_name, db_name, db_obj, callback) {
	getObject(key, objstore_name, db_name, db_obj, (err, object) => {
		callback(object);
	});
};
		

exports.getAll = function(objstore_name, db_name, db_obj, callback) {
	getObjectStore(objstore_name, objstore_name, db_name, db_obj, (err, object) => {
		callback(object);
	});
};
		

exports.put = function(object, objstore_name, db_name, db_obj, callback) {
	commitObject(object, objstore_name, db_name, db_obj, (err, success) => {
		callback(success);
	});			
};


exports.putMult = function(array, objstore_name, db_name, db_obj, callback) {
	commitMultipleObjects(array, objstore_name, db_name, db_obj, (err, success) => {
		callback(success);
	});			
};


exports.remove = function(key, objstore_name, db_name, db_obj, callback) {
	removeObject(key, objstore_name, db_name, db_obj, (err, success) => {
		callback(success);
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

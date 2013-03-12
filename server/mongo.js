/*******************************************************************************
 * @license
 * Copyright (c) 2013 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *   Kris De Volder
 ******************************************************************************/

//
// Provides some convenience api to access a mongodb database.
//
// The database is automatically configure to work on a local
// testing mongodb server or on a database provided by
// cloudfoundry as a service.

var mongodb = require('mongodb');
var when = require('when');
var whenFunction = require('when/node/function');
var methodCaller = require('./utils/promises').methodCaller;
//var createCallback = whenFunction.createCallback;

if(process.env.VCAP_SERVICES){
  var env = JSON.parse(process.env.VCAP_SERVICES);
  console.log('VCAP_SERVICES = '+JSON.stringify(env, null, '  '));
  var mongo = env['mongodb-2.0'][0].credentials;
} else{
  var mongo = {
    "hostname":"localhost",
    "port":27017,
    "username":"",
    "password":"",
    "name":"",
    "db":"db"
  };
}

var generate_mongo_url = function(obj){
  obj.hostname = (obj.hostname || 'localhost');
  obj.port = (obj.port || 27017);
  obj.db = (obj.db || 'test');

  if(obj.username && obj.password){
    return "mongodb://" + obj.username + ":" + obj.password + "@" + obj.hostname + ":" + obj.port + "/" + obj.db;
  }
  else{
    return "mongodb://" + obj.hostname + ":" + obj.port + "/" + obj.db;
  }
};

var mongourl = generate_mongo_url(mongo);

console.log(mongourl);

var _connect = methodCaller('connect');
function connect() {
	return _connect(mongodb, mongourl);
}

//function apply(f, self/*optional*/, args) {
//	if (!args) {
//		//Actually, self are the args in that case!
//		return _apply(f, self);
//	} else {
//		return when(self, function (self) {
//			return _apply(f.bind(self), args);
//		});
//	}
//}

var _insert = methodCaller('insert');

/**
 * Insert an object into a mongodb collection.
 *
 * @return {Promise} that resolves when object was inserted or rejects if there was
 *             an error.
 */
exports.insert = function (collection, data, options) {
	return _insert(collection, data, options || { safe: true });
};


/**
 * Call 'find' on a collection. This just passes through arguments to
 * mongo as is, but returns a promise instead of accepting a callback.
 */
exports.find = methodCaller('find');

/**
 * Call 'toArray' on a Cursor... .
 */
exports.toArray = methodCaller('toArray');

/**
 * Get a mongodb collection
 */
exports.collection = function (name) {
	var d = when.defer();
	connect().then(function (conn) {
		console.log('fetch collection connection = '+conn);
		conn.collection(name, function (err, coll) {
			console.log('fetch collection err = '+err);
			console.log('fetch collection coll = '+coll);
			console.log('Connection = '+conn);
			if (err) {
				return d.reject(err);
			} else {
				return d.resolve(coll);
			}
		});
	});
	return d.promise;
};
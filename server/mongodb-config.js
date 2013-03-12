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

var mongodb = require('mongodb');
var when = require('when');

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

function connect() {
	var d = when.defer();
	mongodb.connect(mongourl, function (err, conn) {
		if (err) {
			d.reject(err);
		} else {
			d.resolve(conn);
		}
	});
	return d.promise;
}

/**
 * Connect to mongodb with either local or cloudfoundry url depending on
 * where we are running.
 */
exports.connect = connect;
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
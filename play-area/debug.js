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
var when = require('when');

function fswalk(i, work) {
	var q = i;
	function walk() {
		if (q === 0) {
			return when.resolve();
		} else {
			return when(work(q--)).then(walk);
		}
	}
	return walk();
}

function work(i) {
	var d = when.defer();
	process.nextTick(function() {
		if (i<10) { //Don't print too much junk.
			console.log(i);
		}
		d.resolve();
	});
	return d.promise;
}

//This code breaks in the sense that it will not call the then function
//and print done if we make problem size 'big enough'.
//For me it breaks somewhere between 2000 and 3000.

fswalk(100000, work).then(function () {
	console.trace('Done');
	console.log('Done');
}).otherwise(function (err) {
	console.error(err);
	if (err.stack) {
		console.log(err.stack);
	}
});

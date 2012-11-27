/*******************************************************************************
 * @license
 * Copyright (c) 2012 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Kris De Volder - initial API and implementation
 ******************************************************************************/

//All these yummy globals are provided by qunit:
/*global asyncTest ok equal start fail */

//
// Shim for running nodeunit-like tests with qunit.
//
// All tests are 'asynch' style tests. Test must call
// 'done()' for succesful completion.

define(['when'], function (when) {

	function makeTestFunc(nut) {
		return function () {
		
			var doneP = when.defer();
			var killedP = when.defer();
			var terminated = false; // becomes true when doneP or killedP resolves.
			var isDone = false; //becomes true when done is called by the test.
			
			//Enures tests don't get stuck if they forget to call done. (or someone forgets
			//to resolve/reject a promise, call a callback etc.
			setTimeout(kill, 5000);
			
			when.any([doneP, killedP], function () {
				//I think this is the best way to ensure that qunit 'start' is called exactly once
				//for each test.
				start();
				terminated = true; //makes all further asserts on this test be ignored.... except for
				                    // check for multiple done calls.
			});
			
			function kill() {
				if (!terminated) {
					killedP.resolve();
				}
			}
			
			function done() {
				//Note: check this before checking terminated otherwise the check
				//can't posibly ever fail since 'isDone' implies terminated.
				
				//Unfortunately, because of how qunit works we can't properyl check
				//this in context of the test. I.e. if this check fails it is bound to
				//fail outside the current test context. This is because calling done
				//makes qunit move on to the next test context and it will interpret
				//subsequent checks as if they belong to the next test regardless of
				//whihc test actually calls it.
				ok(!isDone, "Test end reached at most once (so far)");
				if (!terminated) {
					if (!isDone) {
						isDone = true;
						doneP.resolve();
					}
				}
			}
			
			nut({
				//There's more stuff in nodeunit than this, but this is
				//enough for the tests that we run. Add more as needed.
				equals: function (a, b, msg) {
					if (!terminated) {
						equal(a, b, msg);
					}
				},
				ok: function (bool, msg) {
					if (!terminated) {
						ok(bool, msg);
					}
				},
				done: done
			});
		};
	}

	function testShim(tests) {
		for (var t in tests) {
			if (tests.hasOwnProperty(t)) {
				asyncTest(t, makeTestFunc(tests[t]));
			}
		}
	}

	return testShim;

});
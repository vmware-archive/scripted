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
(function (define) {
	'use strict';

	define(function(require) {

		var when = require('when');

		//Inspired by Brian's 'until' function from here:
		//https://gist.github.com/d2cfb1005351f2654612

		var detailedRejection = false; //Set to true to retain all reject reasons in a until.
		                              // mostly interesting for debugging, otherwise probably best to disable this
		                              // as failed searches through large trees of alternatives may contain
		                              // many 'rejected' entries.

		function until(array, f) {
			var rejections = detailedRejection ? [] : null;
			return when(array, function (array) {
				var len = array.length;
				function loop(i) {
					if (i<len) {
						return when(array[i], f).otherwise(function (reason) {
							if (detailedRejection) {
								rejections[i] = reason; // keep all reasons
							} else {
								rejections = reason; // keep last reason only.
							}
							//console.error(reason);
							return loop(i+1);
						});
					} else {
						return when.reject(rejections || 'Empty array');
					}
				}
				return loop(0);
			});
		}

		/**
		 * Promise aware array filter. Constructs an array of only the
		 * elements of target array for which predicate resolves to a truthy
		 * value.
		 *
		 * If the predicate rejects on any element then the whole operation rejects.
		 * (i.e. rejections don't count as 'falsy' in this operation.)
		 */
		function filter(array, pred) {
//			console.log('entering filter ');
			return when.reduce(array,
				function (result, next) {
//					console.log('filtering '+JSON.stringify(result)+', '+next);
					return when(pred(next), function (isGood) {
						if (isGood) {
//							console.log('adding a good one: '+next);
							result.push(next);
//						} else {
//							console.log('skipping a bad one: '+next);
						}
						return result;
					});
				},
				[]
			);
		}

		/**
		 * Variable arity function that accepts any number of 'Actions' as arguments.
		 * Eeach action is tried in order until one of the actions resolves.
		 */
		function or() {
			var args = arguments;
			return until(args, function (thunk) {
				return thunk();
			});
		}

		/**
		 * Promise aware array iterator. Loops over elements of an array from left to right
		 * applying the function to each element in the array. The function gets passed
		 * the element and the index in the array.
		 */
		function each(array, fun) {
			return when.reduce(array,
				function (ignore, element, i) {
					return fun.call(undefined, element, i);
				},
				null
			);
		}

		/**
		 * Turns falsy values into rejections and leaves truthy values and
		 * already rejected promises alone.
		 */
		function rejectFalsy(v) {
			//TODO: not used anymore, remove?
			return when(v, function (v) {
				return v || when.reject(v);
			});
		}

		/**
		 * Promise-aware function to find the first element of an array,
		 * going from left to right, that returns or resolves to a true value.
		 * <p>
		 * Predicate may either return a rejected promise or a promise that
		 * resolves to a falsy value. Both will be treated as 'falsy'.
		 * <p>
		 * @return {Promise} that resolves when element is found or rejects when
		 *         it is not found.
		 */
		function findFirst(array, pred) {
			return findFirstIndex(array, pred).then(function (i) {
				return array[i];
			});
		}

		/**
		 * Like findFirst but instead of the actual value found it resolves to an index in the
		 * array.
		 */
		function findFirstIndex(array, _pred) {
			var predName = _pred.name || 'anonymous function';
			var index = 0; //Yuck: Keep track of where we are in the array by side effect!
			function pred(v) {
				var i = index++;
				return when(v, _pred).then(
					function (isMatch) {
						if (isMatch) {
							return when.resolve(i);
						} else {
							//Might as well include an explanation message.
							return when.reject('Rejected:' + v + 'because: '+ predName + ' returned '+isMatch);
						}
					},
					function () {
						//Might as well include an explanation message.
						return when.reject('Rejected:' + v + 'because: '+ predName + ' rejected it.');
					}
				);
			}
			return until(array, pred);
		}

		/**
		 * Apply boolean negation operator to a promise's resolve value. Rejections do not
		 * count as false. I.e: conceptually:
		 *
		 *  not(false) => true
		 *  not(true) => false
		 *  not(error) => error
		 */
		function not(p) {
			return when(p, function (v) {
				return !v;
			});
		}

		/**
		 * Pass a promise result or err to a nodejs style callback function.
		 */
		function nodeCallback(promise, callback) {
			if (!callback) {
				console.trace('undefined callback??');
			}
			promise.then(
				function (result) {
	//				console.log('nodeCallback ' +callback);
	//				console.log('nodeCallback result = ' +result);
					callback(/*noerror*/null, result);
				},
				function (error) {
	//				console.log('nodeCallback error = ' +error);
					callback(error);
				}
			).otherwise(function (err) {
				//Add an otherwise here to make it easier to diagnose broken code.
				//Without this errors thrown by the calls to the callback above are likely to
				//be swallowed without a trace by the when library.
				//Since when library will swallow (convert to a reject) anything thrown in here as well
				//the only way to make sure there's a trace of this error is to log it here.
				console.log(err);
				if (err.stack) {
					console.log(err.stack);
				}
				return when.reject(err); //Stay rejected although this is probably swallowed anyway.
			});
		}

		/**
		 * A while loop that avoids the exceeding stack limits on propagating the
		 * final resolve result of the body back to the caller.
		 */
		function whileLoop(condition, body) {
			var d = when.defer();
			//It seems that when library does ok passing control down into the recursive loop...
			// but it has bit of trouble crawling back out of the resolve chain if gets too
			// long.
			//See : https://gist.github.com/kdvolder/5095739
			//I'd fix the when library if I knew how.... But I don't so...
			//So instead we shall work around this by transmitting any resolves or
			// rejects that occur inside the loop back directly to our loop's entry-point's
			//returned promise.

			//Helper function to transmit an error directly out of the loop
			function reject(err) {
				d.reject(err);
			}

			//Helper function to transmist a result directly out of the loop.
			function resolve(value) {
				d.resolve(value);
			}

			function loop() {
				when(undefined, condition).then(
					function (c) {
						if (c) {
							when(undefined, body).then(loop, reject);
						} else {
							resolve();
						}
					},
					reject
				);
				//Yes, it's on purpose we don't return anything anywhere since it doesn't
				//work anyway if the chain gets too deep.
			}
			loop();
			return d.promise;
		}

		var	slice = Array.prototype.slice;
		var nodeApply = require('when/node/function').apply;

		/**
		 * Creates a promisified methodCaller function for a method with a given
		 * name. Usage example:
		 *
		 * Say you have a collection object that has a node-style callbacky method
		 * called 'find' that you would call as follows:
		 *
		 *    collection.find(query, function (err, result) {
		 *        if (err) {
		 *            ...handle error...
		 *        } else {
		 *            ...process result...
		 *        }
		 *    });
		 *
		 * Then you can do the following instead
		 *
		 *    var find = methodCaller('find');
		 *
		 *    find(collection, query).then(
		 *		function (result) { ... },
		 *		function (err) { ... }
		 *	  );
		 */
		function methodCaller(name) {
			//TODO: more sensible error messages when calling non-existent methods.
			var caller = function (self /*, args...*/) {
				var args = slice.call(arguments, 1);
				return when(self, function (self) {
					//console.log('calling '+name+' on '+self);
					//console.log('args = '+args);
					var f = self[name];
					//console.log('self.'+name+' = '+f);
					return nodeApply(f.bind(self), args);
				});
			};
			caller.name = name+'MethodCaller';
			return caller;
		}

		return {
			methodCaller: methodCaller,
			whileLoop: whileLoop,
			not: not,
			until: until,
			orMap: until, // just another name I like to use.
			or:	or,
			each: each,
			filter: filter,
			findFirst: findFirst,
			findFirstIndex: findFirstIndex,
			nodeCallback: nodeCallback
		};
	});

}(typeof define === 'function' && define.amd && define.amd ? define : function (factory) {
	module.exports = factory(require);
}));
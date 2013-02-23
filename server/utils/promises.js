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

		return {
			not: not,
			until: until,
			orMap: until, // just another name I like to use.
			or:	or,
			each: each,
			filter: filter,
			findFirst: findFirst,
			findFirstIndex: findFirstIndex
		};
	});

}(typeof define === 'function' && define.amd && define.amd ? define : function (factory) {
	module.exports = factory(require);
}));
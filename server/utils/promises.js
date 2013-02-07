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

		return {
			until: until,
			orMap: until, // just another name I like to use.
			or:	or,
			each: each
		};
	});

}(typeof define === 'function' && define.amd && define.amd ? define : function (factory) {
	module.exports = factory(require);
}));
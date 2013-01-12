/*
 * Copyright (c) 2012 VMware, Inc. All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

(function (define) {
	'use strict';

	// derived from dojo.mixin
	define(function (/* require */) {

		var empty = {};

		function _mixin(dest, source, copyFunc) {
			var name;

			for (name in source) {
				// the (!(name in empty) || empty[name] !== source[name]) condition avoids
				// copying properties in "source" inherited from Object.prototype. For
				// example, if dest has a custom toString() method, don't overwrite it with
				// the toString() method that source inherited from Object.prototype
				if (!(name in dest) || (dest[name] !== source[name] && (!(name in empty) || empty[name] !== source[name]))) {
					dest[name] = copyFunc ? copyFunc(source[name]) : source[name];
				}
			}

			return dest; // Object
		}

		/**
		 * Mix the properties from the source object into the destination object
		 *
		 * @param {Object} dest the object to copy properties to
		 * @param {Object} sources the objects to copy properties from.  May be 1 to N arguments, but not an Array.
		 * @return {Object} the destination object
		 */
		function mixin(dest /*, sources... */) {
			var i, l;

			if (!dest) { dest = {}; }
			for (i = 1, l = arguments.length; i < l; i += 1) {
				_mixin(dest, arguments[i]);
			}

			return dest; // Object
		}

		return mixin;

	});

}(
	typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }
	// Boilerplate for AMD and Node
));

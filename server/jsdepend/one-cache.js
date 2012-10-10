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
 
/*global exports require console */
//
// one-cache.js
//
// A very simple caching utility. It caches exactly one key value pair. As long as a function is
// being called with the same parameter the cached value is returned.
// As soon as the parameter changes the cache is cleared.

//makeCached :: ( a -> b ) -> (a -> b)
function makeCached(fun) {
	var hasCache = false;
	var key = null;
	var value = null;
	function cached(a) {
		if (hasCache && a === key) {
			return value;
		} else {
			var tmp = fun(a);
			key = a;
			value = tmp;
			hasCache = true;
			return value;
		}
	}
	return cached;
}

exports.makeCached = makeCached;
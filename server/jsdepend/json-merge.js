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

/*global module require*/

/**
 * Returns true if x is a 'real' object (i.e. an object but not an array)
 * @return boolean 
 */
function isObject(x) {
	return "object"===typeof(x) && !Array.isArray(x);
}

/**
 * Recursively merge the properties of two json data objects.
 * If a property is defined in both objects, and both properties
 * are bound to objects, then the objects themselves will be merged
 * recursively. If one or both of the properties are bound
 * to non-object values then the property of the second object
 * is used and the property of the left object is ignored.
 *
 * Note: we treat any array as "not an object".
 *
 * The merge is purely functional: properties are copied into a new object,
 * leaving the original objects as is.
 */
function jsonMerge(l, r) {

	//Note: merge treats "undefined" differently from other falsy values:
	// The undefined value always has lower priority regardless of whether it
	// is the right or left parameter. 
	// But for defined falsy values the priority is instead determined based on
	// whether it is from the left or right parameter.
	// This is so that an 'r' config object can override a truthy value in
	// the l object and make it false.

	//Make sure we handle cases where either l or r are undefined.
	// This makes the rest of the code simpler.
	if (l===undefined) {
		return r;
	}
	if (r===undefined) {
		return l;
	}

	if (isObject(l) && isObject(r)) {
		//Recursive merge all properties
		var m = {}; //merged object

		for (var p in l) {
			if (l.hasOwnProperty(p)) {
				m[p] = l[p];
			}
		}
		
		for (p in r) {
			if (r.hasOwnProperty(p)) {
				m[p] = jsonMerge(m[p], r[p]); //yes, it is ok if m[p] is undefined!
			}
		}
		return m;
	}
	
	//At this point neither l nor r are undefined, and at least one of them is not an object.
	//This means we cannot really merge the two values so we must choose one over the other.
	
	return r; //right most param takes precedence.
}

module.exports = jsonMerge;
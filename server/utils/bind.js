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

/**
 * In a given object, bind all own properties that are bound to functions to
 * fix their 'this' objects.
 */
function bindProperties(exports, self) {
	self = self || exports;
	for (var p in exports) {
		if (exports.hasOwnProperty(p)) {
			var f = exports[p];
			if (typeof(f)==='function') {
				exports[p] = f.bind(self);
			}
		}
	}
	return exports;
}

exports.bindProperties = bindProperties;
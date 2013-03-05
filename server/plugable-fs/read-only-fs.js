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

var fsErrors = require('./fs-errors');
var extend = require('../jsdepend/utils').extend;

function create(fs) {

	/**
	 * Create a function that can be uses as an implementation for any fs operation
	 * that tries to mutate something on a read-only filesystem.
	 */
	function readOnlyErrorFun(funName) {
		function fun() {
			var handle = arguments[0];
			var callback = arguments[arguments.length-1];
			//The callback is optional in most of these.
			// If its not provided the there's no need to call it to
			// report an error.
			if (typeof(callback)==='function') {
				callback(fsErrors.accessPermisssionError(funName, handle));
			}
		}
		fun.name = funName;
		return fun;
	}


	return extend(fs, {
		unlink: readOnlyErrorFun('unlink'),
		rmdir: readOnlyErrorFun('rmdir'),
		writeFile: readOnlyErrorFun('writeFile'),
		mkdir: readOnlyErrorFun('mkdir'),
		rename:readOnlyErrorFun('rename')
	});

}

module.exports = create;
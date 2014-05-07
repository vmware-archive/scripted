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

//
// A wrapper that makes a specific path on a filesystem 'unlistable'.
// This means that when trying to readdir that path the result will
// be just an empty list.
//
// The idea is to use this to make the subdirectories 'semi-private'.
// It will be hard to guess/discover the names of the subdirectories, but if
// you know the name of *your* directory can still access or share it
// with others.
//

var fsErrors = require('./fs-errors');
var extend = require('../jsdepend/utils').extend;

function create(fs, path) {

	path = path || '/';

	/**
	 * Replacement for 'readdir' so that readdir('/') => [] and other paths
	 * are just delegated to retain their orginal behavior.
	 */
	function readdir(handle, k) {
		if (handle===path) {
			return k(null, []);
		} else {
			return fs.readdir(handle, k);
		}
	}

	return extend(fs, {
		readdir: readdir
	});

}

module.exports = create;
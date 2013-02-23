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
 * Create something that looks like a node fs 'ENOENT' error.
 */
function noExistError(funName, handle) {
	var err = new Error('[Error: ENOENT, '+funName+' '+JSON.stringify(handle)+']');
	err.errno = 34;
	err.code = 'ENOENT';
	err.path = handle;
	return err;
}

/**
 * Create something that looks like a node fs 'EISDIR' error.
 */
function isDirError(funName, handle) {
	var err = new Error('[Error: EISDIR, '+funName+' '+JSON.stringify(handle)+']');
	err.errno = 28;
	err.code = 'EISDIR';
	err.path = handle;
	return err;
}

/**
 * Create something that looks like a node fs 'ENOTDIR' error.
 */
function isNotDirError(funName, handle) {
	var err = new Error('[Error: ENOTDIR, '+funName+' '+JSON.stringify(handle)+']');
	err.errno = 27;
	err.code = 'ENOTDIR';
	err.path = handle;
	return err;
}


/**
 * Create an error similar to node fs 'EACCES'. Note that there's also 'EPERM' which
 * probably is subtly different. The most interesting info I found about this was here:
 *
 * http://www.manpagez.com/man/1/hdiutil/osx-10.4.php
 *
 *   EACCES and EPERM are subtly different.  The latter
 *   "operation not permitted" tends to refer to an operation
 *   that cannot be performed, often due to an incorrect
 *   effective user ID.  On the other hand, "permission denied"
 *   tends to mean that a particular access mode prevented the operation.
 *
 */
function accessPermissionError(funName, handle) {
	var err = new Error('[Error: EACCES, '+funName+' '+JSON.stringify(handle)+']');
	err.errno = 3;
	err.code = 'EACCES';
	err.path = handle;
	return err;
}

function dirNotEmptyError(funName, handle) {
	var err = new Error('[Error: ENOTEMPTY, '+funName+' '+JSON.stringify(handle)+']');
	err.errno = 53;
	err.code = 'ENOTEMPTY';
	err.path = handle;
	return err;
}

function existsError(funName, handle) {
	var err = new Error('[Error: EEXIST, '+funName+' '+JSON.stringify(handle)+']');
	err.errno = 47;
	err.code = 'EEXIST';
	err.path = handle;
	return err;
}

function crossFSError(funName, handle) {
	var err = new Error('[Error: EXDEV, '+funName+' '+JSON.stringify(handle)+']');
	err.errno = 52;
	err.code = 'EXDEV';
	err.path = handle;
	return err;
}

exports.isDirError = isDirError;
exports.isNotDirError = isNotDirError;
exports.dirNotEmptyError = dirNotEmptyError;

exports.existsError = existsError;
exports.noExistError = noExistError;
exports.accessPermisssionError = accessPermissionError;
exports.crossFSError = crossFSError;
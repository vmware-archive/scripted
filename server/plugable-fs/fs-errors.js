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
	//Return something similar to what node fs returns when a file does not exist.
	var err = new Error('[Error: ENOENT, '+funName+' '+JSON.stringify(handle)+']');
	err.errno = 34;
	err.code = 'ENOENT';
	err.path = handle;
	return err;
}

exports.noExistError = noExistError;
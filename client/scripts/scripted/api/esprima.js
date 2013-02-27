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
 *  Andy Clement
 ******************************************************************************/

/*global esprima */
/**
 * Far from ideal, this ensures the esprima global is defined by pulling in the module.
 * It returns something on which parse can be called but whoever required this module
 * could just use the global directly */
define(function (require) {

	// This brings the 'esprima' global in
	require("esprima/esprima");

	return {
		// TODO write up some docs...
		parse: function(code, options) {
			return esprima.parse(code,options);
		}
	};
});
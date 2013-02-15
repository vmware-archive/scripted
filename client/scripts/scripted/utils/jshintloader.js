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
 *		Andy Clement
 ******************************************************************************/
 
// TODO move more jshint loading stuff into here
 /*
  * Accessible promise for loading jshint, instead of a global.
  */
define(['when'],
function(when) {
	
	var jshintloaderdeferred = when.defer();
	
	function getDeferred() {
		return jshintloaderdeferred;
	}
	
	return { getDeferred: getDeferred };

});

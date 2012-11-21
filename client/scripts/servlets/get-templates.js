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
 *     Andrew Eisenberg - initial API and implementation
 ******************************************************************************/

// Calls a servlet to grab templates of a particular kind from the server
/*jslint browser:true */
/*global define */


// TODO should use stub-maker
define(['when'], function(when) {
	/**
	 * keeps track of existing requests so that we don't ask for the same 
	 * deferred multiple times.
	 */ 
	var deferreds = {};
	
	return { loadRawTemplates : function(scope, completionsRoot) {
		if (deferreds[scope]) {
			return deferreds[scope];
		}
		
		var deferred = when.defer();
		var xhr = new XMLHttpRequest();
		xhr.open("GET", "/templates?scope=" + scope + 
			(completionsRoot ? "&root=" + completionsRoot : ""), true);
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					var res = xhr.responseText;
					if (res) {
						res = JSON.parse(res);
					} else {
						res = {};
					}
					deferred.resolve(res);
				} else {
					deferred.reject("Error loading templates");
				}
			}
		};
	    xhr.send();
	    deferreds[scope] = deferred;
		return deferred.promise;
	} };

});
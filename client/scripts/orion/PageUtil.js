/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define console window*/

define(function(){

	function matchResourceParameters(optURIText) {
		optURIText = optURIText || window.location.toString();
		var result = {resource:""};
		var hashIndex = optURIText.indexOf("#");
		if (hashIndex !== -1) {
			var text = optURIText.substring(hashIndex + 1);
			if (text.length !== 0) {
				var params = text.split(",");
				result.resource = decodeURIComponent(params[0]);
				for (var i = 1; i < params.length; i++) {
					var nameValue = params[i].split("=");
					var name = decodeURIComponent(nameValue[0]);
					var value = (nameValue.length === 2) ? decodeURIComponent(nameValue[1]) : null;
					if (value !== null && name !== "resource") {
						result[name] = value;
					}
				}
			}			
		}
		return result;
	}

	return {
		matchResourceParameters: matchResourceParameters
	};
});
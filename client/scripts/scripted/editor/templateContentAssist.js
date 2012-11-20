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

/*jslint browser:true */
/*global define */

if(!Array.isArray) {
  Array.isArray = function (vArg) {
    return Object.prototype.toString.call(vArg) === "[object Array]";
  };
}

/**
 * This module provides content assist gathered from .scripted-completion files
 */

define(['when'], function(when) {

	/** 
	 * shared templates
	 * @type {{completions:Array}}
	 */
	var allTemplates = {};
	
	/**
	 * keeps track of existing requests so that we don't ask for the same 
	 * deferred multiple times.
	 */ 
	var deferreds = {};
	
	function loadRawTemplates(scope) {
		if (deferreds[scope]) {
			return deferreds[scope];
		}
	
		
		var deferred = when.defer();
		var xhr = new XMLHttpRequest();
		xhr.open("GET", "/templates?scope=" + scope, true);
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
	}
	

	function extractPositions(origPositions, offset) {
		if (!origPositions) {
			return null;
		}
		var newPositions = [];
		if (Array.isArray(origPositions)) {
			origPositions.forEach(function(position) {
				newPositions.push(extractPositions(position, offset));
			});
		} else {
			newPositions = { offset : origPositions.offset + offset, length : origPositions.length };
		}
		return newPositions;
	}

	function TemplateContentAssist() {
	}
	
	TemplateContentAssist.prototype = {
		install : function(scope) {
			this.scope = scope;
			if (! allTemplates[scope]) {
				var templatesDeferred = loadRawTemplates(scope);
				templatesDeferred.then(function(templates) { allTemplates[scope] = templates; });
			}
		},
		computeProposals: function(buffer, invocationOffset, context) {
			if (!allTemplates) {
				return [];
			}
			var myTemplates = allTemplates[this.scope];
			if (!myTemplates) {
				return [];
			}
			// we're in business
			var newTemplates = [];
			var prefix = context.prefix;
			// find offset of the start of the word
			var offset = invocationOffset - prefix.length;
			myTemplates.forEach(function(template) {
				if (template.trigger.substr(0,prefix.length) === prefix) {
					newTemplates.push({
						proposal : template.proposal,
						description : template.description,
						escapePosition : template.escapePosition ? offset + template.escapePosition : null,
						positions : extractPositions(template.positions, offset),
						relevance : 2000,
						replace : true
					});
				}
			});
			return newTemplates;
		}
	};

	return {
		TemplateContentAssist : TemplateContentAssist,
		/** 
		 * installs templates from the server in this client
		 */
		isInstalled: function() {
			return !!allTemplates;
		}
		
		
	};
});
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

define(['servlets/get-templates', 'when'], function(getTemplates, when) {

	/**
	 * shared templates
	 * @type {{completions:Array}}
	 */
	var allTemplates = {};
	
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
		install : function(scope, root) {
			this.scope = scope;
			var deferred = when.defer();
			if (! allTemplates[scope]) {
				var templatesDeferred = getTemplates.loadRawTemplates(scope, root);
				templatesDeferred.then(function(templates) {
					allTemplates[scope] = templates;
					deferred.resolve(templates);
				}, function(err) {
					deferred.reject(err);
				});
			} else {
				deferred.resolve(allTemplates[scope]);
			}
			return deferred.promise;
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
						relevance : 20000,
						replace : true
					});
				}
			});
			return newTemplates;
		}
	};

	return {
		TemplateContentAssist : TemplateContentAssist,
		_getAllTemplates : function() { return allTemplates; },
		_reset : function() {
			allTemplates = {};
			getTemplates._reset();
		}
	};
});
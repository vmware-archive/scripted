/******************************************************************************* 
 * @license
 * Copyright (c) 2011 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation 
 ******************************************************************************/

/*jslint */
/*global define */

define("orion/editor/htmlGrammar", [], function() {

	/**
	 * Provides a grammar that can do some very rough syntax highlighting for HTML.
	 * @class orion.syntax.HtmlGrammar
	 */
	function HtmlGrammar() {
		/**
		 * Object containing the grammar rules.
		 * @public
		 * @type Object
		 */
		return {
			"name": "HTML",
			"scopeName": "source.html",
			"uuid": "3B5C76FB-EBB5-D930-F40C-047D082CE99B",
			"patterns": [
				{
					"begin": "<!(doctype|DOCTYPE)",
					"end": ">",
					"contentName": "entity.name.tag.doctype.html",
					"beginCaptures": {
						"0": { "name": "entity.name.tag.doctype.html" }
					},
					"endCaptures": {
						"0": { "name": "entity.name.tag.doctype.html" }
					}
				},
				{
					"begin": "<!--",
					"end": "-->",
					"beginCaptures": {
						"0": { "name": "punctuation.definition.comment.html" }
					},
					"endCaptures": {
						"0": { "name": "punctuation.definition.comment.html" }
					},
					"patterns": [
						{
							"match": "--",
							"name": "invalid.illegal.badcomment.html"
						}
					],
					"contentName": "comment.block.html"
				},
				{ // startDelimiter + tagName
					"match": "<[A-Za-z0-9_\\-:]+(?= ?)",
					"name": "entity.name.tag.html"
				},
				{ "include": "#attrName" },
				{ "include": "#qString" },
				{ "include": "#qqString" },
				{ "include": "#entity" },
				// TODO attrName, qString, qqString should be applied first while inside a tag
				{ // startDelimiter + slash + tagName + endDelimiter
					"match": "</[A-Za-z0-9_\\-:]+>",
					"name": "entity.name.tag.html"
				},
				{ // end delimiter of open tag
					"match": ">", 
					"name": "entity.name.tag.html"
				} ],
			"repository": {
				"attrName": { // attribute name
					"match": "[A-Za-z\\-:]+(?=\\s*=\\s*['\"])",
					"name": "entity.other.attribute.name.html"
				},
				"qqString": { // double quoted string
					"match": "(\")[^\"]+(\")",
					"name": "string.quoted.double.html"
				},
				"qString": { // single quoted string
					"match": "(')[^']+(\')",
					"name": "string.quoted.single.html"
				},
				"entity": {
					"match": "&[A-Za-z0-9]+;",
					"name": "constant.character.entity.html"
				}
			}
		};
	}

	return {HtmlGrammar: HtmlGrammar};
});

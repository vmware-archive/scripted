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
 *     Chris Johnson - initial implementation
 *     Andy Clement
 *     Andrew Eisenberg - refactoring for a more consistent approach to navigation
 *     Scott Andrews
 ******************************************************************************/
/*jslint browser:true */
/*global JSON5 */

/**
 * This module provides oeprations for manipulating scripted URLs, history, and page state.
 * The current state of a page is captured in the hash of the page's url.
 * See https://issuetracker.springsource.com/browse/SCRIPTED-234 for a full description of how a url is described
 * A simple description is that the following json fully describes the page state:
<pre>
main : { // main editor
	path : <full path to file>
	range : [offset,length]  of selected text
	scroll : <scroll position>
},
side : { // side panel can be specified as an array for multiple side panels
	path : <full path to file>
	range : [offset,length]  of selected text
	scroll : <scroll position>
}

</pre>
 * there are shortcuts and other ways to simplify the url.  See the jira issue for details.
 */
define(['scripted/utils/storage', 'scriptedLogger', 'lib/json5'], function(storage, scriptedLogger) {

	var editorPrefix, windowsPathRE;

	// TODO FIXADE Should inject this value
	editorPrefix = window.isTest ? "/clientServerTests?" : "/editor";
	windowsPathRE = /^\/?.+:/;

	return {
		/**
		 * A function that extracts page layout from a hash and path
		 * including all open editors, the currently selected text
		 * and their scroll positions
		 *
		 * @param {String} hash the hash of the url to parse. The hash might just be a fully qualified path or it could be a full JSON object
		 * @param {String} path the path of the url to parse
		 * @return {{main:{path:String,range:Array,scroll:Number},side0:{path:String,range:Array,scroll:Number}}} an object describing the full page state
		 */
		extractPageState : function(hash, path) {
			hash = decodeURI(hash);
			path = decodeURI(path);
			if (!hash && !path) {
				// create empty page state to be filled later
				return {main: {path: ""}};
			}
		
			if (hash.charAt(0) === '#') {
				hash = hash.substring(1);
			}
		
			if (!isNaN(parseInt(hash.charAt(0), 10))) {
				// http://localhost:7261/editor/path.js#10,20
				hash = "main:{range:[" + hash + "]}";
			}
		
			if (hash.charAt(0) !== '{') {
				// http://localhost:7261/editor/path.js#main:{range:10,20}
				hash = '{' + hash +'}';
			}

			var sliced = hash.slice(0, 5);
		    if (sliced !== "{main" && sliced !== "{side" &&
		        sliced !== "{\"mai" && sliced !== "{\"sid") {
				// assume implicit main
				// http://localhost:7261/#range:10,20,path:'/path.js'
				hash = "{main:" + hash + "}";
			}

			if (path.indexOf(editorPrefix) === 0) {
				path = path.substr(editorPrefix.length);
			}
			if (path === "") {
				path = "/";
			}
			if (windowsPathRE.test(path) && path.charAt(0) === "/") {
				// remove the loading slash for windows paths
				path = path.substring(1);
			}
			try {
				// escape backslashes. json5 will get tripped up on them
				var state = JSON5.parse(hash);
				if (typeof state !== "object") {
					// assume invalid
					scriptedLogger.warn("Invalid hash: " + hash, "STORAGE");
					state = {main:{}};
				}
				if (!state.main) {
					state.main = {};
				}
			
				if (path && !state.main.path) {
					state.main.path = path;
				}
				return state;
			} catch (e) {
				scriptedLogger.warn("Invalid hash: " + hash, "STORAGE");
				// return empty state.  use path if exists
				return {main: {path : (path ? path : "") } };
			}
		},
	
		extractPageStateFromUrl : function(url) {
			if (url.substring(0, "http://".length) !== "http://" && url.substring(0, editorPrefix.length) !== editorPrefix) {
				// assume path, not a url
				var splits = url.split("#");
				var hash;
				if (splits.length > 1) {
					hash = "{range:[" + splits[1] + "]}";
				} else {
					hash = "{}";
				}
				return this.extractPageState(hash, splits[0]);
			}
		
			var path = url.replace(/^https?:\/\/[^\/]+/, '');
			var hashIndex = url.indexOf('#');
			if (hashIndex < 0) {
				hashIndex = url.length;
			}
			if (hashIndex >= 0) {
				url = url.substring(hashIndex +1);
				path = path.split('#', 1)[0];
			}
			return this.extractPageState(url, path);
		},
		
		/**
		 * Retrieves the history from local storage
		 * @return {Array.<{path:String,range:Array,scroll:Number}>}
		 */
		getHistory : function() {
			var historyJSON = storage.get("scripted.recentFileHistory");
			if (!historyJSON) {
				return [];
			}
			var arr = JSON5.parse(historyJSON);
			for (var i = 0; i < arr.length; i++) {
				if (!arr[i].path) {
					arr.splice(i, 1);
					i--;
				}
			}
			return arr;
		},
	
		getHistoryAsObject : function() {
			var histArr = this.getHistory();
			var histObj = {};
			for (var i = 0; i < histArr.length; i++) {
				if (histArr[i].path) {
					histObj[histArr[i].path] = histArr[i];
				}
			}
			return histObj;
		},
	
		setHistory : function(history) {
			storage.safeStore("scripted.recentFileHistory", JSON5.stringify(history));
		},
	
		/**
		 * generates an item to be stored in scripted.recentFileHistory as well as browser state
		 */
		generateHistoryItem : function(editor) {
			if (!editor) {
				return { path : "", range : [0,0] };
			}
			var path = editor.getFilePath();
			var scrollPos = $(editor._domNode).find('.textview').scrollTop();
			var selection = editor.getSelection();
			return {
				path: path,
				range: [selection.start, selection.end],
				scroll: scrollPos
			};
		},
	
		generateHash : function(histItem, editorKind) {
			// check to see if we should shortcut and have a simple range as the hash
			if (!histItem.side) {
				var item = histItem.main ? histItem.main : histItem;
				if (!item.path && (!item.scroll || item.scroll === 0)) {
					if (item.range) {
						return item.range.toString();
					} else {
						// nothing here;
						return "";
					}
				}
			}
		
			if (histItem.main || histItem.side) {
				return JSON5.stringify(histItem);
			}
		
			if (!editorKind) {
				editorKind = "main";
			}
			
			var newItem = {};
			newItem[editorKind] = histItem;
			return JSON5.stringify(newItem);
		},
	
		/**
		 * Generates a url to open a file on a given file path or
		 * history object
		 * @param {{path:String,range:Array,scroll:Number}|String} loc item to generate a link for
		 * this item could be a full path to a file, or it could be a history item
		 * @return {String}
		 */
		generateUrl : function(loc) {
			if (typeof loc === 'string') {
				// assume a simple file path
				return editorPrefix + loc;
			} else {
				var path, wasPathDel, wasMainPathDel;
				if (loc.path) {
					path = loc.path;
					wasPathDel = true;
					delete loc.path;
				} else if (loc.main && loc.main.path) {
					path = loc.main.path;
					wasMainPathDel = true;
					delete loc.main.path;
				}
				var gen = this.generateHash(loc);
				if (wasPathDel) {
					loc.path = path;
				} else if (wasMainPathDel) {
					loc.main.path = path;
				}
				return editorPrefix + (windowsPathRE.test(path) ? "/" : "") + path + "#" + gen;
			}
		},

		/**
		 * Define a custom URL prefix for the editor. Useful within unit tests
		 * @param {String} prefix the new path prefix
		 */
		_setEditorPrefix : function(prefix) {
			editorPrefix = prefix;
		},
	
		storeScriptedHistory : function(histItem) {
			var scriptedHistory = this.getHistory();
			for (var i = 0; i < scriptedHistory.length; i++) {
				if (scriptedHistory[i].path === histItem.path) {
					scriptedHistory.splice(i,1);
				}
			}
			scriptedHistory.push(histItem);
		
			// arbitrarily keep track of 8 scriptedHistory items
			// TODO should we have a .scripted setting to customize this?
			while (scriptedHistory.length > 8) {
				scriptedHistory.shift();
			}
		
			this.setHistory(scriptedHistory);
		},
	
		storeBrowserState : function(mainItem, subItem, doReplace) {
			try {
				var name = mainItem.path.split('/').pop();
				var histItem;
				if (subItem) {
					histItem = { main: mainItem, side: subItem};
				} else {
					histItem = mainItem;
				}
				var url = this.generateUrl(histItem);
				if (doReplace) {
					window.history.replaceState(histItem, name, url);
				} else {
					window.history.pushState(histItem, name, url);
				}
			} catch (e) {
				scriptedLogger.error(e, "STORAGE");
			}
		}
	};
});
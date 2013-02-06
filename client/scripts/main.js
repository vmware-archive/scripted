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
 *     Andrew Eisenberg
 *     Brian Cavalier
 ******************************************************************************/

/*jslint browser:true */

//define(function (require) {
//
//	var scripted = require('scripted');
//	var scriptedLogger = require('scriptedLogger');
//	var layoutManager = require('layoutManager');
//	var FileExplorer = require('scripted/navigator/explorer-table');
//	require('scripted/editor/editorPane');
//	require('scripted/plugin-loader');
//
//	scripted.init();
//
//	// doing this in the layout manager itself
////	layoutManager.editorNode = document.getElementById("editor");
//	var fileExplorer = new FileExplorer({parentId : 'explorer-tree'});
//
//	scripted.ready(scriptedLogger, fileExplorer, layoutManager);
//});

define({
	// starting point for app
	scripted : {
		module : 'scripted',
		init: 'init',
		ready : {
			ready: [
				{ $ref : 'scriptedLogger' },
				{ $ref : 'fileExplorer' },
				{ $ref : 'layoutManager' }
			]
		}
	},

	// provides configurable logging
	// currently also a global, but needs to change
	scriptedLogger : {
		module : 'scriptedLogger'
	},

	// module needs to be loaded, but doesn't need to be referenced
	editorPane : {
		module : "scripted/editor/editorPane"
	},

	// does the layout and resizes dom nodes on window resize and when vertical bars move
	layoutManager : {
		module : "layoutManager",
		properties : {
			editorNode : { $ref : "dom!editor"} // TODO more dom nodes
		}
	},

	// the left-hand navigator
	fileExplorer : {
		create : {
			module : "scripted/navigator/explorer-table",
			args : [{ parentId: "explorer-tree" }]
		}
	},

	plugins : [
		{ module : 'wire/debug' },
		{ module : 'wire/jquery/dom' }
	]
});
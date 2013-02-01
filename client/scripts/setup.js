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
 *     Andrew Eisenberg
 *     Andrew Clement
 *     Kris De Volder
 *     Christopher Johnson
 *     Scott Andrews
 *     Brian Cavalier
 ******************************************************************************/

/*global location confirm requirejs $ console window require XMLHttpRequest SockJS setTimeout document*/
/*jslint browser:true */


// Scripted starting point
requirejs.config({
	packages: [
		{ name: 'dojo', location: 'lib/dojo', main:'lib/main-browser'},
		{ name: 'dijit',location: 'lib/dijit',main:'lib/main'},
		{ name: 'probes', location: '../components/probes', main:'probe'},
		{ name: 'when', location: '../components/when', main:'when'},
		{ name: 'wire', location: '../components/wire', main:'wire'},
		{ name: 'meld', location: '../components/meld', main:'meld'},
		{ name: 'rest', location: '../components/rest',  main: 'rest'}
	],
	paths: {
	//require: 'lib/requirejs/require',
		i18n: '../components/requirejs/i18n',
		text: '../components/requirejs/text',
		"wire/domReady": 'lib/domReady',
		jquery_ui: 'lib/jquery-ui-custom',
		jsbeautify: 'lib/beautify',
		jsrender: 'lib/jsrender',
		jquery: 'lib/jquery-1.7.2.min',
		sockjs:'lib/sockjs-592774a-0.3.1.min',
		fileapi: 'scripted/fileapi',
		'esprima/esprima' : 'lib/esprima/esprima',
		'doctrine/doctrine' : '../components/doctrine/doctrine',
		'lib/json5' : '../components/json5/lib/json5',
		jshint: 'lib/jshint-r12-80277ef',
		'websocket-multiplex': 'lib/websocket-multiplex/multiplex_client',
		zen: 'lib/zen/emmet-full'
//		zen: 'lib/zen/emmet-full.min' // use minified form for distributions
	}
});

require(['main']);


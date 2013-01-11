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
	packages:	[{ name: 'dojo', location: 'lib/dojo', main:'lib/main-browser', lib:'.'},
				{ name: 'dijit',location: 'lib/dijit',main:'lib/main',lib: '.' },
				{ name: 'when', location: 'lib/when', main: 'when' },
				{ name: 'meld', location: 'lib/meld', main: 'meld' },
				{ name: 'wire', location: 'lib/wire', main: 'wire' }],
	paths: {
	//require: 'lib/requirejs/require',
		i18n: 'lib/requirejs/i18n',
		text: 'lib/requirejs/text',
		"wire/domReady": 'lib/domReady',
		jquery_ui: 'lib/jquery-ui-custom',
		jsbeautify: 'lib/beautify',
		jsrender: 'lib/jsrender',
		jquery: 'lib/jquery-1.7.2.min',
		sockjs:'lib/sockjs-592774a-0.3.1.min',
		fileapi: 'scripted/fileapi',
		'esprima/esprima' : 'lib/esprima/esprima',
		'doctrine/doctrine' : 'lib/doctrine/doctrine',
		jshint: 'lib/jshint-r12-80277ef',
		'websocket-multiplex': 'lib/websocket-multiplex/multiplex_client'
	}
});

require(['wire!main']);
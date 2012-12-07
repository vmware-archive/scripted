/*******************************************************************************
 * @license
 * Copyright (c) 2011 VMware Inc and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: VMware Inc. - initial API and implementation
 ******************************************************************************/

/*global window require test module asyncTest */
var config = {
	baseUrl: '../scripts',
	packages:	[{ name: 'dojo', location: 'lib/dojo', main:'lib/main-browser', lib:'.'},
				{ name: 'dijit',location: 'lib/dijit',main:'lib/main',lib: '.'}],
	paths: {
		'orion/assert' : '../tests/client/assert',
		'esprima/esprima' : 'lib/esprima/esprima',
		'doctrine/doctrine' : 'lib/doctrine/doctrine',
		i18n: 'lib/requirejs/i18n',
		text: 'lib/requirejs/text',
		jquery_ui: 'lib/jquery-ui-custom',
		jsbeautify: 'lib/beautify',
		jsrender: 'lib/jsrender',
		qunit: 'lib/qunit/qunit-1.10.0',
		jquery: 'lib/jquery-1.7.2.min',
		sockjs:'lib/sockjs-592774a-0.3.1.min',
		fileapi: 'scripted/fileapi',
		when: 'lib/when-aaa0898-1.6.1',
		
		tests: '../tests'
	}
};

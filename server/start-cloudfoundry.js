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
 *   Kris De Volder
 ******************************************************************************/

//
// A start script to run scripted server on cloudfoundry
//

// TODO: Before this can go 'public'
//
//   - disable 'exec' related features. Don't really want people to run exec commands
//     on cf hosts.
//   - github-fs
//        - needs some cache management cleanup so it can avoid running out of memory
//        - cache contents of files as well
//        - login mechanis to obtain oauth token for individual user (optional for 'demo')
//   - remove or fix the 'Play' button.
//   - Customized readme shown when opening on a folder.
//   - A reasonable piece of sample code to pre-populate first-time visitor space.
//   - Ask Scott to vacate domain name 'scripted.cloudfoundry.com' so we can use that.

var path = require('path');

var nodefs = require('fs');
var mappedFs = require('../server/plugable-fs/mapped-fs');
var scriptedFs = require('../server/plugable-fs/scripted-fs');
var githubFs = require('../server/plugable-fs/github-fs');
var compose = require('../server/plugable-fs/composite-fs').compose;
var readOnly = require('../server/plugable-fs/read-only-fs');

var withBaseDir = mappedFs.withBaseDir;
var withPrefix = mappedFs.withPrefix;

var scriptedHomeLocation = path.resolve(__dirname, '..');

var sandbox = mappedFs.withBaseDir(path.resolve(__dirname, '../sandbox'));

var github = withPrefix('/github', githubFs.configure(
	JSON.parse(nodefs.readFileSync(__dirname+'/../../secret.json'))
));

var scriptedHome = withPrefix('/scripted.home', readOnly(compose(
	//Needed to load built-in plugins
	withPrefix('/plugins', withBaseDir(scriptedHomeLocation + '/plugins')),
	//Needed to load built-in completions:
	withPrefix('/completions', withBaseDir(scriptedHomeLocation + '/completions')),
	//Needed to provide content assist for plugin APIs:
	withPrefix('/client', withBaseDir(scriptedHomeLocation + '/client'))
)));

//var scriptedHome = withPrefix('/scripted.home',
//	withBaseDir(scriptedHomeLocation)
//);

//All of our files, with the 'slim' node-like fs API:
var corefs = compose(
	sandbox,
	scriptedHome,
	github
);

//Now wrap that to create our 'fat' API that scripted uses throughout its codebase.
var filesystem = scriptedFs.configure(corefs, {
	userHome: '/user.home',
	scriptedHome: '/scripted.home'
});

var server=require('../server/scriptedServer.js').start(filesystem, {
	port: 8123,
	cloudfoundry: true //Enables some customization for the cf deployed scripted 'showroom' app.
});


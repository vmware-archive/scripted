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
//   - remove or fix the 'Play' button.
//   - Customized readme shown when opening on a folder.
//   - A reasonable piece of sample code to pre-populate first-time visitor space.
//   - Ask Scott to vacate domain name 'scripted.cloudfoundry.com' so we can use that.
//   - Disable shutdown hook
//   - auto restart after crash
//   - prefetch sensitive to rate limit remaining

//- (must do) accessible usage stats? We may need the numbers as
//ammunition going forward, we need to know how many users try this out.
// At least number of visitors who try it out - if this is captured in the
// server log, can we access that file?  I don't think we want to track IP
// addresses of visitors (do we?) - but just a count of users creating
//projects would be useful.
//
//- (must do) decide how to handle these things:
//(a) how do we stop
//people putting up stuff they shouldn't? Either copyrighted or offensive
//material. Do we have to care about that? Feels like we might. Do we need
// some kind of disclaimer - like the jsfiddle one.
//(b) how do we check
// the space isn't filled up? Handle rogue users filling it up? Can we
//easily see all the material that is up there?
//
//- (must do) improve the landing page getting started text or even offer alternative text when deployed in this way.
//
//- (must do) decide on exec keys, do we need to shut it off? We can't expose a server to running arbitrary commands.
//
//-
// (must do) links to download pages for scripted, maybe to
//scripted-editor.github.com/scripted with that page getting a little
//overhaul.


// optional

//   - github-fs
//        - login mechanis to obtain oauth token for individual user (optional for 'demo')
//   - upload zip?

var path = require('path');

var nodefs = require('fs');
var mappedFs = require('../server/plugable-fs/mapped-fs');
var scriptedFs = require('../server/plugable-fs/scripted-fs');
var githubFs = require('../server/plugable-fs/github-fs/github-fs');
var compose = require('../server/plugable-fs/composite-fs').compose;
var readOnly = require('../server/plugable-fs/read-only-fs');
var unlistable = require('../server/plugable-fs/unlistable-fs');

var withBaseDir = mappedFs.withBaseDir;
var withPrefix = mappedFs.withPrefix;

var scriptedHomeLocation = path.resolve(__dirname, '..');

var sandbox = unlistable(
	mappedFs.withBaseDir(path.resolve(__dirname, '../sandbox')),
	'/home'
);

var cache = require('./plugable-fs/github-fs/rest-node-manager').configure({
	limit: 2500 // Limits number of in-memory cached nodes.
});
var github = withPrefix('/github', githubFs.configure({
	token: require('./plugable-fs/github-fs/secret').token,
	cache: cache
}));

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
	github,
	sandbox,
	scriptedHome
);

//Now wrap that to create our 'fat' API that scripted uses throughout its codebase.
var filesystem = scriptedFs.configure(corefs, {
	userHome: '/home',
	scriptedHome: '/scripted.home'
});

var server=require('../server/scriptedServer.js').start(filesystem, {
	port: 8123,
	cloudfoundry: true //Enables some customization for the cf deployed scripted 'showroom' app.
});


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
//   - Customized readme shown when opening on a folder (done), but contents
//     is still a bit iffy.

//   - A reasonable piece of sample code to pre-populate first-time visitor space.
//   - Ask Scott to vacate domain name 'scripted.cloudfoundry.com' so we can use that.
//
//
//-
// (must do) links to download pages for scripted, maybe to
//scripted-editor.github.com/scripted with that page getting a little
//overhaul.


// optional

//   - github-fs
//        - login mechanis to obtain oauth token for individual user (optional for 'demo')
//        - prefetch sensitive to rate limit remaining
//   - upload zip?

// DONE
//- disable shutdown hook
//- disable play / stop button
//- (must do) decide on exec keys, do we need to shut it off? We can't expose a server to running arbitrary commands.
//- (must do) decide how to handle these things:
//(a) how do we stop
//people putting up stuff they shouldn't? Either copyrighted or offensive
//material. Do we have to care about that? Feels like we might. Do we need
// some kind of disclaimer - like the jsfiddle one.
//(b) how do we check
// the space isn't filled up? Handle rogue users filling it up? Can we
//easily see all the material that is up there?
//- (must do) accessible usage stats? We may need the numbers as
//ammunition going forward, we need to know how many users try this out.
// At least number of visitors who try it out - if this is captured in the
// server log, can we access that file?  I don't think we want to track IP
// addresses of visitors (do we?) - but just a count of users creating
//projects would be useful.
//   - keybindings: now that filesystem is all read-only, they can't be saved.
//      'fix' disable the keyeditor in CF version


var path = require('path');

var mappedFs = require('../plugable-fs/mapped-fs');
var scriptedFs = require('../plugable-fs/scripted-fs');
var githubFs = require('../plugable-fs/github-fs/github-fs');
var compose = require('../plugable-fs/composite-fs').compose;
var readOnly = require('../plugable-fs/read-only-fs');
//var unlistable = require('../plugable-fs/unlistable-fs');

var withBaseDir = mappedFs.withBaseDir;
var withPrefix = mappedFs.withPrefix;

var scriptedHomeLocation = path.resolve(__dirname, '../..');
console.log('scripted.home = '+scriptedHomeLocation);

var sandbox = readOnly(mappedFs.withBaseDir(path.resolve(scriptedHomeLocation, 'sandbox')));

var cache = require('../plugable-fs/github-fs/rest-node-manager').configure({
	limit: 2500 // Limits number of in-memory cached nodes.
});
var github = withPrefix('/github', githubFs.configure({
	token: require('../plugable-fs/github-fs/secret').token,
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

var server=require('../scriptedServer.js').start(filesystem, {
	port: 8123,
	cloudfoundry: true, //Enables some customization for the cf deployed scripted 'showroom' app.
	applicationManager: false, //Disable the application manager.
	shutdownHook: false, //Disable the 'shutdown hook' used by 'scr -k' and 'scr -r' commands.
	exec: false, //Disable 'exec' related features.
	keyedit: false, //Disable help side-panel's keybdingins editor as it doesn't work well with
					// a shared fs, and won't work at all with a read-only fs.
	help_text: [
"                 _  _  _       _                                      ",
"                | || || |     | |                            _        ",
"                | || || |_____| | ____ ___  ____  _____    _| |_ ___  ",
"                | || || | ___ | |/ ___) _ \\|    \\| ___ |  (_   _) _ \\ ",
"                | || || | ____| ( (__| |_| | | | | ____|    | || |_| |",
"                 \\_____/|_____)\\_)____)___/|_|_|_|_____)     \\__)___/ ",
"",
"                      ______             _                      _ ",
"                     / _____)           (_)       _            | |",
"                    ( (____   ____  ____ _ ____ _| |_ _____  __| |",
"                     \\____ \\ / ___)/ ___) |  _ (_   _) ___ |/ _  |",
"                     _____) | (___| |   | | |_| || |_| ____( (_| |",
"                    (______/ \\____)_|   |_|  __/  \\__)_____)\\____|",
"                                          |_|                     ",
"",
"		  This is a DEMO of the Scripted Editor running on 'cloudfoundry.com'.",
"		  Here you can quickly try out Scripted without any hassles such as",
"		  installing, signing-up, etc.",
"",
"		  Unfortunately, due to practical and legal limitations we",
"		  could only make this 'hassle free' publically hosted DEMO with a",
"		  read-only file system.",
"",
"		  We hope this demo will help you decide if you want to give Scripted",
"		  a 'real' try and install it for a more thorough try-out.",
"",
"		  To find out more visit our GitHub homepage:",
"",
"				'http://github.com/scripted-editor/scripted",
"",
"		  Some basic instructions for getting started with Scripted:",
"",
"		  Use the navigator on the left to select a file for editing.",
"",
"		  Help on all supported key bindings is available by clicking the",
"		  '?' icon in the top right, or simply pressing 'F1'",
"",
"		  To search your project for a file to open by name, press 'Cmd/Ctrl+Shift+F'",
"		  to show the 'Open File' dialog.",
"",
"		  To search for a file based simply on a string within it, press ",
"		  'Cmd/Ctrl+Shift+L' to open the 'Look in files' dialog.",
"",
"		  The 'bars' icon next to the help icon opens the side panel which can",
"		  host a second editor, pressing 'Shift' when opening any link or navigable",
"		  JavaScript reference in Scripted will open the target in the side panel.",
"		  The side panel can also be opened/closed with 'Cmd/Ctrl+Shift+E'."
	]
});


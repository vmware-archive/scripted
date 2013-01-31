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
 * Andy Clement, Jeremy Grelle - initial version
 ******************************************************************************/

// The open function will open a file as specified or the current working
// directory if no file specified.

var path = require('path'),
	childExec = require('child_process').exec,
	url = "http://localhost:7261";

function open(file) {
	var cmd;
    var browser = process.env.SCRIPTED_BROWSER;
    var ismac = false;
		
	switch (process.platform) {
		case 'darwin':
			ismac = true;
			cmd = 'open';
			break;
		case 'win32':
			cmd = 'start ""';
			break;
		default:
			cmd = 'xdg-open';
	}

    if (browser) {
      if (ismac) {
        // Need "open -a <browserapp>"
	  	cmd+=' -a "'+browser+'"';
      } else {
        // TODO proper handling for linux and windows - does this even work?
        cmd=browser;
      }
    }
	
	url += "/editor" + (process.platform == 'win32' ? "/" : "");
	
	if (file && file.length !== 0) {
		url += path.resolve(process.cwd(), file);
	} else {
		url += process.cwd();
	}

	// console.log("Opening %s", url);
	childExec(cmd + ' "' + url.replace(/"/, '\\\"') + '"');
}

module.exports.open = open;

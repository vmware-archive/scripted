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
 * Andy Clement - initial version
 ******************************************************************************/
var path = require('path');
var childExec = require('child_process').exec;

var url = "http://localhost:7261";
var suppressOpen = process.argv[2]=='true';
var file = process.argv[3];
console.dir(process.argv);

function open() {
    var cmd = process.env.SCRIPTED_BROWSER;

    if (!cmd) {
        switch (process.platform) {
            case 'darwin':
                cmd = 'open';
                break;
            case 'win32':
                cmd = 'start ""';
                break;
            default:
                cmd = 'xdg-open';
        }
    }

    url += "/editor" + (process.platform == 'win32' ? "/" : "");


   	console.log(url);
    if (file.length !== 0) {
		console.log(file);
        url += path.resolve(process.cwd(), file);
    } else {
		console.log("opening current dir");
        url += process.cwd();
    }

    console.log("Opening %s with command %s", url,cmd);

    var rc = childExec(cmd + ' "' + url.replace(/"/, '\\\"') + '"');
    console.log(rc);
}

// Launch the server
console.log("launch:Launching server");
var server=require('../server/scripted.js');

// on return, assume it is up and open the browser
if (!suppressOpen) {
    console.log("launch: opening file");
	open();
}
console.log("returning from launch");

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
 *     Andrew Clement - initial API and implementation
 *     Kris De Volder - additional 'servlets' hookup
 ******************************************************************************/
/*global require exports console*/
var static = require('node-static');
var fs = require('fs');
var util = require('util');

if (process.platform.indexOf('win32') !== -1){
	var webroot = __dirname + "\\..\\client";
} else { 
	var webroot = '../client';
}

var file = new(static.Server)(webroot, {
  cache: 600
});

var jsdependPath = '/jsdepend/';
var jsdepend = new(static.Server)('../jsdepend', {
  cache: 600
});

function route(handle, pathname, response, request) {
  //console.log("About to route a request for " + request.url);

  // Check if there is a custom handler - if not then serve it as static content
  if (typeof handle(pathname) === 'function') {
    handle(pathname)(response, request);
  } else {
    if (pathname === '/') {
      // for a '/' reference, give them the editor
      file.serveFile('/editor.html', 200, {'content-type' : 'text/html'}, request, response);
    } else if (pathname === '/helo') {
      // this is the 'aliveness' test url - just returns 'helo'
		response.writeHead(200,{"Content-Type":"text/plain"});
		response.write("helo");
		response.end();
    } else if (pathname.substring(0, jsdependPath.length) === jsdependPath) {
    	console.log('request for URL: '+request.url);
    	var segments = request.url.split('/');
    	segments.splice(1,1);
    	request.url = segments.join('/');
    	console.log('rewritten   URL: '+request.url);
    	console.log('serving as static content from jsdepend');
    	jsdepend.serve(request, response, function (err, result) {
	    	if (err) {
				if (err.errno === process.ENOENT) {
		        	response.writeHead(404, {"Content-Type": "text/html"});
		          	response.write("404 Not found");
		          	response.end();
		        } 
	        	console.error('Error serving %s - %s', request.url, err.message);
	      	} else {
	        	console.log('%s - %s', request.url, response.message);
	      	}
	    });
    } else if (pathname.indexOf("/minimalEditor.html")==0) {
      // likely a trailing bit on the pathname (the file that will be edited) but that piece
      // will be handled by a separate XHR from the client when the editor is ready for content
      file.serveFile('/minimaleditor.html', 200, {'content-type' : 'text/html'}, request, response);
    } else if (pathname.indexOf("/fs_list")==0) {
      // looks like a mucked up request from the dojo filestore
      // e.g. /fs_list//Users/aclement/gits/jseditor/002_nodeserver 
      handle('/fs_list')(response,request,pathname.substr(9));
    } else if (pathname === '/scripts/htmlparser.js') {
    	jsdepend.serveFile("/node_modules/htmlparser/lib/htmlparser.js", 200, {'content-type': 'text/javascript'}, request, response);
    } else {

    //console.log("No request handler found for " + pathname+" so serving static content");
    file.serve(request, response, function(err, result) {
      if (err) {
        console.error('Error serving %s - %s', request.url, err.message);
        if (err.errno === process.ENOENT) {
          response.writeHead(404, {"Content-Type": "text/html"});
          response.write("404 Not found");
          response.end();
        }
      } else {
        console.log('%s - %s', request.url, response.message);
      }
    });
    }
  }
}

exports.route = route;

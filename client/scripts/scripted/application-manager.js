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
 *     Andrew Clement
 *		Jeremy Grelle
 ******************************************************************************/

/**
 * This module interacts with the server to start and stop an 'application' (static file server).
 */
 
define(['rest/interceptor/mime', 'rest', 'scripted/utils/editorUtils','jquery'],
function (mime, rest, editorUtils, $) {
 
	var activeAppPath = null;
	
	var webroot = window.scripted.config && window.scripted.config.application && window.scripted.config.application.webroot;
		
	var startApplication = function() {
		var app_path = window.fsroot;
		if (webroot) {
			app_path = app_path+"/"+webroot;
		}
		var start = rest({ path:"/application/status?path="+app_path+"&suppressOpen=true", method:"PUT" });
		
		start.then(function() {
			// Register as interested in save events so a reload can be fired
			$(document).bind('afterEditorSave',function(event,file) {
				rest({path:"/application/reload?path="+file, method: "POST"});
			});
			activeAppPath = app_path;
			configureForStop(app_path);
		},function(err) {
			activeAppPath = null;
			console.log("Error on serv startup"+err);
		});
	};

	var stopApplication = function() {
		rest({ path:"/application/status", method:"DELETE" }).then(function() {
			$(document).unbind('afterEditorSave');
			configureForStart();
			activeAppPath = null;
		},function(err) {
			console.log("Problem shutting down the server: "+err);
			activeAppPath = null;
		});
	};
	
	function configureForStart() {
		var appcontrol = $('#application_control');
		appcontrol.removeClass('stop');
		appcontrol.addClass('start');
		appcontrol.attr('title',"Start serving on http://localhost:8000 "+(webroot?"(webroot="+webroot+")":""));
		appcontrol.off('click');
		appcontrol.on('click',startApplication);
	}
	
	function configureForStop(path) {
		if (path && path.indexOf(window.fsroot)===0) {
			path = path.substring(window.fsroot.length);
			if (path.length>0 && path.charAt(0)=='/') {
				path = path.substring(1);
			}
		}
		var appcontrol = $('#application_control');
		appcontrol.removeClass('start');
		appcontrol.addClass('stop');
		appcontrol.attr('title',"Stop serving on http://localhost:8000 "+(path?"(webroot="+path+")":""));
		appcontrol.off('click');
		appcontrol.on('click',stopApplication);
	}
	
	var client = mime(); // mime will auto unpack json objects in the response
	
	// Ask the server for status so we know what initial state to
	// set for the application manager UI piece
	var application_status = client({ path:"/application/status", method:"GET" });
	application_status.then(function(response) {
		if (response.entity.status === "not running") {
			configureForStart();
		} else {
			configureForStop(response.entity.path);
		}
	});
		
	return {
		/**
		 * If the server is active this will return the path it is serving.
		 */
		getActiveApplicationPath: function() {
			return activeAppPath;
		}
	};
});
		

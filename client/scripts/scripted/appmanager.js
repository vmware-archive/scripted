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
 *     Andrew Clement
 *		Jeremy Grelle
 ******************************************************************************/

define(['rest','scripted/utils/editorUtils'],
function (client,editorUtils) {
 
	var isrunning;
		
	var launchApplication = function() {
		client({
			path:"/application/status?path="+window.fsroot+"/client",
			method:"PUT"
			});
			$(document).bind('afterEditorSave',function(event,file) {
				console.log("fp="+file);
				client({path:"/application/reload?path="+file, method: "POST"});
			});
//		window.addEventListener("afterEditorSave", function(event) {
//			console.log(JSON.stringify(event));
//			console.log("fp="+event.file);
//			client({path:"/application/reload?path="+event.file, method: "POST"});
//		});

		isrunning=true;
//		window.addEventListener("afterEditorSave", function(event) {
//			console.log(JSON.stringify(event));
//			console.log("fp="+event.file);
//			client({path:"/application/reload?path="+event.file, method: "POST"});
//		});
	};

	$('#run').click(launchApplication);
	
	var stopApplication = function() {
		client({
			path:"/application/status",
			method:"DELETE"
			});
		isrunning=false;
		$(document).unbind('afterEditorSave');
//		editorUtils.getCurrentEditor().removeEventListener("afterSave");
	};

	$('#stop').click(stopApplication);
	
	return {
		isApplicationRunning: function() {
			return isrunning;
		}
	};
});
		

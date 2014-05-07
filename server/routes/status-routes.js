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
 *     Kris De Volder - initial API and implementation
 *     Andy Clement - overhaul
 ******************************************************************************/

exports.install = function (app, options) {

	app.get("/status",function(request, response) {
		response.writeHead(200, {
			"Content-Type": "text/plain"
		});
		response.write("Hello from Scripted!");
		response.write("\n");
		response.end();
	});

	app.del("/status",function(request, response) {
		if (options.shutdownHook) {
			response.writeHead(200, {"Content-Type": "text/plain"});
			response.write("Server will stop shortly");
			response.write("\n");
			response.end();
			console.log("Scripted is exiting...");
			process.exit();
			// this might be better: app.close();
		} else {
			response.status(403);
			response.header('Content-Type', 'text/plain');
			response.write('Scripted server shutdown hook is disabled');
			response.end();
		}
	});
};
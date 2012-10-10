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
 ******************************************************************************/

/*global require*/ 

//
// A Sample 'hello world' servlet. The servlet registers itself at path '/hello' (this assumes someone
// at least requires the servlet. 
//

var servlets = require('../servlets');

function killHandler(response, request) {
  response.writeHead(200, {"Content-Type": "text/plain"});
  response.write("Server will stop shortly");
  response.write("\n");
  response.end();
  throw 'Goobye cruel world!'; // TODO: find a more elegant way to do this.
}

servlets.register('/kill', killHandler);
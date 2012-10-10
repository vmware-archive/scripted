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

/*global exports resolve require define esprima console module*/

//Perform path substitution based on a resolverConf extracted from
//some requirejs configuration block.
function mapPaths(resolverConf, depName) {
	var pathBlock = resolverConf && resolverConf.paths;
	if (pathBlock) {
		//TODO: For now we only support if module names are listed exactly in the
		//path's block. We don't handle nested path blocks or remapping directories
		return pathBlock[depName] || depName;
	} else {
		return depName;
	}
}

exports.mapPaths = mapPaths;
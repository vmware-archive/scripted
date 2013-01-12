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
 *     Andrew Eisenberg
 *     Scott Andrews
 ******************************************************************************/

define(['probes', 'probes/manifold', 'scripted/utils/storage', 'scripted/utils/navHistory'], 
function(probes, manifold, storage, navHistory) {
	probes(storage, 'purgeByTimestamp', 'scripted/utils/storage#purgeByTimestamp');
	probes(navHistory, 'handleNavigationEvent', 'scripted/utils/navHistory#handleNavigationEvent');
	probes(navHistory, 'navigateToURL', 'scripted/utils/navHistory#navigateToURL');
	probes(navHistory, 'openOnRange', 'scripted/utils/navHistory#openOnRange');
	probes(navHistory, 'switchEditors', 'scripted/utils/navHistory#switchEditors');
	probes(navHistory, 'setupPage', 'scripted/utils/navHistory#setupPage');
	probes(navHistory, 'toggleSidePanel', 'scripted/utils/navHistory#toggleSidePanel');
	
	
	// uncomment to see what probes are doing
	// TODO what do we want to do with probes?
//	setInterval(function() {
//		console.log(manifold());
//	}, 10000);
});
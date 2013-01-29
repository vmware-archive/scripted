/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/

/*global define navigator*/
define(function() {

	var userAgent = navigator.userAgent;
	var isIE = parseFloat(userAgent.split("MSIE")[1]) || undefined; //$NON-NLS-0$
	var isFirefox = parseFloat(userAgent.split("Firefox/")[1] || userAgent.split("Minefield/")[1]) || undefined; //$NON-NLS-1$ //$NON-NLS-0$
	var isOpera = userAgent.indexOf("Opera") !== -1; //$NON-NLS-0$
	var isChrome = parseFloat(userAgent.split("Chrome/")[1]) || undefined; //$NON-NLS-0$
	var isSafari = userAgent.indexOf("Safari") !== -1 && !isChrome; //$NON-NLS-0$
	var isWebkit = parseFloat(userAgent.split("WebKit/")[1]) || undefined; //$NON-NLS-0$
	var isAndroid = userAgent.indexOf("Android") !== -1; //$NON-NLS-0$
	var isIPad = userAgent.indexOf("iPad") !== -1; //$NON-NLS-0$
	var isIPhone = userAgent.indexOf("iPhone") !== -1; //$NON-NLS-0$
	var isIOS = isIPad || isIPhone;
	var isMac = navigator.platform.indexOf("Mac") !== -1; //$NON-NLS-0$
	var isWindows = navigator.platform.indexOf("Win") !== -1; //$NON-NLS-0$
	var isLinux = navigator.platform.indexOf("Linux") !== -1; //$NON-NLS-0$
	var platformDelimiter = isWindows ? "\r\n" : "\n"; //$NON-NLS-1$ //$NON-NLS-0$

	function formatMessage(msg) {
		var args = arguments;
		return msg.replace(/\$\{([^\}]+)\}/g, function(str, index) { return args[(index << 0) + 1]; });
	}
	
	var XHTML = "http://www.w3.org/1999/xhtml"; //$NON-NLS-0$
	function createElement(document, tagName) {
		if (document.createElementNS) {
			return document.createElementNS(XHTML, tagName);
		}
		return document.createElement(tagName);
	}

	return {
		formatMessage: formatMessage,
		
		createElement: createElement,
		
		/** Browsers */
		isIE: isIE,
		isFirefox: isFirefox,
		isOpera: isOpera,
		isChrome: isChrome,
		isSafari: isSafari,
		isWebkit: isWebkit,
		isAndroid: isAndroid,
		isIPad: isIPad,
		isIPhone: isIPhone,
		isIOS: isIOS,
		
		/** OSs */
		isMac: isMac,
		isWindows: isWindows,
		isLinux: isLinux,
		
		platformDelimiter: platformDelimiter
	};
});
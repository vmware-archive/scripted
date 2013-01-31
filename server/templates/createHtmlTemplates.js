// This is a script to be run in node.js to generate some of the html content assist templates.  not meant to be run as part of the server.

/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/


var singleLineElements = ["abbr","b","button","canvas","cite","command","dd","del","dfn","dt","em","embed",
			"font","h1","h2","h3","h4","h5","h6","i","ins","kbd","label","li","mark","meter","object","option","output",
			"progress","q","rp","rt","samp","small","strong","sub","sup","td","time","title","tt","u","var"];
			
			
var multiLineElements = ["address","article","aside","audio","bdo","blockquote","body","caption","code",
	"colgroup","datalist","details","div","fieldset","figure","footer","form","head","header",
	"hgroup","iframe","legend","map","menu","nav","noframes","noscript","optgroup","p","pre",
	"ruby","section","select","span","style","tbody","textarea","tfoot","th","thead",
	"tr","video"];


var emptyElements = ["br","hr"];

var emptyElementsWithAttrs = ["area","base","col","input","link","meta","param","keygen","source"];
console.log("\n\t\t// single line elements");
for (var prop in singleLineElements) {
	if (singleLineElements.hasOwnProperty(prop)) {
		var tag = singleLineElements[prop];
		console.log('\t\t{ trigger : "' + tag + '", contents: "<' + tag + '>${1:text}</' + tag + '>$0" },');
	}
}

console.log("\n\t\t// multiline elements");
for (var prop in multiLineElements) {
	if (multiLineElements.hasOwnProperty(prop)) {
		var tag = multiLineElements[prop];
		// TODO find out a way to insert the leading whitespace
		console.log('\t\t{ trigger : "' + tag + '", contents: "<' + tag + '>\\n\\t${1:${selection}}$0\\n</' + tag + '>", isTemplate: true },');
	}
}
console.log("\n\t\t// empty elements");
for (var prop in emptyElements) {
	if (emptyElements.hasOwnProperty(prop)) {
		var tag = emptyElements[prop];
		console.log('\t\t{ trigger : "' + tag + '", contents: "<' + tag + '/>$0" },');
	}
}
console.log("\n\t\t// empty elements with attrs");
for (var prop in emptyElementsWithAttrs) {
	if (emptyElementsWithAttrs.hasOwnProperty(prop)) {
		var tag = emptyElementsWithAttrs[prop];
		console.log('\t\t{ trigger : "' + tag + '", contents: "<' + tag + ' ${1:attrs}/>$0" },');
	}
}
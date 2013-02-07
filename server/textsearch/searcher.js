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
 *     Andy Clement   - initial API and implementation
 *     Kris De Volder
 ******************************************************************************/
/*global exports require console __dirname */

function configure(filesystem) {

	var eachLine = require('../utils/line-by-line').configure(filesystem);

	/**
	 * Search a file for a given term. Every time the term
	 * is found matchFn is called with an object containing
	 * info about the match.
	 *
	 * When processing of the file is completed. The doneFn
	 * is called.
	 */
	function searchFile(term, fullpath, matchFn, doneFn){
		eachLine(fullpath,
			//Called on each line of text
			function (line, lineNumber, lineStart) {
				var result;
				var col = line.indexOf(term);
				var offset = lineStart + col;
				//Use while loop: can be more than one match on a single line
				//Change to an if to only show first match in each line
				while (col >= 0) {
					matchFn({
						file: fullpath,
						offset: offset,
						line: lineNumber+1,
						col: col,
						context: line,
						text: term
					});
					col = line.indexOf(term, col+1);
				}
			},
			//Called when done:
			doneFn
		);
	}

	return searchFile;
}

exports.configure = configure;
/*
var rootdir = require("path").normalize(__dirname+"../../..")+"/";
var term = "readdirSync";
var matches = [];
var startTime = (new Date).getTime();
fs_list(rootdir, 0);
var perf = (new Date).getTime() - startTime;
console.log('time : ' + perf);
matches.forEach(function(item, i){
	console.log(item.file + ': ' + item.pos);
});
*/
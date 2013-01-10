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

var fs = require('fs');
var eachLine = require('../utils/line-by-line').eachLine;

var isBinary = function(buffer){
	for (var i = 0; i < buffer.length; i++){
		var code = buffer.charCodeAt(i);
		if (code === 65533 || code <= 8){
			return true;
		}
	}
	return false;
};

function computeLineSeps(text) {
  var lineseps = [];
  // TODO  doesn't care about \r - maybe it should
  var le = text.indexOf('\n');
  while (le>0) {
    lineseps.push(le);
    le = text.indexOf('\n',le+1);
  }
  return lineseps;
}

/**
 * Split a file into lines and apply a function to each line in the file.
 */
function searchFile(term, fullpath, matchFn, doneFn){
	//console.log("Checking "+fullpath);
	var text;
	try {
		text = fs.readFileSync(fullpath, 'utf-8'); //TODO: make asycn
	} catch (e) {
		//Ensure server doesn't crash when some problem reading the file
		//See https://issuetracker.springsource.com/browse/SCRIPTED-270
		console.log(e);
		return doneFn();
	}
	
	if (isBinary(text)){
		return doneFn();
	}
	
	var lineseps;
	var result;
//	var len = text.length;
	var lineNumber = 0;
	var col = 0;
	var context = "";
	var i = text.indexOf(term);
//	console.log("text is "+text);
	
	while (i >= 0){
//	    console.log("Contains '"+term+"'? "+i);
//		console.log("found "+term+" at "+fullpath);
		// compute line separators if necessary
		if (!lineseps) {
			lineseps = computeLineSeps(text);
			//console.log("lineseps="+lineseps);
		}
		// compute line/col
		lineNumber = 0;
		if (lineseps.length!==0) {
			while (i>lineseps[lineNumber]) {
				lineNumber++;
			}
			lineNumber--;
			if (lineNumber>=0) {
				col = i - lineseps[lineNumber] - 1;
			} else {
				col = i;
			}
			if (lineseps.length>=lineNumber) {
				context = text.substring(lineseps[lineNumber]+1,lineseps[lineNumber+1]);
			} else {
				context = text.substring(lineseps[lineNumber]+1);
			}
		} else {
			col = i;
			context = text;
		}
		
		result = {
			file: fullpath,
			offset:  i, // from the start of the file
			line: lineNumber+1, "col": col, "context":context, // line/col 0 offset
			text: term
		};
		//console.log("result="+JSON.stringify(result));
		matchFn(result);
//		matches.push({
//			file: fullpath,
//			pos: i
//		});
		i = text.indexOf(term, i+1);
	}
	doneFn();
}

exports.searchFile = searchFile;
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
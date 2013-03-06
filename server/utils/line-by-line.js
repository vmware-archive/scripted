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
 *     Kris De Volder   - initial API and implementation
 ******************************************************************************/

//
// line-by-line:
//
// Utility to read a file and apply a function to each line in the file without
// reading the whole file into memory all at once.
//
// We also want to
//   - avoid processing of binary files
//   - avoid processing minified files that are basically just one huge line of text without
//     any linebreaks.

// Because we do not want to read the file multiple times we will compromise:
//   - only scan the first chunk of data recieved from the stream to determine binaryness
//   - accept that if a file has some legitimate 'short' lines of text
//      before hitting a humongous line, then it is acceptable that those initial lines
//      are still sent to the lineFun.

function configure(filesystem) {

	var createReadStream = filesystem.createReadStream;

	var NEWLINE = '\n';  // TODO  doesn't care about \r - maybe it should
	var MAX_LINE_LEN = 10000; //if lines are longer than this, we bail out of trying to read the file
							// we'll assume its something funky like a minified file rather than
							// something people would actually like to read and/or search in.

	var isBinary = function(buffer){
		for (var i = 0; i < buffer.length; i++){
			var code = buffer.charCodeAt(i);
			if (code === 65533 || code <= 8){
				return true;
			}
		}
		return false;
	};

	function eachLine(pathOrStream, lineFun, doneFun) {

		/**
		 * Data we have read so far waiting to be processed.
		 * We keep adding data to this buffer until we find at least one newline...
		 * or MAX_LINE_LEN is exceeded.
		 */
		var buffer = "";
		var bufferOffset = 0; // The offset in the file that corresponds to the beginning
							//of the buffer.
		var started = false;
		var lineNumber = 0;

		var stream;

		/**
		 * Destroy the underlying stream and provide an explanation to the doneFn
		 * about the 'abnormal' termination
		 */
		function destroy(explanation) {
			if (stream) {
				//can only destroy once!
				if (typeof(stream.destroy)==='function') {
					stream.destroy();
				}
				stream = null;
				doneFun(explanation);
			}
		}

		try {
			if (typeof(pathOrStream==='string')) {
				stream = createReadStream(pathOrStream);
			} else {
				//Assume its a stream (or stream-like thing that sends events)
				stream = pathOrStream;
			}
		} catch (e) {
			return doneFun(e);
		}
		stream.on('data', function (data) {
			//console.log('DATA');
			if (!started) {
				started = true;
				if (isBinary(data)) {
					destroy('binary');
				}
			}
			if (stream) {
				var start = 0;
				buffer = buffer + data;
				var newline = buffer.indexOf('\n', start);
				while (newline>=0 && newline-start < MAX_LINE_LEN) {
					//found a valid newline
					var line = buffer.substring(start,newline);
					var lineStart = bufferOffset + start;
					start = newline+1;
					newline = buffer.indexOf('\n', start);
					lineFun(line, lineNumber++, lineStart);
				}
				if (start>0) {
					buffer = buffer.substring(start);
					bufferOffset += start;
				}
				if (buffer.length>MAX_LINE_LEN) {
					destroy('minified');
				}
			}

		});
		stream.on('end', function () {
			if (stream) {
				//console.log('got end!');
				//last data received
				if (buffer) {
					lineFun(buffer, lineNumber++);
				}
				doneFun();
				stream = null;
			}
		});
		stream.on('error', function (err) {
			if (stream) {
				doneFun(err);
				stream = null;
			}
		});
	}

	//Ad hoc testing code below
	// Beware don't leave this code in when actually using this module
	// it takes a rather long time to execute and will 'hang' the scripted
	// server!

	//eachLine(__filename,
	//	function (line, ln) {
	//		console.log(ln + " : " +line);
	//	},
	//	function () {
	//		console.log('!!!!!DONE!!!!!');
	//	}
	//);

	//var testData = "";
	//for (var i = 0; i < 100000; i++) {
	//	testData += 'Hello '+i+'\n'; //Also try without newlines, should end with 'minified' message.
	//}
	//fs.writeFileSync(__dirname+'/test.dat', testData, 'utf8');

	////eachLine('/bin/bash', //Should end with 'binary' message
	//eachLine(__dirname+'/test.dat', // large file, should be processed in chunks!
	//	function (line, ln, ofs) {
	//		console.log(ln + " : " +line);
	//		console.log(ln + " : " +testData.substring(ofs, ofs+15+'...'));
	//	},
	//	function (reason) {
	//		console.log('Done: ' +reason);
	//	}
	//);
	return eachLine;

} //configure

exports.configure = configure;

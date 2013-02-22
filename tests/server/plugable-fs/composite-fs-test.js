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
 *   Kris De Volder
 ******************************************************************************/

var Fs = require('fake-fs');
var compose = require('../../../server/plugable-fs/composite-fs').compose;
var withPrefix = require('../../../server/plugable-fs/mapped-fs').withPrefix;
var mapk = require('../../../server/jsdepend/utils').mapk;
var toCompareString = require('../../../server/jsdepend/utils').toCompareString;
var eachk = require('../../../server/jsdepend/utils').eachk;

/////////////////////////////////////////
// stat
/////////////////////////////////////////

exports.statLeftFsWins = function (test) {

	var fs1 = new Fs();
	fs1.dir('/foo');

	var fs2 = new Fs();
	fs2.file('/foo');

	var cfs = compose(fs1, fs2);
	cfs.stat('/foo', function (err, stats) {
		test.ok(!err);
		test.ok(stats);
		test.equals(true, stats.isDirectory() /*should get stats from fs1, not fs2!*/);
		test.done();
	});
};

exports.statLeftFailsThenUseRight = function (test) {

	var fs1 = new Fs();
//	fs1.dir('foo');

	var fs2 = new Fs();
	fs2.file('/foo');

	var cfs = compose(fs1, fs2);
	cfs.stat('/foo', function (err, stats) {
		test.equals(true, stats.isFile() /*should get stats from fs1 */);
		test.done();
	});
};

exports.statNeitherLeftOrRightHas = function (test) {
	var fs1 = new Fs();
//	fs1.dir('foo');

	var fs2 = new Fs();
//	fs2.file('/foo');

	var cfs = compose(fs1, fs2);
	cfs.stat('/foo', function (err, stats) {
		test.equals('ENOENT', err.code);
		test.done();
	});
};

exports.statCompositeOfThree = function (test) {

	var fs1 = new Fs();
	fs1.file('/foo');

	var fs2 = new Fs();
	fs2.file('/bar');

	var fs3 = new Fs();
	fs3.file('/zor');

	var cfs = compose(fs1, fs2, fs3);

	var names = ['/foo', '/bar', '/zor', '/bogus'];

	mapk(names,
		function (name, k) {
			cfs.stat(name, function (err, stats) {
				k(!err && stats.isFile());
			});
		},
		function (results) {
			test.equals(toCompareString(results), toCompareString([
				true, true, true, false
			]));
			test.done();
		}
	);
};

////////////////////////////////////
// readFile
////////////////////////////////////

//readFile case where rightFs has the file and leftFs has a dir instead
exports.readFileCaseFileDir = function (test) {
	var fs1 = new Fs();
	fs1.file('/foo', 'This is foo on fs1');

	var fs2 = new Fs();
	fs2.dir('/foo');

	var cfs = compose(fs1, fs2);
	cfs.readFile('/foo', 'utf8', function (err, data) {
		test.ok(!err, ""+err);
		if (err && err.stack) {
			console.log(err.stack);
		}
		test.equals('This is foo on fs1', data);
		test.done();
	});
};

//readFile case where rightFs has the file and leftFs also has a file
exports.readFileCaseFileFile = function (test) {
	var fs1 = new Fs();
	fs1.file('/foo', 'This is foo on fs1');

	var fs2 = new Fs();
	fs2.file('/foo', 'foo on fs2 should be ignored');

	var cfs = compose(fs1, fs2);
	cfs.readFile('/foo', 'utf8', function (err, data) {
		test.ok(!err, ""+err);
		test.equals('This is foo on fs1', data);
		test.done();
	});
};

//readFile case where rightFs has the file and leftFs has not
exports.readFileCaseFileNothing = function (test) {
	var fs1 = new Fs();
	fs1.file('/foo', 'This is foo on fs1');

	var fs2 = new Fs();
	//nothing on fs2

	var cfs = compose(fs1, fs2);
	cfs.readFile('/foo', 'utf8', function (err, data) {
		test.ok(!err, ""+err);
		test.equals('This is foo on fs1', data);
		test.done();
	});
};

//readFile case where rightFs has a dir file and leftFs has a file
exports.readFileCaseDirFile = function (test) {
	var fs1 = new Fs();
	fs1.dir('/foo');

	var fs2 = new Fs();
	fs2.file('/foo', 'foo on fs2 should be ignored');

	var cfs = compose(fs1, fs2);
	cfs.readFile('/foo', 'utf8', function (err, data) {
		test.ok(err); //There should be an error
		test.equals('EISDIR', err.code);
		test.ok(!data); //There shouldn't be data
		test.done();
	});
};

//readFile case where rightFs has a dir file and leftFs also has a dir
exports.readFileCaseDirDir = function (test) {
	var fs1 = new Fs();
	fs1.dir('/foo');

	var fs2 = new Fs();
	fs2.dir('/foo');

	var cfs = compose(fs1, fs2);
	cfs.readFile('/foo', 'utf8', function (err, data) {
		test.ok(err); //There should be an error
		test.equals('EISDIR', err.code);
		test.ok(!data); //There shouldn't be data
		test.done();
	});
};

//readFile case where rightFs has a dir file and leftFs has nothing
exports.readFileCaseDirNothing = function (test) {
	var fs1 = new Fs();
	fs1.dir('/foo');

	var fs2 = new Fs();
	//fs2 nothing

	var cfs = compose(fs1, fs2);
	cfs.readFile('/foo', 'utf8', function (err, data) {
		test.ok(err); //There should be an error
		test.equals('EISDIR', err.code);
		test.ok(!data); //There shouldn't be data
		test.done();
	});
};

//readFile case where rightFs has nothing and leftFs has a file
exports.readFileCaseNothingFile = function (test) {
	var fs1 = new Fs();
	// nothing

	var fs2 = new Fs();
	fs2.file('/foo', 'foo on fs2 should be found');

	var cfs = compose(fs1, fs2);
	cfs.readFile('/foo', 'utf8', function (err, data) {
		test.ok(!err, ""+err);
		test.equals('foo on fs2 should be found', data);
		test.done();
	});
};

//readFile case where rightFs has nothing and leftFs has a file
exports.readFileCaseNothingDir = function (test) {
	var fs1 = new Fs();
	// nothing

	var fs2 = new Fs();
	fs2.dir('/foo');

	var cfs = compose(fs1, fs2);
	cfs.readFile('/foo', 'utf8', function (err, data) {
		test.ok(err); //There should be an error
		test.equals('EISDIR', err.code);
		test.ok(!data); //There shouldn't be data
		test.done();
	});
};

//readFile case where rightFs has nothing and leftFs also has nothing
exports.readFileCaseNothingNothing = function (test) {
	var fs1 = new Fs();
	// nothing

	var fs2 = new Fs();
	// nothing

	var cfs = compose(fs1, fs2);
	cfs.readFile('/foo', 'utf8', function (err, data) {
//		console.log(err);
//		if (err && err.stack) {
//			console.log(err.stack);
//		}
		test.ok(err); //There should be an error
		test.equals('ENOENT', err.code);
		test.ok(!data); //There shouldn't be data
		test.done();
	});
};

/////////////////////////////////////////
// writeFile
/////////////////////////////////////////

//writeFile test with three fss that are overlapping emanating from a writable root.
//But each subfs has different directories.
//Try to write to each of the directories. Then check that the data
// ended up in the right file system and not the other ones.
exports.writeFileThreeOverlappingFss = function (test) {

	var names = ['foo', 'bar', 'zor'];
	var fss = names.map(function (name) {
		var fs = new Fs();
		fs.dir('/'+name);
		return fs;
	});
	var cfs = compose.apply(null, fss);

	eachk(names,
		function (name, k) {
			cfs.writeFile('/'+name+'/data.txt', 'Some data for '+name, 'utf8', function (err) {
				test.ok(!err);
				if (err) {
					console.log(err);
					if (err.stack) {
						console.log(err.stack);
					}
				}
				k();
			});
		},
		function () {
			//Get here means we tried to write each file
			// Check that each data ended up in the right sub file system and
			// not the other ones.
			for (var i = 0; i < names.length; i++) {
				var name = names[i];
				var fs = fss[i];
				//console.log('fs '+name+' = ' + JSON.stringify(fs, null, '  '));
				test.equals('Some data for '+name,
					fs.readFileSync('/'+name+'/data.txt', 'utf8')
				);
			}
			test.done();
		}
	);
};

//Similar to the 'three overlapping fss' test but this time the three filesystems
// are remapped with a withPrefix mapping to be totally disjoint from one another.
exports.writeFileThreeDisjointFss = function (test) {

	var names = ['foo', 'bar', 'zor'];
	var fss = names.map(function (name) {
		return new Fs();
	});
	var prefixedFss = [];
	fss.forEach(function (fs, i) {
		prefixedFss[i] = withPrefix('/'+names[i], fs);
	});
	var cfs = compose.apply(null, prefixedFss);

	eachk(names,
		function (name, k) {
			cfs.writeFile('/'+name+'/data.txt', 'Some data for '+name, 'utf8', function (err) {
				test.ok(!err);
				if (err) {
					console.log(err);
					if (err.stack) {
						console.log(err.stack);
					}
				}
				k();
			});
		},
		function () {
			//Get here means we tried to write each file
			// Check that each data ended up in the right sub file system and
			// not the other ones.
			for (var i = 0; i < names.length; i++) {
				var name = names[i];
				var fs = fss[i];
				//console.log('fs '+name+' = ' + JSON.stringify(fs, null, '  '));
				test.equals('Some data for '+name,
					fs.readFileSync('/data.txt', 'utf8')
				);
			}
			test.done();
		}
	);
};

// A test to see whether writing a file only considers subfs's upto the first one
// where the handle exists.
exports.writeOnlyConsidersUptoFirstExist = function (test) {
	var fs1 = new Fs();

	var fs2 = new Fs();
	fs2.dir('/foo/target');
	fs2.dir('/bar');

	var fs3 = new Fs();
	fs3.dir('/foo');

	var cfs = compose(fs1, fs2, fs3);

	cfs.writeFile('/foo/target', 'Some nice text', 'utf8', function (err) {
		//Can't write to fs1: It doesn't have directory '/foo'
		//Can't write to fs2: It already has directory '/foo/target'.
		//Could write to fs3 but shouldn't write: fs2 will shadow the effect.
		test.ok(err); //Should have an error
		test.equals('EISDIR', err.code); //The error from fs2 which is logical since
									     //on the cfs '/foo/target' is directory so
									     //it can't be overwritten by a file.
		//Double check the directory is still there
		cfs.stat('/foo/target', function (err, stats) {
			test.ok(!err);
			test.ok(stats.isDirectory());

			//Double check that fs3 didn't accidentally get the file
			fs3.readFile('/foo/target', function (err) {
				test.ok(err);
				test.equals('ENOENT', err.code);
				test.done();
			});
		});
	});
};

// A test to see whether writing a file only considers subfs's upto the first one
// where the handle exists.
exports.writeOnlyConsidersUptoFirstExist = function (test) {
	var fs1 = new Fs();
	fs1.toString = function () {return 'fs1';};

	var fs2 = new Fs();
	fs2.toString = function () {return 'fs2';};
	fs2.dir('/foo/target');
	fs2.dir('/bar');

	var fs3 = new Fs();
	fs3.dir('/foo');
	fs3.toString = function () {return 'fs3';};

	var cfs = compose(fs1, fs2, fs3);

	cfs.writeFile('/foo/target', 'Some nice text', 'utf8', function (err) {
		//Can't write to fs1: It doesn't have directory '/foo'
		//Can't write to fs2: It already has directory '/foo/target'.
		//Could write to fs3 but shouldn't write: fs2 will shadow the effect.
		test.ok(err); //Should have an error
		//console.log('writeFile /foo/target err = '+err);
		test.equals('EISDIR', err.code); //The error from fs2 which is logical since
									     //on the cfs '/foo/target' is directory so
									     //it can't be overwritten by a file.
		//Double check the directory is still there
		cfs.stat('/foo/target', function (err, stats) {
			test.ok(!err);
			test.ok(stats.isDirectory());

			//Double check that fs3 didn't accidentally get the file
			fs3.readFile('/foo/target', function (err) {
				test.ok(err);
				test.equals('ENOENT', err.code);
				test.done();
			});
		});
	});
};

//Test simplar to the previous one but test a special case where
// It shouldn't be allowed to write an 'earlier' filesystem
// because, althuough it will work, it will have the composited effect
// of 'overwriting' a directory on a later filesystem. Generally,
// this not consistent with normal filesystems where overwiting directories
// with files is not allowed.
exports.writeFileShouldntShadowADirectory = function (test) {
	var fs1 = new Fs();

	var fs2 = new Fs();
	fs2.dir('/bar');

	var fs3 = new Fs();
	fs3.dir('/foo');

	var cfs = compose(fs1, fs2, fs3);

	var targets = ['/bar', '/foo'];

	eachk(targets, function (target, k) {
			cfs.writeFile(target, function (err) {
				//Writing the target file to fs2 would work but shouldn't be allowed
				//because a directory already exists on fs2 or fs3.
				//console.dir(err);
				test.ok(err);
				test.equals('EISDIR', err.code);
			});
			k();
		},
		function () {
			test.done();
		}
	);
};

/////////////////////////////////////////
// readdir
/////////////////////////////////////////

//Test that if a dir just exists on one of the subfss it can be read.
exports.readdirFromMultipleSubFs = function (test) {
	//Set up three fss with differently named subdirs on each
	// each with a slightly different contents in the dir.
	var names = ['foo', 'bar', 'zor'];
	var fss = names.map(function (name) {
		var fs = new Fs();
		fs.toString = function () {
			return name+'-fs';
		};
		fs.dir('/'+name);
		fs.file('/'+name+'/'+name+'.txt', 'Some '+name+'-y text!');
		return fs;
	});
	var cfs = compose.apply(null, fss);

	//Now try to read each dir from the composite fs.
	eachk(names, function (name, k) {
			cfs.readdir('/'+name, function (err, entries) {
//				console.log('readdir /'+name+ ' result received');
//				console.log('   err = '+err);
//				console.log('   entries = '+JSON.stringify(entries));
				test.ok(!err);
				if (err) {
					console.log(err);
					if (err.stack) {
						console.log(err.stack);
					}
				}
				test.equals(toCompareString(entries), toCompareString(
					[name+'.txt']
				));
				k();
			});
		},
		function () {
			//Also try reading a dir that exists on none of the fss
			cfs.readdir('/notexist', function (err, names) {
				test.ok(err);
				if (err) {
					test.equals('ENOENT', err.code);
				}
				test.done();
			});
		}
	);
};

//Test that if a dir is shadowed by a file, it will be treated as a file.
exports.readdirShadowedByAFile = function (test) {
	var fs1 = new Fs();
	fs1.file('/foo', 'Nice foo');

	var fs2 = new Fs();
	fs2.dir('/foo');
	fs2.file('/foo/foo.txt', 'More foo');

	var cfs = compose(fs1, fs2);

	cfs.readdir('/foo', function (err, names) {
		test.ok(err);
		if (err) {
			test.equals('ENOTDIR', err.code);
		}
		test.done();
	});
};

//Test that if a dir exists on several fss then their entries are
//getting merged.
exports.readdirMerged = function (test) {
	//Set up three fss with a 'shared' subdirs on each
	// each with a slightly different contents in the dir.
	var names = ['foo', 'bar', 'zor'];
	var fss = names.map(function (name) {
		var fs = new Fs();
		fs.toString = function () {
			return name + ' -fs';
		};
		fs.dir('/shared');
		fs.file('/shared/'+name+'.txt', 'Some '+name+'-y text!');
		return fs;
	});
	var cfs = compose.apply(null, fss);

	cfs.readdir('/shared', function (err, entries) {
		test.ok(Array.isArray(entries));
		if (Array.isArray(entries)) {
			entries.sort();
			test.equals(toCompareString(entries), toCompareString([
				'bar.txt', 'foo.txt', 'zor.txt'
			]));
		}
		test.done();
	});
};

//Test that dir merging doesn't produce duplicate entries if an entry exists in
//both fss.
exports.readdirMergedDuplicates = function (test) {
	//Set up three fss with a 'shared' subdirs on each
	// each with a slightly different contents in the dir.
	var names = ['foo', 'bar', 'zor'];
	var fss = names.map(function (name) {
		var fs = new Fs();
		fs.dir('/shared');
		fs.file('/shared/'+name+'.txt', 'Some '+name+'-y text!');
		fs.file('/shared/duplicate.txt', 'Do not repeat. I said... "Do not repeat"!');
		return fs;
	});
	var cfs = compose.apply(null, fss);

	cfs.readdir('/shared', function (err, entries) {
		test.ok(Array.isArray(entries));
		if (Array.isArray(entries)) {
			test.equals(4, entries.length); //Don't think sorting removes dups, but just in case.
			entries.sort();
			test.equals(toCompareString(entries), toCompareString([
				'bar.txt', 'duplicate.txt', 'foo.txt', 'zor.txt'
			]));
		}
		test.done();
	});
};

//Test that empty dirs don't crash the readdir merger.
exports.readdirMergedEmpties = function (test) {
	//Set up three fss with a 'shared' subdirs on each
	// each with a slightly different contents in the dir.
	var names = ['foo', 'bar', 'zor'];
	var fss = names.map(function (name) {
		var fs = new Fs();
		fs.dir('/shared');
		//Leave the dir empty
		return fs;
	});
	var cfs = compose.apply(null, fss);

	cfs.readdir('/shared', function (err, entries) {
		test.ok(Array.isArray(entries));
		if (Array.isArray(entries)) {
			test.equals(0, entries.length); //Don't think sorting removes dups, but just in case.
			test.equals(toCompareString(entries), "[]");
		}
		test.done();
	});
};

//Test that shadowed dirs are ignored in the merging process.
exports.readdirMergedShadowed = function (test) {
	var names = ['foo', 'bar', 'shadow', 'zor'];
	var fss = names.map(function (name) {
		var fs = new Fs();
		if (name==='shadow') {
			fs.file('/shared'); //This should shadow out the dir in 'zor' fs
		} else {
			fs.dir('/shared');
			fs.file('/shared/'+name+'.txt', 'Some '+name+'-y text!');
		}
		return fs;
	});
	var cfs = compose.apply(null, fss);

	cfs.readdir('/shared', function (err, entries) {
		test.ok(Array.isArray(entries));
		if (Array.isArray(entries)) {
			entries.sort();
			test.equals(toCompareString(entries), toCompareString([
				'bar.txt',
				'foo.txt'
				//'zor' is blocked by shadow file
			]));
		}
		test.done();
	});
};

////////////////////////////////////////////////
// unlink (aka 'delete file' )
////////////////////////////////////////////////

//Test most basic scenario: a file exists on only one subfs, it unlinks succesfully.
exports.unlinkSingleFile = function (test) {

	//Create three file systems with a DIFFERENT file on each.
	var names = ['foo', 'bar', 'zor'];
	var fss = names.map(function (name) {
		var fs = new Fs();
		fs.dir('/shared');
		fs.file('/shared/'+name+'.txt');
		return fs;
	});
	var cfs = compose.apply(null, fss);

	eachk(names,
		function (name, k) {
			var file = '/shared/'+name+'.txt';
			cfs.unlink(file, function (err) {
				test.ok(!err);
				if (err && err.stack) {
					console.log(err.stack);
				}
				//Is the file is really gone?
				cfs.stat(file, function (err, stat) {
					test.ok(err);
					if (err) {
						test.equals('ENOENT', err.code);
					}
					k();
				});
			});
		},
		function () {
			test.done();
		}
	);
};

//Test that unlink works also when file exists on multiple fss.
// The most logical semantics is to truly remove the file from the cfs.
// So it should be removed from all subsfss.
exports.unlinkMultipleFiles = function (test) {
	//Create three file systems with a the SAME file on each.
	var names = ['foo', 'bar', 'zor'];
	var fss = names.map(function (name) {
		var fs = new Fs();
		fs.dir('/shared');
		fs.file('/shared/delete-me.txt');
		return fs;
	});
	var cfs = compose.apply(null, fss);

	var file = '/shared/delete-me.txt';
	cfs.unlink(file, function (err) {
		test.ok(!err);
		if (err && err.stack) {
			console.log(err.stack);
		}
		//Is the file is really gone?
		cfs.stat(file, function (err, stat) {
			test.ok(err);
			if (err) {
				test.equals('ENOENT', err.code);
			}
			test.done();
		});
	});
};

//Test that unlink works also when file exists on multiple fss.
//Variation on the previous test. Now one the fss doesn't have the file.
exports.unlinkMultipleFiles2 = function (test) {
	//Create three file systems with a the SAME file on each.
	var names = ['foo', 'bar', 'zor'];
	var fss = names.map(function (name) {
		var fs = new Fs();
		fs.dir('/shared');
		if (name!=='bar') {
			fs.file('/shared/delete-me.txt');
		}
		return fs;
	});
	var cfs = compose.apply(null, fss);

	var file = '/shared/delete-me.txt';
	cfs.unlink(file, function (err) {
		test.ok(!err);
		if (err && err.stack) {
			console.log(err.stack);
		}
		//Is the file is really gone?
		cfs.stat(file, function (err, stat) {
			test.ok(err);
			if (err) {
				test.equals('ENOENT', err.code);
			}
			test.done();
		});
	});
};

//Test that trying to delete a file that doesn't exist produces
// expected error.
exports.unlinkNoExist = function (test) {
	//Create three file systems with a the SAME file on each.
	var names = ['foo', 'bar', 'zor'];
	var fss = names.map(function (name) {
		var fs = new Fs();
		fs.dir('/shared');
		fs.file('/shared/delete-me.txt');
		return fs;
	});
	var cfs = compose.apply(null, fss);

	var file = '/shared/bogus.txt';
	cfs.unlink(file, function (err) {
		test.ok(err);
		if (err) {
			//console.log(err);
			test.equals(err.code, 'ENOENT');
		}
		test.done();
	});
};

//Test that trying to 'unlink' a directory produces
// expected error.
exports.unlinkDir = function (test) {
	var names = ['foo', 'bar', 'zor'];
	var fss = names.map(function (name) {
		var fs = new Fs();
		fs.toString = function () {
			return name + '-fs';
		};
		fs.dir('/'+name);
		if (name==='bar') {
			//Add some variation by leaving 'bar' dir empty
		} else {
			fs.file('/'+name+'/filler.txt');
		}
		return fs;
	});
	var cfs = compose.apply(null, fss);

	eachk(names,
		function (name, k) {
			//console.log('unlinking '+name);
			var file = '/'+name;
			cfs.unlink(file, function (err) {
				//console.log('unlinking '+name+' => '+err);
				test.ok(err);
				if (err) {
					test.equals('EISDIR', err.code);
				}
				k();
			});
		},
		function () {
			test.done();
		}
	);
};

//Test corner case: if a file exists on the cfs, but it also exist
//as a 'shadowed' directory on a subfile system then there's no
//way to legally remove it because:
//  a) removing just the file will reveal the directory creating the appearance
//     that the file became a directory.
//  b) deleting the directory is illegal since unlink is only supposed to delete files.
//We model this as a 'permissions problem'.
exports.unlinkFileWithShadowDir = function (test) {
	var fs1 = new Fs();
	fs1.file('/delete-me');

	var fs2 = new Fs();
	fs2.dir('/delete-me'); //Actually can't delete via unlink since its a dir

	var cfs = compose(fs1, fs2);

	cfs.unlink('/delete-me', function (err) {
		test.ok(err);
		if (err) {
			test.equals('EACCES', err.code);
		}
		test.done();
	});
};

/////////////////////////////////////////
// rmdir
/////////////////////////////////////////

//Test most basic scenario: a dir exists on only one subfs, it rmdirs succesfully
//if it is empty.
exports.rmdirSingleDir = function (test) {

	//Create three file systems with a DIFFERENT dir
	//Only one of the dirs is empty.
	var names = ['foo', 'bar', 'zor'];
	var fss = names.map(function (name) {
		var fs = new Fs();
		fs.dir('/'+name);
		if ('bar'===name) {
			//leave dir empty
		} else {
			fs.file('/'+name+'/'+name+'.txt');
		}
		return fs;
	});
	var cfs = compose.apply(null, fss);

	eachk(names,
		function (name, k) {
			var dir = '/'+name;
			cfs.rmdir(dir, function (err) {
				if (name==='bar') { //bar is empty
					//Delete should be ok.
					test.ok(!err);
					if (err && err.stack) {
						console.log(err.stack);
					}
					//Is the dir really gone?
					cfs.stat(dir, function (err, stat) {
						test.ok(err);
						if (err) {
							test.equals('ENOENT', err.code);
						}
						k();
					});
				} else { //not empty dir
					//Shouldn't allow to delete!
					test.ok(err);
					if (err) {
						test.equals(err.code, 'ENOTEMPTY');
					}
					//double check that dir, in fact, was not deleted!
					cfs.stat(dir, function (err, stat) {
						test.ok(!err);
						if (err) {
							console.log(err);
						}
						test.ok(stat);
						if (stat) {
							test.ok(stat.isDirectory());
						}
						k();
					});
				}
			});
		},
		function () {
			test.done();
		}
	);
};

//Test that rmdir works also when dir exists on multiple fss.
//The most logical semantics is to truly remove the dir from the cfs.
//So it should be removed from all subsfss.
//This of course should only be allowed if the dir is empty on
//each subfs.
exports.rmdirMultipleDirs = function (test) {
	var names = ['foo', 'bar', 'zor'];
	var fss = names.map(function (name) {
		var fs = new Fs();
		fs.dir('/empty-dir');
		fs.dir('/not-empty-dir');
		fs.file('/not-empty-dir/'+name+'.txt');
		return fs;
	});
	var cfs = compose.apply(null, fss);

	var targets = ['/not-empty-dir', '/empty-dir'];
	eachk(targets,
		function (target, next) {
			cfs.rmdir(target, function (err) {
				var empty = '/empty-dir' === target;
				if (empty) {
					//Should not get an error
					test.ok(!err);
					if (err && err.stack) {
						console.log(err.stack);
					}
					//Dir should be removed now
					cfs.stat(target, function (err, stat) {
						test.ok(err);
						test.equals('ENOENT', err.code);
						next();
					});
				} else { //Not empty:
					//Should get an error
					test.ok(err);
					if (err) {
						test.equals('ENOTEMPTY', err.code);
					}
					//The dir should NOT be removed!
					cfs.stat(target, function (err, stat) {
						test.ok(!err);
						test.ok(stat.isDirectory());
						next();
					});
				}
			});
		},
		function () {
			test.done();
		}
	);
};

//Test that rmdir works also when file exists on multiple fss.
//Variation on the previous test. Now one the fss doesn't have the dirs.
exports.rmdirMultipleFiles2 = function (test) {
	var names = ['foo', 'bar', 'zor'];
	var fss = names.map(function (name) {
		var fs = new Fs();
		if ('bar'===name) {
			//Leave empty
		} else {
			fs.dir('/empty-dir');
			fs.dir('/not-empty-dir');
			fs.file('/not-empty-dir/'+name+'.txt');
		}
		return fs;
	});
	var cfs = compose.apply(null, fss);

	var targets = ['/not-empty-dir', '/empty-dir'];
	eachk(targets,
		function (target, next) {
			cfs.rmdir(target, function (err) {
				var empty = '/empty-dir' === target;
				if (empty) {
					//Should not get an error
					test.ok(!err);
					if (err && err.stack) {
						console.log(err.stack);
					}
					//Dir should be removed now
					cfs.stat(target, function (err, stat) {
						test.ok(err);
						test.equals('ENOENT', err.code);
						next();
					});
				} else { //Not empty:
					//Should get an error
					test.ok(err);
					if (err) {
						test.equals('ENOTEMPTY', err.code);
					}
					//The dir should NOT be removed!
					cfs.stat(target, function (err, stat) {
						test.ok(!err);
						test.ok(stat.isDirectory());
						next();
					});
				}
			});
		},
		function () {
			test.done();
		}
	);
};

//Test that trying to delete a dir that doesn't exist produces
// expected error.
exports.rmdirNoExist = function (test) {
	//Create three file systems with a the SAME file on each.
	var names = ['foo', 'bar', 'zor'];
	var fss = names.map(function (name) {
		var fs = new Fs();
		fs.dir('/shared');
		fs.file('/shared/delete-me.txt');
		return fs;
	});
	var cfs = compose.apply(null, fss);

	var file = '/bad/bogus';
	cfs.rmdir(file, function (err) {
		test.ok(err);
		if (err) {
			//console.log(err);
			test.equals(err.code, 'ENOENT');
		}
		test.done();
	});
};

//Test that trying to 'rmdir' a file produces
// expected error.
exports.rmdirFile = function (test) {
	var names = ['foo', 'bar', 'zor'];
	var fss = names.map(function (name) {
		var fs = new Fs();
		fs.toString = function () {
			return name + '-fs';
		};
		fs.file('/'+name);
		return fs;
	});
	var cfs = compose.apply(null, fss);

	eachk(names,
		function (name, k) {
			//console.log('rmdiring '+name);
			var file = '/'+name;
			cfs.rmdir(file, function (err) {
				//console.log('rmdiring '+name+' => '+err);
				test.ok(err);
				if (err) {
					test.equals('ENOTDIR', err.code);
				}
				k();
			});
		},
		function () {
			test.done();
		}
	);
};

//Test corner case: if a dir exists on the cfs, but it also exist
//as a 'shadowed' file on a subfile system then there's no
//way to legally remove it because: yada yada (see similar explanation with equivalen case in unlink)
exports.rmdirFileWithShadowDir = function (test) {
	var fs1 = new Fs();
	fs1.dir('/delete-me');

	var fs2 = new Fs();
	fs2.file('/delete-me'); //Actually can't delete via rmdir since its a file

	var cfs = compose(fs1, fs2);

	cfs.rmdir('/delete-me', function (err) {
		test.ok(err);
		if (err) {
			test.equals('EACCES', err.code);
		}
		test.done();
	});
};

/////////////////////////////////////////////////////////////////
// mkdir
/////////////////////////////////////////////////////////////////

//Test most basic case: we can create a directory as a subdir of a directory that
// exists on a single sub-file system.
exports.mkdirSingle = function (test) {
	var names = ['foo', 'bar', 'zor'];
	var fss = names.map(function (name) {
		var fs = new Fs();
		fs.toString = function () {
			return name + '-fs';
		};
		fs.dir('/'+name);
		return fs;
	});
	var cfs = compose.apply(null, fss);

	eachk(names,
		function (name, next) {
			var subdir = '/'+name+'/subdir-of-'+name;
			cfs.mkdir(subdir, function (err) {
				test.ok(!err);
				//The dir should now exist
				cfs.stat(subdir, function (err, stat) {
					test.ok(!err);
					test.ok(stat && stat.isDirectory());
					next();
				});
			});
		},
		function () {
			test.done();
		}
	);

};

//Test creating a directory fails if a file or dir already exists.
exports.mkdirExists = function (test) {
	var names = ['foo', 'bar', 'zor'];
	var fss = names.map(function (name) {
		var fs = new Fs();
		fs.toString = function () {
			return name + '-fs';
		};
		fs.dir('/'+name);
		return fs;
	});
	var cfs = compose.apply(null, fss);

	eachk(names,
		function (name, next) {
			var subdir = '/'+name;
			cfs.mkdir(subdir, function (err) {
				test.ok(err);
				if (err) {
					test.equals('EEXIST', err.code);
				}
				next();
			});
		},
		function () {
			test.done();
		}
	);
};

//Test creating a directory fails if parent not exist
exports.mkdirParentNoExist = function (test) {
	var names = ['foo', 'bar', 'zor'];
	var fss = names.map(function (name) {
		var fs = new Fs();
		fs.toString = function () {
			return name + '-fs';
		};
		fs.dir('/'+name);
		return fs;
	});
	var cfs = compose.apply(null, fss);

	cfs.mkdir('/bogus/subdir', function (err) {
		test.ok(err);
		if (err) {
			test.equals('ENOENT', err.code);
		}
		test.done();
	});
};

//Test creating directory if parent exists on multiple subfs
exports.mkdirMultipleParents = function (test) {
	var names = ['foo', 'bar', 'zor'];
	var fss = names.map(function (name) {
		var fs = new Fs();
		fs.toString = function () {
			return name + '-fs';
		};
		if (name!=='bar') {
			//For some variablity, don't create the dir on one of the fss.
			fs.dir('/shared');
		}
		return fs;
	});
	var cfs = compose.apply(null, fss);

	var subdir = '/shared/subdir';
	cfs.mkdir(subdir, function (err) {
		test.ok(!err);
		if (err) {
			console.log(err);
		}
		cfs.stat(subdir, function (err, stat) {
			test.ok(!err);
			test.ok(stat.isDirectory());
			test.done();
		});
	});
};


//Deselect a bunch of tests
//for (var property in exports) {
//	if (exports.hasOwnProperty(property)) {
//		if (property.indexOf('rmdirMultipleDirs')>=0) {
//		} else {
//			delete exports[property];
//		}
//	}
//}





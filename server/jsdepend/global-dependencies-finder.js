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
 
var when = require('when');
var promises = require('../utils/promises');
var getScriptTags = require('./script-tag-finder').getScriptTags;
var isHtml = require('./html-utils').isHtml;
var deref = require('./utils').deref;
var mapFilter = require('./utils').mapFilter;
var getDirectory = require('./utils').getDirectory;
var pathResolve = require('./utils').pathResolve;

function configure(filesystem) {

	var parentSearch = require('./fswalk').configure(filesystem).parentSearch;
	var getContents = filesystem.getContents;

	function findCoLoadedFiles(handle) {
		return parentSearch(handle, function (htmlFile) {
			//console.log('Visting file: '+htmlFile);
			if (isHtml(htmlFile)) {
				return getContents(htmlFile).then(function (htmlText) {
					var htmlDir = getDirectory(htmlFile);
					var tags = getScriptTags(htmlText);
					//console.log('tags found = '+JSON.stringify(tags, null, '  '));
					var interesting = false;
					var sources = mapFilter(tags, function (tag) {
						var src = deref(tag, ['attribs', 'src']);
						if (src) {
							src = pathResolve(htmlDir, src); //relative path must be interpreted w.r.t. html file.
							//A html file is only interesting if it loads our target js file in one of its script tags.
							interesting = interesting || src === handle;
						}
						return src;
					});
					if (interesting) {
						return when.resolve(sources);
					} else {
						return when.reject(htmlFile + " doesn't load "+handle);
					}
				});
			} else {
				return when.reject('Not a html file: '+htmlFile);
			}
		});
	}

	function findGlobalDependencies(handle) {
		return when(findCoLoadedFiles(handle), function (files) {
			//console.log('coloaded files: '+JSON.stringify(files, null, '  '));
			var graph = {};
			var previousFile = null;
			for (var i = 0; i < files.length && previousFile!==handle; i++) {
				var currentFile = files[i];
				graph[currentFile] = {
					kind: 'global',
					refs: previousFile ? {
							it: {
								kind: 'global',
								path: previousFile
						}
					} : {}
				};
				previousFile = currentFile;
			}
			return when.resolve(graph);
		});
	}
	
	return findGlobalDependencies;
}

exports.configure = configure;
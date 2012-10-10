/*******************************************************************************

 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others 
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors:
 * IBM Corporation - initial API and implementation
 *******************************************************************************/
 
/*global define window document */
/*jslint devel:true*/

define(['require', 'dojo', 'dijit', /*'orion/auth',*/ 'orion/util', 'orion/searchUtils', 'servlets/jsdepend-client',
	'dijit/form/Button', 'dijit/layout/BorderContainer', 'dijit/layout/ContentPane', 'servlets/incremental-file-search-client' ], function(require, dojo, dijit, /*mAuth, */mUtil, mSearchUtils, jsdepend) {

//	var findFileNamesContaining = jsdepend.findFileNamesContaining; 
	var isearch = require('servlets/incremental-file-search-client');

	function removePrefix(str, pre) {
		if (pre) {
			if (str.indexOf(pre)===0) {
				return str.substring(pre.length);
			}
		}
		return str;
	}

	/**
	 * Creates a new search client.
	 * @class Provides API for searching for a text snippet in all files.
	 */
	function FileSearcher() {
	}

	function parseFile(searchresult) {
		//TODO: can we get rid of this crappy 'transform the result into what we expect'
		// function and simply have the searcher itself return objects in the
		// expected format??
	
		var segments = searchresult.file.split('/');
		var name = segments[segments.length-1];
		segments.splice(-1,1);
		var parent = segments.join('/');
		var parseResult = {};
		for (var p in searchresult) {
			if (searchresult.hasOwnProperty(p)) {
				parseResult[p] = searchresult[p];
			}
		}
		parseResult.name = name;
		parseResult.folderName = parent;
		parseResult.directory = parent;
		parseResult.path = searchresult.file;
		return parseResult;
	}

	FileSearcher.prototype = /**@lends orion.searchClient.FileSearcher.prototype*/ {

		/**
		 * Runs a search and displays the results under the given DOM node.
		 * @public
		 * @param {String} query URI of the query to run.
		 * @param {String} [excludeFile] URI of a file to exclude from the result listing.
		 * @param {Function(JSONObject)} Callback function that receives the results of the query.
		 */
		search: function(query, excludeFile, renderer) {
			console.log("fileSearchClient.search(): incoming query is "+query);

			var searchRoot = window.fsroot;

			renderer.start(query);
			var activeSearch = isearch(searchRoot, query, {
				add: function(searchresult) {
					// path will actually be an object:
					// { file: "A/B/C/D.txt", line: NN, col: NN, context: "xxxx" }
					renderer.add(parseFile(searchresult));
				},
				revoke: function (searchresult) {
					renderer.revoke(searchresult);
				},
				update: function (r) {
					renderer.update(parseFile(r));
				},
				done: function() {
					renderer.done();
				}
			});
			return activeSearch;

		},
						
		handleError: function(response, resultsNode) {
			console.error(response);
			var errorText = document.createTextNode(response);
			dojo.place(errorText, resultsNode, "only");
			return response;
		},
		setLocationByMetaData: function(meta, useParentLocation){
			var locationName = "";
			var noneRootMeta = null;
			if(useParentLocation && meta && meta.Parents && meta.Parents.length > 0){
				if(useParentLocation.index === "last"){
					noneRootMeta = meta.Parents[meta.Parents.length-1];
				} else {
					noneRootMeta = meta.Parents[0];
				}
			} else if(meta &&  meta.Directory && meta.Location && meta.Parents){
				noneRootMeta = meta;
			} 
			if(noneRootMeta){
				this.setLocationByURL(noneRootMeta.Location);
				locationName = noneRootMeta.Name;
			} else if(meta){
				locationName = this._fileService.fileServiceName(meta && meta.Location);
			}
			var searchInputDom = dojo.byId("search");
			if(!locationName){
				locationName = "";
			}
			if(searchInputDom && searchInputDom.placeholder){
				searchInputDom.value = "";
				if(locationName.length > 23){
					searchInputDom.placeholder = "Search " + locationName.substring(0, 20) + "...";
				} else {
					searchInputDom.placeholder = "Search " + locationName;
				}
			}
			if(searchInputDom && searchInputDom.title){
				searchInputDom.title = "Type a keyword or wild card to search in " + locationName;
			}
		},
		setLocationByURL: function(locationURL){
			this.location = locationURL;
		},
		/**
		 * Returns a query URL for a search.
		 * @param {String} searchLocation The base location of the search service
		 * @param {String} query The text to search for, or null when searching purely on file name
		 * @param {String} [nameQuery] The name of a file to search for
		 * @param {String} [sort] The field to sort search results on. By default results will sort by path
		 * @param {Boolean} [skipLocation] If true, do not use the location property of the searcher. Use "" as the location instead.
		 */
		createSearchQuery: function(query, nameQuery, sort, skipLocation)  {
			if (!sort) {
				sort = "Path";
			}
			sort += " asc";//ascending sort order
			if (nameQuery) {
				//assume implicit trailing wildcard if there isn't one already
				var wildcard= (/\*$/.test(nameQuery) ? "" : "*");
				return  mSearchUtils.generateSearchQuery({sort: sort,
					rows: 100,
					start: 0,
					searchStr: "Name:" + this._luceneEscape(nameQuery, true) + wildcard});
			}
			return mSearchUtils.generateSearchQuery({sort: sort,
				rows: 40,
				start: 0,
				searchStr: this._luceneEscape(query, true),
				location: skipLocation ? "": this.location});
		},
		/**
		 * Escapes all characters in the string that require escaping in Lucene queries.
		 * See http://lucene.apache.org/java/2_4_0/queryparsersyntax.html#Escaping%20Special%20Characters
		 * The following characters need to be escaped in lucene queries: + - && || ! ( ) { } [ ] ^ " ~ * ? : \
		 * @param {Boolean} [omitWildcards=false] If true, the * and ? characters will not be escaped.
		 * @private
		 */
		_luceneEscape: function(input, omitWildcards) {
			var output = "",
			    specialChars = "+-&|!(){}[]^\"~:\\" + (!omitWildcards ? "*?" : "");
			for (var i = 0; i < input.length; i++) {
				var c = input.charAt(i);
				if (specialChars.indexOf(c) >= 0) {
					output += '\\';
				}
				output += c;
			}
			return output;
		},

		//default search renderer until we factor this out completely
		defaultRenderer: {
		
			/**
			 * Create an 'incremental' renderer to display search results.
			 * The incremental renderer is capable of displaying search results as they arrive rather than just 
			 * all at once.
			 */
			makeIncrementalRenderer: function (resultsNode, heading, onResultReady, decorator, changeFile, editor) {

				var foundValidHit = false;
				var queryName = null;
				var table = null;
			
				//Helper function to append a path String to the end of a search result dom node 
				var appendPath = (function() { 
					//Map to track the names we have already seen. If the name is a key in the map, it means
					//we have seen it already. Optionally, the value associated to the key may be a function' 
					//containing some deferred work we need to do if we see the same name again.
					var namesSeenMap = {};
					
					function doAppend(domElement, resource) {
						var path = resource.folderName ? resource.folderName : resource.path;
						path = removePrefix(path, window.fsroot);
						domElement.appendChild(document.createTextNode(' - ' + path + ' '));
					}
					
					function appendPath(domElement, resource) {
						var name = resource.name;
						if (namesSeenMap.hasOwnProperty(name)) {
							//Seen the name before
							doAppend(domElement, resource);
							var deferred = namesSeenMap[name];
							if (typeof(deferred)==='function') {
								//We have seen the name before, but prior element left some deferred processing
								namesSeenMap[name] = null;
								deferred();
							}
						} else {
							//Not seen before, so, if we see it again in future we must append the path
							namesSeenMap[name] = function() { doAppend(domElement, resource); };
						}
					}
					return appendPath;
				}()); //End of appendPath function
				
				function populateRow(row, resource) {

					// Attach all the result data, usefull for handling navigation etc.
					row.resultData = resource; 

					dojo.style(row,"width","780px");
					dojo.style(row,"max-width","780px");
					// Column: context for the match						
					var col = row.insertCell(0);
//					dojo.style(col,"width","780px");
//					dojo.style(col,"white-space","nowrap");
					dojo.style(col,"font-family","monospace");
					var textnode = document.createTextNode(resource.context);
					
					
					// lets try and create some sexy stuff
					var beforeText = resource.context.substring(0,resource.col);
					var afterText = resource.context.substring(resource.col+resource.text.length);
					var maxWidthForMatch = 64;
					if ((beforeText.length+resource.text.length+afterText.length) > maxWidthForMatch) {
					  // need to trim leading and trailing text
					  var trimLevel = (maxWidthForMatch - resource.text.length)/2;
					  // TODO what to do if search term is too long!
					  if (trimLevel>0) {
					    if (beforeText.length>trimLevel) {
							beforeText = beforeText.substring(beforeText.length-trimLevel);
					    }
					    if (afterText.length>trimLevel) {
							afterText = afterText.substring(0, trimLevel);
					    }
					  }
					  
					}
					textnode = document.createTextNode(beforeText);
					col.appendChild(textnode);
					textnode = document.createElement("span");
					textnode.innerHTML=resource.text;
					dojo.style(textnode,"background","yellow");
					col.appendChild(textnode);
					textnode = document.createTextNode(afterText);
					
					col.appendChild(textnode);
					
					// should trim it down around the match if it is too long
					col.appendChild(textnode);
					
					// Building a row, input data is:
						//							'name':name,
						//							'path':searchresult.file,
						//							'folderName':parent,
						//							'directory':parent,
						//							'line':searchresult.pos,
						//							'col':searchresult.col,
						//							'context':searchresult.context
					

					col = row.insertCell(1);
					dojo.style(col,"white-space","nowrap");
					col.colspan = 2;
					var resourceLink = document.createElement('a');
					dojo.place(document.createTextNode(resource.name), resourceLink);
					if (resource.LineNumber) { // FIXME LineNumber === 0 
						dojo.place(document.createTextNode(' (Line ' + resource.LineNumber + ')'), resourceLink);
					}
					var loc = resource.location;
					if (resource.isExternalResource) {
						// should open link in new tab, but for now, follow the behavior of navoutliner.js
						loc = resource.path;
					} else {
						//loc = "http://localhost:8888/editor.html?"+resource.path;
						loc = window.location.protocol + "//" + window.location.host + window.location.pathname + '?' + resource.path;								
					}

					resourceLink.setAttribute('href', loc);

					dojo.style(resourceLink, "verticalAlign", "middle");

					col.appendChild(resourceLink);
					appendPath(col, resource);
					decorator(row, resource);
				}
		
				var results = {
					//maps paths to dom elements showing them on screen. If a result is revoked this allows us to 
					//easily find and destroy it.
				};
		
				return {
					start: function (qry) {
						queryName = qry;
					},
					revoke: function (id) {
						var existing = results[id];
						if (existing) {
							delete results[id];
							dojo.destroy(existing);
						}
					},
					update: function (resource) {
						var existing = results[resource.id];
						if (existing) {
							dojo.empty(existing);
							populateRow(existing, resource);
						}
					},
					add: function (resource) {
						//console.log("renderer: adding result "+resource);
						if (!foundValidHit) {
							//This must be the first one!
							foundValidHit = true;
							dojo.empty(resultsNode);
							table = document.createElement('table');
							dojo.style(table,"white-space","nowrap");
							
							dojo.place(table, resultsNode, "last");
						}
					
						if (!foundValidHit) {
							foundValidHit = true;
//							if (heading) {
//								var headingRow = table.insertRow(0);
//								col = headingRow.insertCell(0);
//								col.innerHTML = heading;
//							}
						}
						var row = table.insertRow(-1);
						results[resource.id] = row;

						populateRow(row, resource);
						
					},
					done: function () {
						if (!foundValidHit) {
							// only display no matches found if we have a proper name
							if (queryName) {
								var div = dojo.place("<div>No matches found for </div>", resultsNode, "only");
								var b = dojo.create("b", null, div, "last");
								dojo.place(document.createTextNode(queryName), b, "only");
								if (typeof(onResultReady) === "function") {
									onResultReady(resultsNode);
								}
							}
						}
					} 
				};
			}
		
		}//end defaultRenderer
	};
	FileSearcher.prototype.constructor = FileSearcher;
	//return module exports
	return {FileSearcher:FileSearcher};
});
